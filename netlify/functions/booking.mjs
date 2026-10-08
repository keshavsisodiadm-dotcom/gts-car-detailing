import { json, saveBooking, services } from './lib/store.mjs';
const clean = (value) => String(value || '').trim();
export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const payload = await request.json();
    const required = ['serviceId', 'vehicleType', 'brand', 'model', 'name', 'phone', 'address'];
    if (required.some((key) => !clean(payload[key]))) return json({ error: 'Missing required booking information.' }, 400);
    if (!/^\+?[0-9 -]{10,15}$/.test(payload.phone)) return json({ error: 'Enter a valid mobile number.' }, 400);
    if (payload.date && new Date(`${payload.date}T00:00:00`) < new Date(new Date().toDateString())) return json({ error: 'Please choose a future date.' }, 400);
    const service = (await services()).find((item) => item.id === payload.serviceId && item.active !== false);
    if (!service) return json({ error: 'This service is no longer available.' }, 409);
    const vehicleType = clean(payload.vehicleType);
    const vehiclePrice = Number(service.vehiclePricing?.[vehicleType]);
    const bookedService = vehiclePrice ? { ...service, price: vehiclePrice, priceDisplay: `₹${vehiclePrice.toLocaleString('en-IN')}` } : service;
    const id = `GTS-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const booking = { id, createdAt: new Date().toISOString(), status: 'New', service: bookedService, vehicleType, brand: clean(payload.brand), model: clean(payload.model), date: clean(payload.date), slot: clean(payload.slot), address: clean(payload.address), name: clean(payload.name), phone: clean(payload.phone), notes: clean(payload.notes) };
    await saveBooking(booking);
    return json({ id, service: bookedService });
  } catch {
    return json({ error: 'Unable to save booking.' }, 500);
  }
};
