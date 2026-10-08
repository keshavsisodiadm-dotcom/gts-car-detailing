import { getStore } from '@netlify/blobs';
import { readFile } from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';

const servicesStore = () => getStore({ name: 'gts-services', consistency: 'strong' });
const bookingsStore = () => getStore({ name: 'gts-bookings', consistency: 'strong' });
const settingsStore = () => getStore({ name: 'gts-settings', consistency: 'strong' });
const CATALOGUE_KEY = 'catalogue-v4';
const SETTINGS_KEY = 'site-settings-v1';
const INITIAL_ORDER = [
  'interior-normal-wash-package',
  'interior-deep-dry-cleaning',
  'exterior-deep-cleaning',
  'interior-rubbing-package',
  'interior-paint-correction-package',
  'rubbing-polishing',
  'teflon-coating',
  'ceramic-coating',
  'graphene-coating-10h',
  'sofa-deep-dry-cleaning',
  'office-chair-cleaning',
  'dining-chair-cleaning',
  'mattress-cleaning',
  'sofa-cum-bed-cleaning',
  'couch-cushion-cleaning',
  'full-house-deep-cleaning'
];

export async function initialServices() {
  const value = JSON.parse(await readFile(new URL('../../data/services.json', import.meta.url), 'utf8'));
  return value.sort((a, b) => INITIAL_ORDER.indexOf(a.id) - INITIAL_ORDER.indexOf(b.id));
}

export async function services() {
  const store = servicesStore();
  const saved = await store.get(CATALOGUE_KEY, { type: 'json' });
  if (Array.isArray(saved)) return saved;
  const seed = await initialServices();
  await store.setJSON(CATALOGUE_KEY, seed);
  return seed;
}

export async function saveServices(value) {
  await servicesStore().setJSON(CATALOGUE_KEY, value);
}

export async function siteSettings() {
  const saved = await settingsStore().get(SETTINGS_KEY, { type: 'json' });
  const defaults = {
    phone: process.env.CONTACT_PHONE || '8595836996',
    email: process.env.CONTACT_EMAIL || 'gtscardetailing24×7@gmail.com',
    updatedAt: new Date().toISOString()
  };
  if (saved?.phone) return { ...defaults, ...saved, email: saved.email || defaults.email };
  await settingsStore().setJSON(SETTINGS_KEY, defaults);
  return defaults;
}

export async function saveSiteSettings(value) {
  const current = await siteSettings();
  const clean = {
    phone: String(value.phone ?? current.phone).replace(/\D/g, '').slice(-10),
    email: String(value.email ?? current.email).trim().slice(0, 160),
    updatedAt: new Date().toISOString()
  };
  if (!/^\d{10}$/.test(clean.phone)) throw new Error('Enter a valid 10-digit phone number.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(clean.email)) throw new Error('Enter a valid email address.');
  await settingsStore().setJSON(SETTINGS_KEY, clean);
  return clean;
}

export async function saveBooking(value) {
  await bookingsStore().setJSON(value.id, value);
}

export async function bookings() {
  const store = bookingsStore();
  const entries = await store.list();
  const values = await Promise.all(entries.blobs.map((blob) => store.get(blob.key, { type: 'json' })));
  return values.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const secret = () => process.env.ADMIN_SESSION_SECRET;
export function token() {
  if (!secret()) throw new Error('Admin session secret is not configured');
  const value = `admin.${Date.now() + 28_800_000}`;
  const signature = createHmac('sha256', secret()).update(value).digest('hex');
  return `${value}.${signature}`;
}

export function authorized(request) {
  const raw = request.headers.get('authorization')?.replace('Bearer ', '') || '';
  const split = raw.lastIndexOf('.');
  if (split < 0 || !secret()) return false;
  const value = raw.slice(0, split);
  const provided = raw.slice(split + 1);
  const expected = createHmac('sha256', secret()).update(value).digest('hex');
  if (provided.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return false;
  return Number(value.split('.')[1]) > Date.now();
}

export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});
