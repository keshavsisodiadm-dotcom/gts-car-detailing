const fallbackUrl = '/data/services.json';
let catalogue = [];
let activeCategory = 'All';

const escapeHtml = (value = '') => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const formatPrice = (service) => service.priceDisplay || (service.price ? `₹${Number(service.price).toLocaleString('en-IN')}` : 'Get quote');
const productLabel = (service) => service.bookingMode === 'home' || service.category === 'Home & Upholstery'
  ? 'Diversey professional liquids'
  : /Interior|Detailing Packages/i.test(`${service.category} ${service.name}`)
    ? '3M + Diversey professional products'
    : '3M professional car-care products';

async function loadServices() {
  try {
    const response = await fetch('/.netlify/functions/services', { cache: 'no-store' });
    if (!response.ok) throw new Error('Live catalogue unavailable');
    catalogue = await response.json();
  } catch {
    catalogue = await (await fetch(fallbackUrl)).json();
  }
  catalogue = catalogue.filter((service) => service.active !== false);
  renderFilters();
  renderServices();
}

function productCard(service) {
  const features = (service.features || service.inclusions || []).slice(0, 3);
  const oldPrice = Number(service.oldPrice) > Number(service.price) ? `<del>₹${Number(service.oldPrice).toLocaleString('en-IN')}</del>` : '';
  const badge = service.popular ? '<span class="product-badge popular">Popular</span>' : service.featured ? '<span class="product-badge">Featured</span>' : '';
  return `<article class="product-card">
    <a class="product-image" href="/services/${encodeURIComponent(service.id)}"><img src="${escapeHtml(service.image)}" alt="${escapeHtml(service.name)} by GTS Car Detailing" loading="lazy" width="800" height="600">${badge}${service.discount ? `<span class="discount">${Number(service.discount)}% OFF</span>` : ''}</a>
    <div class="product-body"><p class="product-category">${escapeHtml(service.category || service.label)}</p><h3><a href="/services/${encodeURIComponent(service.id)}">${escapeHtml(service.name)}</a></h3><p class="product-description">${escapeHtml(service.shortDescription || service.description)}</p><span class="product-material-chip">${escapeHtml(productLabel(service))}</span><div class="product-proof"><span>✓ ${escapeHtml(features[0] || 'Professional service')}</span><span>✓ ${escapeHtml(features[1] || 'Doorstep convenience')}</span></div><div class="product-meta"><b>${escapeHtml(service.rating || 'Professional care')}</b></div><div class="product-price"><div><small>Starting at</small><strong>${escapeHtml(formatPrice(service))}</strong>${oldPrice}</div><div class="product-actions"><a class="text-link" href="/services/${encodeURIComponent(service.id)}">Details</a><a class="card-book" href="/book?service=${encodeURIComponent(service.id)}">Book now</a></div></div></div>
  </article>`;
}

function renderFilters() {
  const categories = ['All', ...new Set(catalogue.map((service) => service.category).filter(Boolean))];
  document.querySelector('#category-filters').innerHTML = categories.map((category) => `<button class="filter-chip ${category === activeCategory ? 'active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
}

function renderServices() {
  const query = document.querySelector('#service-search').value.trim().toLowerCase();
  const filtered = catalogue.filter((service) => (activeCategory === 'All' || service.category === activeCategory) && `${service.name} ${service.category} ${service.shortDescription}`.toLowerCase().includes(query));
  document.querySelector('#featured-services').innerHTML = catalogue.filter((service) => service.featured).slice(0, 4).map(productCard).join('');
  document.querySelector('#all-service-list').innerHTML = filtered.length ? filtered.map(productCard).join('') : '<p class="empty-state">No services match that search.</p>';
}

document.querySelector('#service-search').addEventListener('input', renderServices);
document.querySelector('#category-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  renderServices();
});
loadServices();
