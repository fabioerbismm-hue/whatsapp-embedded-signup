const ENDPOINTS = {
  businesses: 'https://n8n.srv1172262.hstgr.cloud/webhook/review-businesses',
  'whatsapp-account': 'https://n8n.srv1172262.hstgr.cloud/webhook/review-whatsapp-account',
  'send-test': 'https://n8n.srv1172262.hstgr.cloud/webhook/review-send-test'
};

const labels = {
  businesses: 'Business Portfolio',
  'whatsapp-account': 'WhatsApp Business Account',
  'send-test': 'Messaggio WhatsApp'
};

function sanitizeForDisplay(value) {
  if (Array.isArray(value)) return value.map(sanitizeForDisplay);
  if (!value || typeof value !== 'object') return value;

  const blockedKeys = new Set([
    'access_token',
    'token',
    'app_secret',
    'client_secret',
    'authorization',
    'code'
  ]);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedKeys.has(String(key).toLowerCase()))
      .map(([key, item]) => [key, sanitizeForDisplay(item)])
  );
}

function formatResult(data) {
  return JSON.stringify(sanitizeForDisplay(data), null, 2);
}

async function runAction(action, button) {
  const result = document.getElementById(`result-${action}`);
  const endpoint = ENDPOINTS[action];

  button.disabled = true;
  result.textContent = `Esecuzione test: ${labels[action]}...`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'meta_app_review_demo', action })
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() };

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    result.textContent = `✅ TEST COMPLETATO\n${formatResult(payload)}`;
  } catch (error) {
    result.textContent = `❌ TEST NON DISPONIBILE\n${error.message}\n\nVerificare che il webhook n8n di review sia attivo.`;
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => runAction(button.dataset.action, button));
});
