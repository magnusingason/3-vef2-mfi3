import { readFile } from 'fs/promises';
import pg from 'pg';

const SCHEMA_FILE = './sql/schema.sql';
const DROP_SCHEMA_FILE = './sql/drop.sql';

const { DATABASE_URL: connectionString, NODE_ENV: nodeEnv } =
  process.env;

if (!connectionString) {
  console.error('vantar DATABASE_URL í .env');
  process.exit(-1);
}

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development
// mode, á heroku, ekki á local vél
const ssl = nodeEnv === 'production' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(q, values = []) {
  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    console.error('unable to get client from pool', e);
    return null;
  }

  try {
    const result = await client.query(q, values);
    return result;
  } catch (e) {
    if (nodeEnv !== 'test') {
      console.error('unable to query', e);
    }
    return null;
  } finally {
    client.release();
  }
}

export async function createSchema(schemaFile = SCHEMA_FILE) {
  const data = await readFile(schemaFile);

  return query(data.toString('utf-8'));
}

export async function dropSchema(dropFile = DROP_SCHEMA_FILE) {
  const data = await readFile(dropFile);

  return query(data.toString('utf-8'));
}

export async function insertEvent({
  name, description
} = {}){
  let success = true;

  let slug = name;

  const q = `
  INSERT INTO events
    (name, slug, description)
  VALUES
    ($1, $2, $3);
`;
const values = [name, slug, description];

try {
  await query(q, values);
} catch (e) {
  console.error('Error inserting event', e);
  success = false;
}

return success;
}

export async function insertSignup({
  name, comment, event
} = {}){
  let success = true;

  const q = `
  INSERT INTO signup
    (name, comment, event)
  VALUES
    ($1, $2, $3);
`;
const values = [name, comment, event];

try {
  await query(q, values);
} catch (e) {
  console.error('Error inserting event', e);
  success = false;
}

return success;
}



export async function end() {
  await pool.end();
}

export async function total(search) {
  let searchPart = '';
  if (search) {
    searchPart = `
      WHERE
      to_tsvector('english', name) @@ plainto_tsquery('english', $3)
      OR
      to_tsvector('english', comment) @@ plainto_tsquery('english', $3)
    `;
  }

  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM events ${searchPart}`,
      search ? [search] : [],
    );
    return (result.rows && result.rows[0] && result.rows[0].count) || 0;
  } catch (e) {
    console.error('Error counting signatures', e);
  }

  return 0;
}


export async function list(offset = 0, limit = 10, search = '') {
  const values = [offset, limit];

  let searchPart = '';
  if (search) {
    searchPart = `
      WHERE
      to_tsvector('english', name) @@ plainto_tsquery('english', $3)
      OR
      to_tsvector('english', comment) @@ plainto_tsquery('english', $3)
    `;
    values.push(search);
  }

  let result = [];

  try {
    const q = `
      SELECT
        id, name, slug, description, created
      FROM
        events
      ${searchPart}
      OFFSET $1 LIMIT $2
    `;

    const queryResult = await query(q, values);

    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error selecting events', e);
  }

  return result;
}

export async function signupList(offset = 0, limit = 10, search = '') {
  const values = [offset, limit];

  let searchPart = '';
  if (search) {
    searchPart = `
      WHERE
      (to_tsvector('english', name) @@ plainto_tsquery('english', $3)
      OR
      to_tsvector('english', comment) @@ plainto_tsquery('english', $3)))
    `;
    values.push(search);
  }

  let result = [];

  try {
    const q = `
      SELECT
        id, name, comment, created, event
      FROM
        signup
      ${searchPart}
      OFFSET $1 LIMIT $2
    `;

    const queryResult = await query(q, values);

    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error selecting events', e);
  }

  return result;
}

export async function updateRow({
  name, description, id
} = {}) {
  let result = [];
  try {
    const queryResult = await query(
      'UPDATE events SET name = $1, description = $2 WHERE id = $3',
      [name,description,id]
    );

    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error updating row', e);
  }

  return result;
}

/* TODO útfæra aðgeðir á móti gagnagrunni */
