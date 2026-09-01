const N8N_CALLBACK_URL = 'https://n8n.srv1172262.hstgr.cloud/webhook/whatsapp-embedded-result';
const META_APP_ID = '4260497577614215';
const META_CONFIGURATION_ID = '1719559519101385';
const GRAPH_API_VERSION = 'v26.0';
const COEXISTENCE_FINISH_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';

const button = document.getElementById('connect-button');
const statusElement = document.getElementById('status');

let authorizationCode;
let sessionInfo;
let onboardingFinished = false;
let resultSent = false;
let completionEvent;
let completionVersion;

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
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  return data && typeof data === 'object' ? data : null;
}

function getSessionInfo(message) {
  if (!message || typeof message !== 'object') return undefined;
  if (message.data && typeof message.data === 'object') return message.data;
  return undefined;
}

function buildPayload() {
  const payload = {
    source: 'meta_whatsapp_embedded_signup',
    status: 'success',
    onboarding_type: 'coexistence',
    event: completionEvent,
    code: authorizationCode
  };

  if (completionVersion !== undefined) payload.version = completionVersion;

  if (sessionInfo && typeof sessionInfo === 'object') {
    if (sessionInfo.waba_id) payload.waba_id = sessionInfo.waba_id;
    if (sessionInfo.phone_number_id) payload.phone_number_id = sessionInfo.phone_number_id;
    if (sessionInfo.business_id) payload.business_id = sessionInfo.business_id;
    payload.session_info = sessionInfo;
  }

  return payload;
}

async function sendResultToN8n() {
  if (resultSent || !authorizationCode || !onboardingFinished) return;

  resultSent = true;
  setStatus('Salvataggio configurazione Coexistence...');

  try {
    if (!N8N_CALLBACK_URL.startsWith('https://')) {
      throw new Error('Webhook n8n HTTPS non configurato');
    }

    const response = await fetch(N8N_CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    if (!response.ok) {
      throw new Error('Risposta webhook non valida');
    }

    setStatus('✅ WhatsApp Coexistence collegato correttamente');
  } catch {
    resultSent = false;
    setStatus('Coexistence completato su Meta, ma non siamo riusciti a salvare la configurazione in n8n.');
  } finally {
    button.disabled = false;
  }
}

function trySendCompletedResult() {
  if (authorizationCode && onboardingFinished && !resultSent) {
    void sendResultToN8n();
  }
}

window.addEventListener('message', (event) => {
  if (!isTrustedMetaOrigin(event.origin)) return;

  const message = parseEmbeddedSignupMessage(event.data);
  if (!message || message.type !== 'WA_EMBEDDED_SIGNUP') return;

  if (message.event === COEXISTENCE_FINISH_EVENT) {
    onboardingFinished = true;
    completionEvent = message.event;
    completionVersion = message.version;
    sessionInfo = getSessionInfo(message);
    setStatus('Coexistence completato. Salvataggio...');
    trySendCompletedResult();
    return;
  }

  if (message.event === 'FINISH') {
    setStatus('È terminato un flusso WhatsApp standard, non il Coexistence. Riprova scegliendo il collegamento dell’app WhatsApp Business esistente.');
    button.disabled = false;
    return;
  }

  if (message.event === 'CANCEL') {
    setStatus('Collegamento annullato');
    button.disabled = false;
    return;
  }

  if (message.event === 'ERROR') {
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
  completionEvent = undefined;
  completionVersion = undefined;

  try {
    FB.login((response) => {
      if (response.authResponse && response.authResponse.code) {
        authorizationCode = response.authResponse.code;

        if (onboardingFinished) {
          setStatus('Coexistence completato. Salvataggio...');
        } else {
          setStatus('Autorizzazione ricevuta. Completa il collegamento della tua app WhatsApp Business...');
        }

        trySendCompletedResult();
      } else {
        setStatus('Collegamento annullato');
        button.disabled = false;
      }
    }, {
      config_id: META_CONFIGURATION_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
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
