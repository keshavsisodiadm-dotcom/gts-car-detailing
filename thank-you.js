const fallbackPhone = '8595836996';
const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10) || fallbackPhone;

function readBooking() {
  try {
    if (sessionStorage.getItem('gtsFormSubmitted') !== 'true') return null;
    return JSON.parse(sessionStorage.getItem('gtsBooking') || 'null');
  } catch {
    return null;
  }
}

function bookingMessage(booking) {
  if (!booking) {
    return 'Hi GTS Car Detailing, I would like to enquire about a doorstep detailing booking. Please contact me.';
  }
  const car = [booking.brand, booking.model].filter((value) => value && value !== 'Not applicable').join(' ') || booking.vehicleType || 'Not specified';
  return [
    'Hi GTS Car Detailing, I have submitted a booking request through your website.',
    '',
    `Name: ${booking.name || 'Not provided'}`,
    `Service: ${booking.service || 'Not specified'}`,
    `Car: ${car}`,
    `Preferred Date/Time: ${[booking.date, booking.slot].filter(Boolean).join(' · ') || 'Flexible'}`,
    `Address: ${booking.address || 'Not provided'}`,
    `Phone: ${booking.phone || 'Not provided'}`,
    booking.id ? `Booking ID: ${booking.id}` : null,
    '',
    'Please confirm my booking.'
  ].filter((line) => line !== null).join('\n');
}

function showBooking(booking) {
  if (!booking) return;
  document.querySelector('#booking-service').textContent = booking.service || 'Not specified';
  document.querySelector('#booking-brand').textContent = booking.brand || 'Not applicable';
  document.querySelector('#booking-model').textContent = booking.model || 'Not applicable';
  document.querySelector('#booking-name').textContent = booking.name || 'Guest';
  document.querySelector('#booking-id').textContent = booking.id ? `#${booking.id}` : '';
  document.querySelector('#booking-confirmation').hidden = false;
}

function setWhatsApp(phone, booking) {
  const message = bookingMessage(booking);
  document.querySelector('#whatsapp-booking').href = `https://wa.me/91${digits(phone)}?text=${encodeURIComponent(message)}`;
}

const booking = readBooking();
showBooking(booking);
setWhatsApp(fallbackPhone, booking);

fetch('/.netlify/functions/settings', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then((settings) => setWhatsApp(settings.phone, booking))
  .catch(() => {});
