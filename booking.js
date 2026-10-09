const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const state = { step: 1, serviceId: params.get('service') || '', vehicleType: '', brandId: '', brand: '', model: '', slot: '' };
let services = [], brands = [], businessPhone = '8595836996';
const vehicleTypes = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Other'];
const vehicleImages = { Hatchback: '/assets/vehicles/hatchback.png', Sedan: '/assets/vehicles/sedan.png', SUV: '/assets/vehicles/suv.png', MUV: '/assets/vehicles/muv.png', Luxury: '/assets/vehicles/luxury.png', Other: '/assets/vehicles/other.png' };
const esc = (value = '') => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
async function load() { const [serviceData, brandData, siteSettings] = await Promise.all([fetch('/.netlify/functions/services').then((r) => r.ok ? r.json() : Promise.reject()).catch(() => fetch('/data/services.json').then((r) => r.json())), fetch('/data/brands.json').then((r) => r.json()), fetch('/.netlify/functions/settings').then((r) => r.ok ? r.json() : ({ phone: businessPhone })).catch(() => ({ phone: businessPhone }))]); services = serviceData.filter((item) => item.active !== false); brands = brandData; businessPhone = String(siteSettings.phone || businessPhone).replace(/\D/g, '').slice(-10); renderServices(); renderVehicles(); renderBrands(); update(); }
const service = () => services.find((item) => item.id === state.serviceId);
const brand = () => brands.find((item) => item.id === state.brandId);
const isHomeService = () => service()?.bookingMode === 'home';
const priceForVehicle = (item = service(), vehicle = state.vehicleType) => {
  const amount = Number(item?.vehiclePricing?.[vehicle]);
  return amount ? `₹${amount.toLocaleString('en-IN')}` : item?.priceDisplay || 'Get quote';
};
function renderServices() { $('#booking-services').innerHTML = services.map((item) => `<button type="button" class="booking-product ${item.id === state.serviceId ? 'selected' : ''}" data-service="${item.id}"><img src="${esc(item.image)}" alt=""><div><small>${esc(item.category)}</small><strong>${esc(item.name)}</strong><p>${esc(item.shortDescription)}</p><b>${esc(item.priceDisplay)}</b></div></button>`).join(''); }
function renderVehicles() { $('#vehicle-types').innerHTML = vehicleTypes.map((type) => `<button type="button" class="vehicle-option ${type === state.vehicleType ? 'selected' : ''}" data-vehicle="${type}"><span class="vehicle-visual"><img src="${vehicleImages[type]}" alt="Premium ${type} vehicle" loading="eager"></span><strong>${type}</strong></button>`).join(''); }
function renderBrands(query = '') { const value = query.toLowerCase(); $('#brands').innerHTML = brands.filter((item) => item.name.toLowerCase().includes(value)).map((item) => `<button type="button" class="brand-option ${item.id === state.brandId ? 'selected' : ''}" data-brand="${item.id}">${item.logo ? `<img src="${item.logo}" alt="${esc(item.name)} logo">` : `<span class="brand-fallback">${item.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span>`}<strong>${esc(item.name)}</strong></button>`).join(''); }
function renderModels(query = '') { const selected = brand(); const value = query.toLowerCase(); const models = (selected?.models || []).filter((model) => model.toLowerCase().includes(value)); $('#model-copy').textContent = selected ? `Choose your ${selected.name} model.` : 'Select a brand first.'; $('#models').innerHTML = [...models, 'Other Model'].map((model) => `<button type="button" class="model-option ${model === state.model || (model === 'Other Model' && state.model === '__other__') ? 'selected' : ''}" data-model="${esc(model)}">${esc(model)}</button>`).join(''); }
function summary() { const selectedService = service(); const vehicleSummary = isHomeService() ? '<div><small>Service type</small><b>Doorstep home service</b></div>' : `<div><small>Vehicle type</small><b>${esc(state.vehicleType)}</b><br><button type="button" class="change-link" data-change="2">Change</button></div><div><small>Brand</small><b>${esc(state.brand)}</b><br><button type="button" class="change-link" data-change="3">Change</button></div><div><small>Model</small><b>${esc(state.model)}</b><br><button type="button" class="change-link" data-change="4">Change</button></div>`; $('#selection-summary').innerHTML = `<div class="summary-service"><img src="${esc(selectedService.image)}" alt=""><div><small>${esc(selectedService.category)}</small><h3>${esc(selectedService.name)}</h3><p>${esc(selectedService.shortDescription)}</p><strong>${esc(priceForVehicle())}</strong><br><button type="button" class="change-link" data-change="1">Change service</button></div></div><div class="summary-vehicle">${vehicleSummary}</div>`; }
function finalSummary() { const selectedService = service(); const subject = isHomeService() ? 'Doorstep home service' : `${state.brand} ${state.model}`; $('#final-summary').innerHTML = `<span>${esc(selectedService?.name || '')} · ${esc(subject)}</span><strong>${esc(priceForVehicle())}</strong>`; }
function canContinue() { if (state.step === 1) return !!state.serviceId; if (state.step === 2) return !!state.vehicleType; if (state.step === 3) return !!state.brandId; if (state.step === 4) return !!state.model && state.model !== '__other__'; return true; }
function update() { document.querySelectorAll('.booking-step').forEach((section) => section.classList.toggle('active', Number(section.dataset.step) === state.step)); const progressStep = state.step === 5 ? 4 : state.step === 6 ? 5 : state.step; document.querySelectorAll('.stepper button').forEach((button, index) => { const point = index + 1; button.classList.toggle('active', point === progressStep); button.classList.toggle('done', point < progressStep); }); document.querySelectorAll('.stepper i').forEach((line, index) => line.classList.toggle('done', index + 1 < progressStep)); $('#back').style.display = state.step > 1 ? 'inline-flex' : 'none'; const selectedService = service(); $('#running-total strong').textContent = selectedService ? `${selectedService.name} · ${priceForVehicle(selectedService)}` : 'Choose a service'; $('#continue').disabled = !canContinue(); $('#continue').innerHTML = state.step === 6 ? 'Submit booking <span>→</span>' : 'Continue <span>→</span>'; $('.form-message').textContent = ''; if (state.step === 4) renderModels($('#model-search').value); if (state.step === 5) summary(); if (state.step === 6) finalSummary(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function validateDetails() { for (const input of document.querySelectorAll('[data-step="6"] [required]')) { if (!input.checkValidity()) { input.reportValidity(); $('.form-message').textContent = 'Please complete the required details.'; return false; } } return true; }
async function submit() {
  if (!validateDetails()) return;
  const data = Object.fromEntries(new FormData($('#booking-form')));
  const address = [data.house, data.locality, data.landmark, data.city, data.pin].filter(Boolean).join(', ');
  const payload = { ...data, ...state, address };
  const button = $('#continue');
  button.disabled = true;
  button.textContent = 'Saving booking…';
  try {
    const response = await fetch('/.netlify/functions/booking', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);

    const booking = {
      id: result.id,
      service: result.service.name,
      price: result.service.priceDisplay,
      vehicleType: state.vehicleType,
      brand: state.brand,
      model: state.model,
      name: data.name,
      phone: data.phone,
      address,
      date: data.date || '',
      slot: state.slot || '',
      notes: data.notes || ''
    };
    try {
      sessionStorage.setItem('gtsBooking', JSON.stringify(booking));
      sessionStorage.setItem('gtsFormSubmitted', 'true');
    } catch {}

    let redirected = false;
    const openThankYou = () => {
      if (redirected) return;
      redirected = true;
      location.assign('/thank-you');
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'lead_form_success',
      eventCallback: openThankYou,
      eventTimeout: 1200
    });
    setTimeout(openThankYou, 1400);
  } catch (error) {
    $('.form-message').textContent = error.message || 'We could not save the booking. Please call us.';
    button.disabled = false;
    button.innerHTML = 'Submit booking <span>→</span>';
  }
}
document.addEventListener('click', (event) => { const serviceButton = event.target.closest('[data-service]'); const vehicleButton = event.target.closest('[data-vehicle]'); const brandButton = event.target.closest('[data-brand]'); const modelButton = event.target.closest('[data-model]'); const change = event.target.closest('[data-change]'); const slot = event.target.closest('[data-slot]'); if (serviceButton) { state.serviceId = serviceButton.dataset.service; if (!isHomeService() && state.vehicleType === 'Home Service') { state.vehicleType = ''; state.brandId = ''; state.brand = ''; state.model = ''; } renderServices(); } if (vehicleButton) { state.vehicleType = vehicleButton.dataset.vehicle; renderVehicles(); $('#running-total strong').textContent = `${service().name} · ${priceForVehicle()}`; } if (brandButton) { const selected = brands.find((item) => item.id === brandButton.dataset.brand); state.brandId = selected.id; state.brand = selected.name; state.model = ''; renderBrands($('#brand-search').value); } if (modelButton) { const model = modelButton.dataset.model; state.model = model === 'Other Model' ? '__other__' : model; $('#other-model-field').hidden = model !== 'Other Model'; if (model !== 'Other Model') $('#other-model').value = ''; renderModels($('#model-search').value); } if (change) { state.step = Number(change.dataset.change); update(); } if (slot) { state.slot = slot.dataset.slot; document.querySelectorAll('[data-slot]').forEach((item) => item.classList.toggle('selected', item === slot)); } $('#continue').disabled = !canContinue(); });
$('#brand-search').addEventListener('input', (event) => renderBrands(event.target.value)); $('#model-search').addEventListener('input', (event) => renderModels(event.target.value)); $('#other-model').addEventListener('input', (event) => { state.model = event.target.value.trim() || '__other__'; $('#continue').disabled = !canContinue(); }); $('#date').min = new Date().toISOString().slice(0, 10); $('#back').addEventListener('click', () => { state.step = isHomeService() && state.step === 6 ? 1 : state.step - 1; update(); }); $('#continue').addEventListener('click', () => { if (!canContinue()) return; if (state.step === 1 && isHomeService()) { state.vehicleType = 'Home Service'; state.brandId = ''; state.brand = 'Not applicable'; state.model = 'Not applicable'; state.step = 6; update(); } else if (state.step < 6) { state.step++; update(); } else submit(); }); document.querySelector('.stepper').addEventListener('click', (event) => { const button = event.target.closest('[data-jump]'); if (button && Number(button.dataset.jump) < state.step && (!isHomeService() || Number(button.dataset.jump) === 1)) { state.step = Number(button.dataset.jump); update(); } }); load();
