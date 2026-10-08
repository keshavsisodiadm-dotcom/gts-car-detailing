import { authorized, json, saveSiteSettings, siteSettings } from './lib/store.mjs';

export default async (request) => {
  if (!authorized(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method === 'GET') return json(await siteSettings());
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
  try {
    return json(await saveSiteSettings(await request.json()));
  } catch (error) {
    return json({ error: error.message || 'Invalid settings.' }, 400);
  }
};
