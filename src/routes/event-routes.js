import express from 'express';
import { listEvents } from '../lib/db.js';

export const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
    const events = await listEvents();
    res.json({ events });
})