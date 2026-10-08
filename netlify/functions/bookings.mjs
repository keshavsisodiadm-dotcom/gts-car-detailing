import { authorized, bookings, json } from './lib/store.mjs';
export default async (request) => authorized(request) ? json(await bookings()) : json({ error: 'Unauthorized' }, 401);
