import express from 'express';
import { requireAuthentication } from '../app.js';
import { createEvent, deleteEventById, getEventById, listEvents, register, updateEvent, updateEventDescription, updateEventName } from '../lib/db.js';
import { slugify } from '../lib/slugify.js';
import { findById } from '../lib/users.js';

export const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
    const events = await listEvents();
    res.json({ events });
})

eventsRouter.post('/', requireAuthentication, async (req, res) => {
    const { name, description } = req.body;
    const slug = slugify(name);
    console.log(name);
    const created = await createEvent({ name, slug, description });
    return res.json({ created });
})

eventsRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    const event = await getEventById(id);
    return res.json({ event });
})

eventsRouter.patch('/:id', requireAuthentication, async (req, res) => {
    const { id } = req.params;
    const admin = req.user;
    const { name, description } = req.body;
    const event = getEventById(id);
    if (admin) {
        if (name === undefined) {
            let result = await updateEventDescription(id, { description });
            res.json(result);
        } else if (description === undefined) {
            const slug = slugify(name);
            let result = await updateEventName(id, { name, slug })
            res.json(result);
        } else {
            const slug = slugify(name);
            let result = await updateEvent(id, { name, slug, description });
            res.json(result);
        }
    }

})

eventsRouter.delete('/:id', requireAuthentication, async (req, res) => {
    const { id } = req.params;
    const admin = req.user;
    if (admin) {
        let result = await deleteEventById(id);
        return res.json(result);
    }
    return res.json(admin);
})

eventsRouter.post(':id/register', requireAuthentication, async (req, res) => {
    const { id: idEvent } = req.params;
    const id = req.user;
    const event = await getEventById(idEvent);
    const user = findById(id);
    const name = user.name;

    const result = await register({ name, event });
    return res.json(result);



})
