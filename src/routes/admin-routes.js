import express from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEvent,
  listEvent,
  listEventByName,
  listEvents,
  updateEvent
} from '../lib/db.js';
import { requireAuthentication } from '../lib/login.js';
import { slugify } from '../lib/slugify.js';
import { comparePasswords } from '../lib/users.js';
import {
  registrationValidationMiddleware,
  sanitizationMiddleware,
  xssSanitizationMiddleware
} from '../lib/validation.js';

export const adminRouter = express.Router();

async function index(req, res) {
  const events = await listEvents();
  const { user: { username } = {} } = req || {};

  return res.render('admin', {
    username,
    events,
    errors: [],
    data: {},
    title: 'Viðburðir — umsjón',
    admin: true,
  });
}

function login(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }

  let message = '';


  return res.render('login', { message, title: 'Innskráning' });
}

async function validationCheck(req, res, next) {
  const { name, description } = req.body;

  const events = await listEvents();
  const { user: { username } = {} } = req;

  const data = {
    name,
    description,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('admin', {
      events,
      username,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      admin: true,
    });
  }

  return next();
}

async function validationCheckUpdate(req, res, next) {
  const { name, description } = req.body;
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent(slug);

  const data = {
    name,
    description,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null && eventNameExists.id !== event.id) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('admin-event', {
      username,
      event,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      admin: true,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { name, description } = req.body;
  const slug = slugify(name);

  const created = await createEvent({ name, slug, description });

  if (created) {
    return res.redirect('/admin');
  }

  return res.render('error');
}

async function updateRoute(req, res) {
  const { name, description } = req.body;
  const { slug } = req.params;

  const event = await listEvent(slug);

  const newSlug = slugify(name);

  const updated = await updateEvent(event.id, {
    name,
    slug: newSlug,
    description,
  });

  if (updated) {
    return res.redirect('/admin');
  }

  return res.render('error');
}

async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent(slug);

  if (!event) {
    return next();
  }

  return res.render('admin-event', {
    username,
    title: `${event.name} — Viðburðir — umsjón`,
    event,
    errors: [],
    data: { name: event.name, description: event.description },
  });
}

adminRouter.get('/', requireAuthentication, catchErrors(index));
adminRouter.post(
  '/',
  requireAuthentication,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheck),
  sanitizationMiddleware('description'),
  catchErrors(registerRoute)
);

adminRouter.get('/login', login);
adminRouter.post(
  '/login', async (req, res) => {

    const { username, password = '' } = req.body;

    const user = await findByUsername(username);

    if (!user) {
      return res.status(401).json({ error: 'No such user' });
    }

    const passwordIsCorrect = await comparePasswords(password, user.password);

    // Ef við komumst hingað var notandi skráður inn, senda á /admin
    if (passwordIsCorrect) {
      const payload = { id: user.id };
      const tokenOptions = { expiresIn: tokenLifetime };
      const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
      return res.redirect('/admin');
    }

    return res.status(401).json({ errorL: 'invalid password' });

  }
);

adminRouter.get('/logout', (req, res) => {
  // logout hendir session cookie og session
  req.logout();
  res.redirect('/');
});

// Verður að vera seinast svo það taki ekki yfir önnur route
adminRouter.get('/:slug', requireAuthentication, catchErrors(eventRoute));
adminRouter.post(
  '/:slug',
  requireAuthentication,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheckUpdate),
  sanitizationMiddleware('description'),
  catchErrors(updateRoute)
);
