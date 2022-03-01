import express, { Router } from 'express';
import xss from 'xss';
import { catchErrors } from '../lib/catch-errors.js';
import { body, validationResult } from 'express-validator';
import { updateRow, list, total, insertEvent } from '../lib/db.js';
import passport, { ensureLoggedIn } from './login.js';

export const adminRouter = express.Router();
export const PAGE_SIZE = 50;
async function adminRoute(req, res) {

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
  
    res.render('admin', {
      title: 'Events',
      errors,
      formData,
      events,
      paging,
      admin: true,
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
      return res.redirect('/admin/');
    }
  
    return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
  }

  async function update(req, res) {
    const {
      name, description,
    } = req.body;
  
    let success = true;
    const eventsID = req.params.id;
    const id = eventsID;
    try {
      success = await updateRow({
        name, description, id
      });
    } catch (e) {
      console.error(e);
    }
  
    if (success) {
      return res.redirect('/admin/');
    }
  
    return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
  }


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

  adminRouter.post(
    '/',
    validationMiddleware,
    xssSanitizationMiddleware,
    catchErrors(validationCheck),
    sanitizationMiddleware,
    catchErrors(register),
  );

  async function updateRoute(req, res) {

    let {page = 1} = req.query;
    page = setPagenumber(page); 
  
    const errors = [];
    const formData = {
      name: '',
      description: '',
    };
  
    const offset = (page - 1) * PAGE_SIZE;
  
    const events = await list(offset, PAGE_SIZE);

    let eventid = req.params.id;
  
    const totalevents = await total();
  
    const paging = await pagingInfo(
      {
        page, offset, totalevents, eventsLength: events.length,
      },
    );
  
    res.render('update', {
      title: 'Events',
      errors,
      formData,
      events,
      eventid,
      paging,
      admin: false,
    });
  }

  adminRouter.get('/',ensureLoggedIn, catchErrors(adminRoute));

  adminRouter.get('/update/:id', catchErrors(updateRoute));

  adminRouter.post('/update/:id',  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(update),);

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

  adminRouter.post('/login', 
    // Þetta notar strat að ofan til að skrá notanda inn
    passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),

  // Ef við komumst hingað var notandi skráður inn, senda á /admin
  (req, res) => {
    res.redirect('/admin');
  },
);

adminRouter.get('/login', login);

adminRouter.get('/logout', (req, res) => {
    // logout hendir session cookie og session
    req.logout();
    res.redirect('/');
  });

function login(req, res) {
    if (req.isAuthenticated()) {
      return res.redirect('/admin/');
    }
  
    let message = '';
  
    // Athugum hvort einhver skilaboð séu til í session, ef svo er birtum þau
    // og hreinsum skilaboð
    if (req.session.messages && req.session.messages.length > 0) {
      message = req.session.messages.join(', ');
      req.session.messages = [];
    }
  
    return res.render('login', { message, title: 'Innskráning' });
  }
  