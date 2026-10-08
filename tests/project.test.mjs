import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const requiredFiles = [
  'index.html',
  'book.html',
  'admin.html',
  'service.html',
  'netlify.toml',
  'data/services.json',
  'data/brands.json',
  'netlify/functions/services.mjs',
  'netlify/functions/settings.mjs',
  'netlify/functions/booking.mjs',
  'netlify/functions/admin-login.mjs'
];

test('required production files are present', async () => {
  await Promise.all(requiredFiles.map((path) => access(new URL(path, root))));
});

test('service seed has unique stable IDs and referenced images', async () => {
  const services = JSON.parse(await readFile(new URL('data/services.json', root), 'utf8'));
  assert.ok(services.length > 0, 'service seed must not be empty');
  assert.equal(new Set(services.map(({ id }) => id)).size, services.length, 'service IDs must be unique');

  for (const service of services) {
    assert.match(service.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(service.name);
    assert.ok(service.image?.startsWith('/assets/'));
    await access(new URL(service.image.slice(1), root));
  }
});

test('environment template declares every server-side setting', async () => {
  const example = await readFile(new URL('.env.example', root), 'utf8');
  for (const key of ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'CONTACT_PHONE', 'CONTACT_EMAIL']) {
    assert.match(example, new RegExp(`^${key}=`, 'm'));
  }
});

test('private environment file is ignored by Git', async () => {
  const ignore = await readFile(new URL('.gitignore', root), 'utf8');
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\.netlify\/$/m);
  assert.match(ignore, /^node_modules\/$/m);
});

test('homepage includes the Google Tag Manager container in head and body', async () => {
  const homepage = await readFile(new URL('index.html', root), 'utf8');
  const head = homepage.slice(homepage.indexOf('<head>'), homepage.indexOf('</head>'));
  const bodyStart = homepage.slice(homepage.indexOf('<body>'), homepage.indexOf('<main>'));
  assert.match(head, /GTM-JPS6SQ78/);
  assert.match(bodyStart, /GTM-JPS6SQ78/);

  const netlify = await readFile(new URL('netlify.toml', root), 'utf8');
  assert.match(netlify, /https:\/\/www\.googletagmanager\.com/);
  assert.match(netlify, /https:\/\/connect\.facebook\.net/);
});
