import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import passport from './lib/login.js';
import { isInvalid } from './lib/template-helpers.js';
import { comparePasswords, findById, findByUsername } from './lib/users.js';
import { indexRouter } from './routes/index-routes.js';
import { usersRouter } from './routes/users-routes.js';

dotenv.config();

export const {
  PORT: port = 3005,
  JWT_SECRET: jwtSecret,
  TOKEN_LIFETIME: tokenLifetime = 900,
  DATABASE_URL: connectionString,
} = process.env;

if (!connectionString || !jwtSecret) {
  console.error('Vantar gögn í env');
  process.exit(1);
}

const app = express();

// Sér um að req.body innihaldi gögn úr formi
app.use(express.json());

export const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
}


const path = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(path, '../public')));
app.set('views', join(path, '../views'));
app.set('view engine', 'ejs');

async function strat(data, next) {
  // fáum id gegnum data sem geymt er í token
  const user = await findById(data.id);

  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


passport.use(new Strategy(jwtOptions, strat));

app.use(passport.initialize());

app.locals = {
  isInvalid,
};

console.log("ok");

app.post('/users/login', async (req, res) => {
  const { username, password = '' } = req.body;

  const user = await findByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'No such user' });
  }

  const passwordIsCorrect = await comparePasswords(password, user.password);

  if (passwordIsCorrect) {
    const payload = { id: user.id };
    const tokenOptions = { expiresIn: tokenLifetime };
    const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
    return res.json({ user, token, expiresIn: tokenOptions.expiresIn, });
  }

  return res.status(401).json({ error: 'Invalid password' });
});

export function addUserIfAuthenticated(req, res, next) {
  return passport.authenticate(
    'jwt',
    { session: false },
    (err, user) => {
      if (err) {
        return next(err);
      }

      if (user) {
        req.user = user;
      }

      return next();
    },
  )(req, res, next);
}

app.use('/users', usersRouter);
app.use('/', indexRouter);

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

function notFoundHandler(req, res, next) { // eslint-disable-line
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid json' });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

app.use(notFoundHandler);
app.use(errorHandler);

export function requireAuthentication(req, res, next) {
  return passport.authenticate(
    'jwt',
    { session: false },
    (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const error = info.name === 'TokenExpiredError'
          ? 'expired token' : 'invalid token';

        return res.status(401).json({ error });
      }

      // Látum notanda vera aðgengilegan í rest af middlewares
      req.user = user;
      return next();
    },
  )(req, res, next);
}
/*
app.post('/users/register', function (req, res, next) {
  const saltHash = utils.genPassword(req.body.password);

  const salt = saltHash.salt;
  const hash = saltHash.hash;

  const newUser = new User({
    username: req.body.username,
    hash: hash,
    salt: salt
  });

  newUser.save()
    .then((user) => {
      res.json({ sucess: true, user: user });
    }).catch(err => next(err));

});
*/

app.listen(port, () => {
  console.info(`Server running at http://localhost:${port}/`);
});
