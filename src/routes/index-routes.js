import express from 'express';
import { catchErrors } from '../lib/catch-errors.js';
import { insertEvent, list, total, signupList } from '../lib/db.js';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import { insertSignup } from '../lib/db.js';


export const indexRouter = express.Router();

export const PAGE_SIZE = 50;

async function indexRoute(req, res) {

  let {page = 1} = req.query;
  page = setPagenumber(page); 

  const errors = [];
  const formData = {
    name: '',
    description: '',
  };

  const offset = (page - 1) * PAGE_SIZE;

  const events = await list(offset, PAGE_SIZE);

  const totalevents = await total();

  const paging = await pagingInfo(
    {
      page, offset, totalevents, eventsLength: events.length,
    },
  );

  res.render('index', {
    title: 'Events',
    errors,
    formData,
    events,
    paging,
    admin: false,
  });
}

async function signupRoute(req, res) {

  let {page = 1} = req.query;
  page = setPagenumber(page); 

  const errors = [];
  const formData = {
    name: '',
    comment: '',
  };

  let eventid = req.params.id;

  const offset = (page - 1) * PAGE_SIZE;

  const signup = await signupList(offset,PAGE_SIZE);

  const filterByeventsID = (data, eventsID) => data.filter(d => d.event == eventsID)
  let signups = filterByeventsID(signup, eventid);

  const paging = await pagingInfo(
    {
      page, offset,
    },
  );

  res.render('event', {
    title: 'Events',
    errors,
    formData,
    eventid,
    signups,
    paging,
    admin: false,
  });
}

async function register(req, res) {
  const {
    name, description,
  } = req.body;

  let success = true;

  try {
    success = await insertEvent({
      name, description
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/');
  }

  return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
}

async function signup(req, res) {
  const {
    name, comment,
  } = req.body;

  let success = true;
  const eventsID = req.params.id;
  const event = eventsID;

  try {
    success = await insertSignup({
      name, comment, event
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/event/'+eventsID);
  }

  return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
}

const validationMiddleware = [
  body('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('comment')
    .isLength({ max: 250 })
    .withMessage('Athugasemd má að hámarki vera 250 stafir'),
];

const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('description').customSanitizer((v) => xss(v)),
];

const sanitizationMiddleware = [
  body('name').trim().escape(),
];

async function validationCheck(req, res, next) {
  const {
    name, description
  } = req.body;

  const formData = {
    name, description,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('index', { formData, errors: validation.errors, registrations });
  }

  return next();
}


indexRouter.get('/', catchErrors(indexRoute));

indexRouter.get('/event/:id', catchErrors(signupRoute));

// TODO útfæra öll routes

indexRouter.post(
  '/',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(register),
);

indexRouter.post(
  '/event/:id',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(signup),
)

export async function pagingInfo({
  page, offset, totalRegistrations, registrationsLength, baseUrl = '',
} = {}) {
  return {
    page,
    total: totalRegistrations,
    totalPages: Math.ceil(totalRegistrations / PAGE_SIZE),
    first: offset === 0,
    last: registrationsLength < PAGE_SIZE,
    hasPrev: offset > 0,
    hasNext: registrationsLength === PAGE_SIZE,
    prevUrl: `${baseUrl}/?page=${page - 1}`,
    nextUrl: `${baseUrl}/?page=${page + 1}`,
  };
}

export function setPagenumber(page) {
  const num = Number(page);

  if (Number.isNaN(num) || !Number.isInteger(num) || num < 1) {
    return 1;
  }

  return num;
}