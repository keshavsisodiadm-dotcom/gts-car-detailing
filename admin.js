const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let token = sessionStorage.getItem('gts-admin-token') || '';
let services = [];
let bookings = [];
let settings = { phone: '8595836996', email: 'gtscardetailing24×7@gmail.com' };
let editingId = null;
let pendingImage = '';

const esc = (value = '') => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) } });
  if (response.status === 401) { logout(); throw Error('Session expired'); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(body.error || 'Request failed');
  return body;
}

function logout() {
  token = '';
  sessionStorage.removeItem('gts-admin-token');
  $('#admin-view').hidden = true;
  $('#login-view').hidden = false;
}

async function start() {
  $('#login-view').hidden = true;
  $('#admin-view').hidden = false;
  try {
    [services, bookings, settings] = await Promise.all([
      api('/.netlify/functions/admin-services'), api('/.netlify/functions/bookings'), api('/.netlify/functions/admin-settings')
    ]);
    $('#settings-form').elements.phone.value = settings.phone || '';
    $('#settings-form').elements.email.value = settings.email || '';
    renderServices();
    renderBookings();
  } catch {}
}

function renderServices() {
  const query = $('#admin-search').value.toLowerCase();
  const filter = $('#status-filter').value;
  const list = services.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query) && (filter === 'all' || (filter === 'active' && item.active !== false) || (filter === 'inactive' && item.active === false) || (filter === 'featured' && item.featured)));
  $('#service-count').textContent = `${list.length} of ${services.length} services`;
  $('#admin-services').innerHTML = list.map((item) => {
    const index = services.findIndex((service) => service.id === item.id);
    return `<article class="admin-service-row"><div class="service-cell"><img src="${esc(item.image)}" alt=""><div><strong>${esc(item.name)}</strong><small>${item.featured ? 'Featured' : item.popular ? 'Popular' : 'Standard service'}</small></div></div><span>${esc(item.category)}</span><b>${esc(item.priceDisplay)}</b><i class="status ${item.active === false ? 'inactive' : ''}">${item.active === false ? 'Inactive' : 'Active'}</i><div class="row-actions"><span class="order-actions"><button data-move="up" data-id="${item.id}" aria-label="Move ${esc(item.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="down" data-id="${item.id}" aria-label="Move ${esc(item.name)} down" ${index === services.length - 1 ? 'disabled' : ''}>↓</button></span><button data-edit="${item.id}">Edit</button><button class="delete" data-delete="${item.id}">Delete</button></div></article>`;
  }).join('') || '<p>No services found.</p>';
}

function renderBookings() {
  const query = $('#booking-search').value.toLowerCase();
  const list = bookings.filter((item) => `${item.id} ${item.name} ${item.phone} ${item.service?.name}`.toLowerCase().includes(query));
  $('#booking-count').textContent = `${list.length} bookings`;
  $('#admin-bookings').innerHTML = list.map((item) => `<article class="booking-row"><div><strong>${esc(item.name)}</strong><small>${esc(item.id)} · ${esc(item.phone)}</small></div><div><strong>${esc(item.service?.name)}</strong><small>${esc(item.brand)} ${esc(item.model)}</small></div><div><strong>${esc(item.date || 'Flexible')}</strong><small>${esc(item.slot || 'Flexible time')}</small></div><i class="status">${esc(item.status)}</i></article>`).join('') || '<p>No bookings yet.</p>';
}

function slug(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50); }

function openEditor(item = null) {
  editingId = item?.id || null;
  pendingImage = item?.image || '/assets/services/exterior.webp';
  const form = $('#service-form');
  form.reset();
  form.elements.id.value = item?.id || '';
  form.elements.name.value = item?.name || '';
  form.elements.category.value = item?.category || 'Exterior Care';
  form.elements.price.value = item?.price ?? '';
  form.elements.oldPrice.value = item?.oldPrice || '';
  form.elements.discount.value = item?.discount || '';
  form.elements.shortDescription.value = item?.shortDescription || '';
  form.elements.fullDescription.value = item?.fullDescription || '';
  form.elements.features.value = (item?.features || []).join('\n');
  form.elements.vehicles.value = (item?.vehicles || ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury']).join(', ');
  form.elements.active.checked = item?.active !== false;
  form.elements.featured.checked = !!item?.featured;
  form.elements.popular.checked = !!item?.popular;
  $('#photo-preview').src = pendingImage;
  $('#editor-title').textContent = item ? 'Edit service' : 'Add service';
  $('#editor-message').textContent = '';
  $('#service-editor').showModal();
}

async function imageData(file) {
  const bitmap = await createImageBitmap(file);
  const max = 1200;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.8);
}

async function saveAll() {
  services = await api('/.netlify/functions/admin-services', { method: 'PUT', body: JSON.stringify(services) });
  renderServices();
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  try {
    const response = await fetch('/.netlify/functions/admin-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const body = await response.json();
    if (!response.ok) throw Error(body.error);
    token = body.token;
    sessionStorage.setItem('gts-admin-token', token);
    $('.admin-message').textContent = '';
    start();
  } catch (error) { $('.admin-message').textContent = error.message || 'Sign-in failed.'; }
});

$('#logout').addEventListener('click', logout);
$('#admin-search').addEventListener('input', renderServices);
$('#status-filter').addEventListener('change', renderServices);
$('#booking-search').addEventListener('input', renderBookings);
$('#add-service').addEventListener('click', () => openEditor());
$('#close-editor').addEventListener('click', () => $('#service-editor').close());
$('#cancel-editor').addEventListener('click', () => $('#service-editor').close());

$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const phone = form.get('phone').replace(/\D/g, '');
  const email = form.get('email').trim();
  try {
    settings = await api('/.netlify/functions/admin-settings', { method: 'PUT', body: JSON.stringify({ phone, email }) });
    event.target.elements.phone.value = settings.phone;
    event.target.elements.email.value = settings.email;
    $('#settings-message').textContent = 'Phone number and email updated across the website.';
  } catch (error) { $('#settings-message').textContent = error.message; }
});

$('#service-photo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 8_000_000) { $('#editor-message').textContent = 'Choose an image smaller than 8 MB.'; return; }
  pendingImage = await imageData(file);
  $('#photo-preview').src = pendingImage;
});
$('#remove-photo').addEventListener('click', () => { pendingImage = '/assets/services/exterior.webp'; $('#photo-preview').src = pendingImage; });

$('#service-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const name = data.get('name').trim();
  const price = Number(data.get('price'));
  const existing = services.find((item) => item.id === editingId);
  const item = { ...existing, id: editingId || `${slug(name)}-${Date.now().toString(36).slice(-4)}`, name, category: data.get('category').trim(), image: pendingImage, price, priceDisplay: price ? `₹${price.toLocaleString('en-IN')}` : 'Get quote', oldPrice: Number(data.get('oldPrice')) || 0, discount: Number(data.get('discount')) || 0, shortDescription: data.get('shortDescription').trim(), fullDescription: data.get('fullDescription').trim(), features: data.get('features').split('\n').map((value) => value.trim()).filter(Boolean), vehicles: data.get('vehicles').split(',').map((value) => value.trim()).filter(Boolean), active: data.get('active') === 'on', featured: data.get('featured') === 'on', popular: data.get('popular') === 'on', label: existing?.label || data.get('category').toUpperCase(), rating: existing?.rating || 'Professional service' };
  if (editingId) services = services.map((service) => service.id === editingId ? item : service);
  else services.push(item);
  try { await saveAll(); $('#service-editor').close(); } catch (error) { $('#editor-message').textContent = error.message; }
});

document.addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit]');
  const remove = event.target.closest('[data-delete]');
  const move = event.target.closest('[data-move]');
  const panel = event.target.closest('[data-panel]');
  if (edit) openEditor(services.find((item) => item.id === edit.dataset.edit));
  if (move) {
    const index = services.findIndex((item) => item.id === move.dataset.id);
    const target = move.dataset.move === 'up' ? index - 1 : index + 1;
    if (index >= 0 && target >= 0 && target < services.length) {
      [services[index], services[target]] = [services[target], services[index]];
      renderServices();
      try { await saveAll(); } catch (error) { alert(error.message); }
    }
  }
  if (remove) {
    const item = services.find((service) => service.id === remove.dataset.delete);
    if (confirm(`Permanently delete ${item.name}?`)) {
      services = services.filter((service) => service.id !== item.id);
      try { await saveAll(); } catch (error) { alert(error.message); }
    }
  }
  if (panel) {
    $$('[data-panel]').forEach((button) => button.classList.toggle('active', button === panel));
    ['services', 'bookings', 'settings'].forEach((name) => { $(`#${name}-panel`).hidden = panel.dataset.panel !== name; });
    $('#add-service').hidden = panel.dataset.panel !== 'services';
    $('#panel-title').textContent = panel.dataset.panel[0].toUpperCase() + panel.dataset.panel.slice(1);
  }
});

if (token) start();
