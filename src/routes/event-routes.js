import express from 'express';
import { requireAuthentication } from '../app.js';
import { createEvent, listEvents } from '../lib/db.js';
import { slugify } from '../lib/slugify.js';

export const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
    const events = await listEvents();
    res.json({ events });
})

eventsRouter.post('/', requireAuthentication, async (req, res) => {
    const { name, description = '' } = req.body;
    const slug = slugify(name);
    const created = await createEvent({ name, slug, description });
    return res.json({ created });
})