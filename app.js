const N8N_CALLBACK_URL = 'https://n8n.srv1172262.hstgr.cloud/webhook/whatsapp-embedded-result';
const META_APP_ID = '4260497577614215';
const META_CONFIGURATION_ID = '1719559519101385';
const GRAPH_API_VERSION = 'v26.0';

const button = document.getElementById('connect-button');
const statusElement = document.getElementById('status');

let authorizationCode;
let sessionInfo;
let onboardingFinished = false;
let resultSent = false;
let sendTimer;

function setStatus(message) {
  statusElement.textContent = message;
}

function isTrustedMetaOrigin(origin) {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' &&
      (hostname === 'facebook.com' || hostname.endsWith('.facebook.com'));
  } catch {
    return false;
  }
}

function parseEmbeddedSignupMessage(data) {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data && typeof data === 'object' ? data : null;
}

function buildPayload() {
  const payload = {
    source: 'meta_whatsapp_embedded_signup',
    status: 'success'
  };

  if (authorizationCode) payload.code = authorizationCode;
  if (sessionInfo && typeof sessionInfo === 'object') {
    if (sessionInfo.waba_id) payload.waba_id = sessionInfo.waba_id;
    if (sessionInfo.phone_number_id) payload.phone_number_id = sessionInfo.phone_number_id;
    if (sessionInfo.business_id) payload.business_id = sessionInfo.business_id;
    payload.session_info = sessionInfo;
  }
  return payload;
}

async function sendResultToN8n() {
  if (resultSent || (!authorizationCode && !sessionInfo)) return;
  resultSent = true;
  clearTimeout(sendTimer);
  setStatus('Collegamento in corso...');

  try {
    if (!N8N_CALLBACK_URL.startsWith('https://')) {
      throw new Error('Webhook n8n HTTPS non configurato');
    }

    const response = await fetch(N8N_CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    if (!response.ok) throw new Error('Risposta webhook non valida');
    setStatus('✅ WhatsApp collegato correttamente');
  } catch {
    setStatus('Il collegamento Meta è stato completato, ma non siamo riusciti a salvare la configurazione.');
  } finally {
    authorizationCode = undefined;
    sessionInfo = undefined;
    button.disabled = false;
  }
}

function scheduleResultSend() {
  clearTimeout(sendTimer);
  if (authorizationCode && onboardingFinished) {
    void sendResultToN8n();
  } else {
    sendTimer = setTimeout(() => void sendResultToN8n(), 1500);
  }
}

window.addEventListener('message', (event) => {
  if (!isTrustedMetaOrigin(event.origin)) return;
  const message = parseEmbeddedSignupMessage(event.data);
  if (!message || message.type !== 'WA_EMBEDDED_SIGNUP') return;

  if (message.event === 'FINISH') {
    onboardingFinished = true;
    sessionInfo = message.data && typeof message.data === 'object' ? message.data : undefined;
    setStatus('Collegamento completato');
    scheduleResultSend();
  } else if (message.event === 'CANCEL') {
    clearTimeout(sendTimer);
    setStatus('Collegamento annullato');
    button.disabled = false;
  } else if (message.event === 'ERROR') {
    clearTimeout(sendTimer);
    setStatus('Errore durante il collegamento');
    button.disabled = false;
  }
});

window.fbAsyncInit = function () {
  try {
    FB.init({
      appId: META_APP_ID,
      cookie: true,
      xfbml: false,
      version: GRAPH_API_VERSION
    });
    button.disabled = false;
    setStatus('Pronto');
  } catch {
    setStatus('Errore durante il collegamento');
  }
};

button.addEventListener('click', () => {
  button.disabled = true;
  setStatus('Apertura Meta...');
  authorizationCode = undefined;
  sessionInfo = undefined;
  onboardingFinished = false;
  resultSent = false;

  try {
    FB.login((response) => {
      if (response.authResponse && response.authResponse.code) {
        authorizationCode = response.authResponse.code;
        setStatus('Collegamento in corso...');
        scheduleResultSend();
      } else {
        setStatus('Collegamento annullato');
        button.disabled = false;
      }
    }, {
      config_id: META_CONFIGURATION_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3'
      }
    });
  } catch {
    setStatus('Errore durante il collegamento');
    button.disabled = false;
  }
});

(function loadFacebookSdk(documentObject, tagName, id) {
  if (documentObject.getElementById(id)) return;
  const firstScript = documentObject.getElementsByTagName(tagName)[0];
  const sdkScript = documentObject.createElement(tagName);
  sdkScript.id = id;
  sdkScript.src = 'https://connect.facebook.net/it_IT/sdk.js';
  sdkScript.async = true;
  sdkScript.defer = true;
  sdkScript.crossOrigin = 'anonymous';
  sdkScript.onerror = () => setStatus('Errore durante il collegamento');
  firstScript.parentNode.insertBefore(sdkScript, firstScript);
})(document, 'script', 'facebook-jssdk');
