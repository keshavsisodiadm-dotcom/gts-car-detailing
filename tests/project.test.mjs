import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const requiredFiles = [
  'index.html',
  'book.html',
  'thank-you.html',
  'thank-you.js',
  'thank-you.css',
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

test('booking success flow stores data, emits one conversion event, and redirects safely', async () => {
  const booking = await readFile(new URL('booking.js', root), 'utf8');
  const thankYou = await readFile(new URL('thank-you.html', root), 'utf8');
  const thankYouScript = await readFile(new URL('thank-you.js', root), 'utf8');
  const netlify = await readFile(new URL('netlify.toml', root), 'utf8');

  assert.match(booking, /if \(!response\.ok\) throw new Error/);
  assert.match(booking, /sessionStorage\.setItem\('gtsBooking'/);
  assert.match(booking, /event: 'lead_form_success'/);
  assert.equal(booking.match(/event: 'lead_form_success'/g)?.length, 1);
  assert.match(booking, /location\.assign\('\/thank-you'\)/);
  assert.doesNotMatch(booking, /thank-you\?[^'"`]*name/i);

  assert.match(thankYou, /name="robots" content="noindex, nofollow"/);
  assert.match(thankYou, /GTM-JPS6SQ78/);
  assert.match(thankYou, /href="\/"[^>]*>Back to Home/);
  assert.match(thankYouScript, /encodeURIComponent\(message\)/);
  assert.doesNotMatch(thankYouScript, /dataLayer\.push/);
  assert.match(netlify, /from = "\/thank-you"[\s\S]*?to = "\/thank-you\.html"[\s\S]*?status = 200/);

  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
  assert.doesNotMatch(sitemap, /thank-you/);
});

test('thank-you page formats WhatsApp details without exposing them on the page', async () => {
  const script = await readFile(new URL('thank-you.js', root), 'utf8');
  const selectors = ['#booking-service', '#booking-brand', '#booking-model', '#booking-name', '#booking-id', '#booking-confirmation', '#whatsapp-booking'];
  const elements = Object.fromEntries(selectors.map((selector) => [selector, { hidden: selector === '#booking-confirmation', textContent: '', href: '' }]));
  const booking = {
    id: 'GTS-TEST',
    service: 'Interior Deep Dry Cleaning',
    brand: 'Honda',
    model: 'City',
    name: 'Test Customer',
    phone: '9000000000',
    address: 'Test address, Delhi',
    date: '2026-10-20',
    slot: 'Morning'
  };

  runInNewContext(script, {
    document: { querySelector: (selector) => elements[selector] },
    sessionStorage: { getItem: (key) => key === 'gtsFormSubmitted' ? 'true' : JSON.stringify(booking) },
    fetch: () => Promise.reject(new Error('offline test')),
    encodeURIComponent,
    JSON,
    String,
    Promise
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(elements['#booking-confirmation'].hidden, false);
  assert.equal(elements['#booking-name'].textContent, booking.name);
  const whatsapp = new URL(elements['#whatsapp-booking'].href);
  const message = whatsapp.searchParams.get('text');
  for (const expected of ['Name: Test Customer', 'Service: Interior Deep Dry Cleaning', 'Car: Honda City', 'Address: Test address, Delhi', 'Phone: 9000000000']) {
    assert.match(message, new RegExp(expected));
  }
  assert.doesNotMatch(JSON.stringify(elements), /Test address, Delhi/);

  const directElements = Object.fromEntries(selectors.map((selector) => [selector, { hidden: selector === '#booking-confirmation', textContent: '', href: '' }]));
  runInNewContext(script, {
    document: { querySelector: (selector) => directElements[selector] },
    sessionStorage: { getItem: () => null },
    fetch: () => Promise.reject(new Error('offline test')),
    encodeURIComponent,
    JSON,
    String,
    Promise
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(directElements['#booking-confirmation'].hidden, true);
  assert.match(new URL(directElements['#whatsapp-booking'].href).searchParams.get('text'), /enquire about a doorstep detailing booking/);
});

test('every canonical URL uses the www production domain', async () => {
  const serviceDirectories = await readdir(new URL('services/', root), { withFileTypes: true });
  const htmlFiles = [
    'index.html',
    'book.html',
    'thank-you.html',
    'service.html',
    ...serviceDirectories.filter((entry) => entry.isDirectory()).map((entry) => `services/${entry.name}/index.html`)
  ];

  for (const file of htmlFiles) {
    const html = await readFile(new URL(file, root), 'utf8');
    const canonical = html.match(/<link\s+rel="canonical"[\s\S]*?href="([^"]+)"/i)?.[1];
    assert.ok(canonical, `${file} must include a canonical URL`);
    assert.ok(canonical.startsWith('https://www.gtscardetailing.shop/'), `${file} must use the www canonical domain`);
  }

  const netlify = await readFile(new URL('netlify.toml', root), 'utf8');
  assert.match(netlify, /from = "https:\/\/gtscardetailing\.shop\/\*"/);
  assert.match(netlify, /to = "https:\/\/www\.gtscardetailing\.shop\/:splat"/);
  assert.match(netlify, /status = 301/);
});
