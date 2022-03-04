import express from 'express';
import { validationResult } from 'express-validator';
import { requireAuthentication } from '../app.js';
import {
  createEvent,
  listEvent,
  listEventByName,
  listEvents,
  listUsers,
  updateEvent
} from '../lib/db.js';
import { slugify } from '../lib/slugify.js';
import { createUser, findById } from '../lib/users.js';

export const usersRouter = express.Router();

async function index(req, res) {
  const events = await listEvents();
  const { user: { username } = {} } = req || {};

  return res.render('admin', {
    username,
    events,
    errors: [],
    data: {},
    title: 'Viðburðir — umsjón',
    users: true,
  });
}

function login(req, res) {


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
      users: true,
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
      users: true,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { name, description } = req.body;
  const slug = slugify(name);

  const created = await createEvent({ name, slug, description });

  if (created) {
    return res.redirect('/users');
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
    return res.redirect('/users');
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



usersRouter.get('/', requireAuthentication, async (req, res) => {
  const { admin } = req.user;
  if (admin) {
    const users = await listUsers();
    return res.status(200).json({ users });
  }
  res.status(401).json({ admin });

});


usersRouter.get('/login', login);


usersRouter.get('/logout', (req, res) => {
  // logout hendir session cookie og session
  req.logout();
  res.redirect('/');
});

usersRouter.post('/register', async function (req, res, next) {
  const { username, name, password = '' } = req.body;

  const result = await createUser(username, password, name, false);
  delete result.password;

  return res.status(201).json(result);
});

usersRouter.get('/me', requireAuthentication, async (req, res) => {
  const { id } = req.user;
  const user = await findById(id);
  return res.status(200).json({ user });

});

usersRouter.get('/:id', requireAuthentication, async (req, res) => {
  const { admin } = req.user;
  const { id } = req.params;
  console.log(admin);
  if (admin) {
    const user = await findById(id);
    return res.status(200).json({ user });
  }
  return res.status(401).json({ admin });

});

