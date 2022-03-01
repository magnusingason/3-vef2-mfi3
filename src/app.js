import dotenv from 'dotenv';
import express from 'express';
import { dirname, join } from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { insertEvent } from './lib/db.js';
//import { isInvalid } from './lib/template-helpers.js';
import { indexRouter } from './routes/index-routes.js';
import { adminRouter} from './routes/admin.js';
import  passport  from './routes/login.js';

dotenv.config();

const { PORT: port = 3003,  SESSION_SECRET: sessionSecret = 'awojkdpoaw',  DATABASE_URL: connectionString,} = process.env;

const app = express();
/*
if (!connectionString || !sessionSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}
*/

// Sér um að req.body innihaldi gögn úr formi
app.use(express.urlencoded({ extended: true }));

const path = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(path, '../public')));
app.set('views', join(path, '../views'));
app.set('view engine', 'ejs');


function isInvalid(field, errors = []) {
  // Boolean skilar `true` ef gildi er truthy (eitthvað fannst)
  // eða `false` ef gildi er falsy (ekkert fannst: null)
  return Boolean(errors.find((i) => i && i.param === field));
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  maxAge: 20 * 1000, // 20 sek
}));


app.locals.isInvalid = isInvalid;

app.use(passport.initialize());
app.use(passport.session());

app.locals.formatDate = (str) => {
  let date = '';

  try {
    date = format(str || '', 'dd.MM.yyyy');
  } catch {
    return '';
  }

  return date;
};

/*
app.locals = {
  // TODO hjálparföll fyrir template
};
*/
  
app.use('/', indexRouter);
// TODO admin routes

app.use('/admin', adminRouter);

/** Middleware sem sér um 404 villur. */
app.use((req, res) => {
  const title = 'Síða fannst ekki';
  res.status(404).render('error', { title });
});

/** Middleware sem sér um villumeðhöndlun. */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const title = 'Villa kom upp';
  res.status(500).render('error', { title });
});

app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});

