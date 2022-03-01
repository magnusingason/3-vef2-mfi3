import faker from 'faker';
import { query, end } from './db.js';

const schemaFile = '../sql/schema.sql';


function createFakeUser(n){
  const fake = [];

  while(fake.length < n){
    fake.push({
      username: faker.name.findName(),
      password: Math.random() < 0.5 ? '' : faker.lorem.sentence()
    })
  }

  return fake;
}

async function create() {
  const data = await promises.readFile(schemaFile);

  await query(data.toString('utf-8'));

  const fakes = createFakeData(500);

  for (let i = 0; i < fakes.length; i += 1) {
    const fake = fakes[i];

    try {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `
          INSERT INTO
            users (username, password)
          VALUES
            ($1, $2)`,
        [fake.username, fake.password],
      );
    } catch (e) {
      console.error('Error inserting', e);
      return;
    }
  }

  await end();

  console.info('Schema & fake data created');
}

create().catch((err) => {
  console.error('Error creating running setup', err);
});
