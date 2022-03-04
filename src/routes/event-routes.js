import express from 'express';
import {
    listEvent
} from '../lib/db.js';

export const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
    const events = await listEvent();
    res.json({ events });
})