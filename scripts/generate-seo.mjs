import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const services = JSON.parse(await readFile(new URL('../data/services.json', import.meta.url), 'utf8')).filter((item) => item.active !== false);
const template = await readFile(new URL('../service.html', import.meta.url), 'utf8');
const outputRoot = new URL('../services/', import.meta.url);
const esc = (value = '') => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
const productLabel = (service) => service.bookingMode === 'home' || service.category === 'Home & Upholstery'
  ? 'Diversey professional cleaning liquids'
  : /Interior|Detailing Packages/i.test(`${service.category} ${service.name}`)
    ? '3M car-care products and Diversey professional cleaning liquids'
    : '3M professional car-care products';

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const service of services) {
  const directory = join(fileURLToPath(outputRoot), service.id);
  await mkdir(directory, { recursive: true });
  const pricing = service.vehiclePricing ? `<section class="detail-block"><h2>Vehicle-wise pricing</h2><div class="vehicle-price-list">${Object.entries(service.vehiclePricing).filter(([vehicle]) => vehicle !== 'MUV').map(([vehicle, price]) => `<div><span>${esc(vehicle)}</span><strong>₹${Number(price).toLocaleString('en-IN')}</strong></div>`).join('')}</div></section>` : '';
  const initial = `<nav class="detail-breadcrumb"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span><b>${esc(service.name)}</b></nav><div class="detail-layout"><div class="detail-gallery"><img src="${esc(service.image)}" alt="${esc(service.name)} by GTS Car Detailing"><div class="detail-stamp"><span>Professional equipment</span><span>Doorstep service</span></div></div><div class="detail-copy"><p class="kicker dark">${esc(service.label || service.category)}</p><h1>${esc(service.name)} in Delhi NCR</h1><p class="detail-lead">${esc(service.fullDescription || service.shortDescription)}</p><span class="product-material-chip">Uses ${esc(productLabel(service))}</span><div class="detail-price"><div><small>${service.vehiclePricing ? 'Starting at' : 'Price'}</small><strong>${esc(service.priceDisplay)}</strong></div></div>${pricing}<section class="detail-block"><h2>What’s included</h2><ul class="detail-features">${(service.features || []).map((feature) => `<li>${esc(feature)}</li>`).join('')}</ul></section><section class="detail-block"><h2>Professional products used</h2><p>We select ${esc(productLabel(service))} according to the surface, material and condition being treated.</p></section><section class="detail-block"><h2>Suitable for</h2><div class="vehicle-tags">${(service.vehicles || []).map((vehicle) => `<span>${esc(vehicle)}</span>`).join('')}</div></section><p class="detail-note">Professional doorstep service from GTS Car Detailing across Delhi NCR. Final scope and pricing are confirmed before service.</p><div class="detail-actions"><a class="btn btn-primary" href="/book?service=${service.id}">Book this service <span>→</span></a><a class="btn btn-whatsapp" data-whatsapp data-whatsapp-message="Hello GTS Car Detailing, I would like to enquire about ${esc(service.name)}.">WhatsApp</a></div></div></div>`;
  const schema = { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: `${service.fullDescription || service.shortDescription} Professional products used: ${productLabel(service)}.`, provider: { '@type': 'AutoWash', name: 'GTS Car Detailing', url: 'https://www.gtscardetailing.shop/' }, areaServed: ['Delhi', 'Delhi NCR'], serviceType: service.category, url: `https://www.gtscardetailing.shop/services/${service.id}`, image: `https://www.gtscardetailing.shop${service.image}` };
  if (service.price) schema.offers = { '@type': 'Offer', priceCurrency: 'INR', price: service.price, availability: 'https://schema.org/InStock' };
  let html = template
    .replace('<title>Service | GTS Car Detailing</title>', `<title>${esc(service.name)} in Delhi NCR | GTS Car Detailing</title>`)
    .replace('content="Explore this GTS Car Detailing doorstep service, pricing and inclusions."', `content="${esc(service.shortDescription)} Book doorstep ${esc(service.name.toLowerCase())} with GTS Car Detailing in Delhi NCR."`)
    .replace('href="https://www.gtscardetailing.shop/services/"', `href="https://www.gtscardetailing.shop/services/${service.id}"`)
    .replace('<div class="detail-loading">Loading service…</div>', initial)
    .replace('</head>', `    <script type="application/ld+json">${JSON.stringify(schema)}</script>\n  </head>`);
  await writeFile(join(directory, 'index.html'), html);
}

const today = '2026-10-09';
const urls = [
  ['https://www.gtscardetailing.shop/', '1.0'],
  ['https://www.gtscardetailing.shop/book', '0.9'],
  ...services.map((service) => [`https://www.gtscardetailing.shop/services/${service.id}`, '0.8'])
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([loc, priority]) => `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../sitemap.xml', import.meta.url), sitemap);
