const fallbackPhone = '8595836996';
const fallbackEmail = 'gtscardetailing24×7@gmail.com';

const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10) || fallbackPhone;
const displayPhone = (value) => `+91 ${value.slice(0, 5)} ${value.slice(5)}`;

function applySettings(settings) {
  const phone = digits(settings?.phone);
  const email = String(settings?.email || fallbackEmail).trim();
  window.GTSSettings = { phone, internationalPhone: `91${phone}`, email };
  document.querySelectorAll('[data-phone]').forEach((link) => {
    link.href = `tel:+91${phone}`;
    link.textContent = link.dataset.phonePrefix ? `${link.dataset.phonePrefix}${displayPhone(phone)}` : displayPhone(phone);
  });
  document.querySelectorAll('[data-whatsapp]').forEach((link) => {
    const message = link.dataset.whatsappMessage || '';
    link.href = `https://wa.me/91${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  });
  document.querySelectorAll('[data-email]').forEach((link) => {
    link.href = `mailto:${email}`;
    link.textContent = link.dataset.emailPrefix ? `${link.dataset.emailPrefix}${email}` : email;
  });
  const schema = document.querySelector('#business-schema');
  if (schema) {
    try {
      const data = JSON.parse(schema.textContent);
      const graph = data['@graph'] || [];
      const business = graph.find((item) => item['@type'] === 'AutoWash' || item['@type'] === 'AutomotiveBusiness');
      if (business) business.telephone = `+91${phone}`;
      if (business) business.email = email;
      schema.textContent = JSON.stringify(data);
    } catch {}
  }
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    if (node === schema) return;
    try {
      const data = JSON.parse(node.textContent);
      if (data['@id'] === 'https://gtscardetailing.shop/#business') {
        data.email = email;
        node.textContent = JSON.stringify(data);
      }
    } catch {}
  });
}

window.applyGTSSettings = applySettings;
applySettings({ phone: fallbackPhone, email: fallbackEmail });
fetch('/.netlify/functions/settings', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(applySettings)
  .catch(() => {});
