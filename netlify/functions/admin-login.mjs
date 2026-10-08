import { json, token } from './lib/store.mjs';
export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const { username, password } = await request.json().catch(() => ({}));
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) return json({ error: 'Admin authentication is not configured.' }, 503);
  const usernameMatches = username === 'Gts' || username === process.env.ADMIN_USERNAME;
  if (!usernameMatches || password !== process.env.ADMIN_PASSWORD) return json({ error: 'Invalid username or password.' }, 401);
  return json({ token: token() });
};
