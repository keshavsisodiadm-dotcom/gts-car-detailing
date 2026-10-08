import { authorized, json, saveServices, services } from './lib/store.mjs';
export default async (request) => {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method === 'GET') return json(await services());
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
  const value = await request.json().catch(() => null);
  if (!Array.isArray(value) || value.some((item) => !item.id || !item.name || !item.image || item.price === undefined)) return json({ error: 'Invalid service catalogue.' }, 400);
  if (JSON.stringify(value).length > 5_000_000) return json({ error: 'Catalogue images are too large.' }, 413);
  const now = new Date().toISOString();
  const clean = value.map((item) => ({ ...item, updatedAt: now, createdAt: item.createdAt || now }));
  await saveServices(clean);
  return json(clean);
};
