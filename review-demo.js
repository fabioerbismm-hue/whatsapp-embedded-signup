const META_APP_ID = '4260497577614215';
const GRAPH_API_VERSION = 'v26.0';

const loginButton = document.getElementById('login-button');
const statusElement = document.getElementById('status');
const resultPanel = document.getElementById('result-panel');
const permissionStatus = document.getElementById('permission-status');
const businessList = document.getElementById('business-list');
const businessCount = document.getElementById('business-count');

const stepLogin = document.getElementById('step-login');
const stepPermission = document.getElementById('step-permission');
const stepBusinesses = document.getElementById('step-businesses');

function setStatus(message, type = '') {
  statusElement.textContent = message;
  statusElement.className = 'status' + (type ? ' ' + type : '');
}

function setStep(step, state) {
  step.classList.remove('active', 'done');
  if (state) step.classList.add(state);
}

function resetResult() {
  resultPanel.hidden = true;
  permissionStatus.textContent = 'Checking…';
  businessCount.textContent = '';
  businessList.replaceChildren();
  setStep(stepLogin, 'active');
  setStep(stepPermission, '');
  setStep(stepBusinesses, '');
}

function checkPermission() {
  return new Promise((resolve, reject) => {
    FB.api('/me/permissions', 'GET', (response) => {
      if (!response || response.error) {
        reject(new Error(response?.error?.message || 'Unable to verify permissions.'));
        return;
      }

      const permission = (response.data || []).find(
        (item) => item.permission === 'business_management'
      );

      if (!permission || permission.status !== 'granted') {
        reject(new Error('business_management was not granted.'));
        return;
      }

      resolve(permission);
    });
  });
}

function loadBusinesses() {
  return new Promise((resolve, reject) => {
    FB.api('/me/businesses', 'GET', { fields: 'id,name', limit: 100 }, (response) => {
      if (!response || response.error) {
        reject(new Error(response?.error?.message || 'Unable to load Business Portfolios.'));
        return;
      }

      resolve(response.data || []);
    });
  });
}

function renderBusinesses(businesses) {
  businessList.replaceChildren();
  businessCount.textContent = businesses.length + (businesses.length === 1 ? ' portfolio' : ' portfolios');

  if (!businesses.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No Business Portfolios are available for this Facebook account.';
    businessList.appendChild(empty);
    return;
  }

  businesses.forEach((business) => {
    const item = document.createElement('article');
    item.className = 'business-item';

    const icon = document.createElement('div');
    icon.className = 'business-icon';
    icon.textContent = 'B';

    const copy = document.createElement('div');

    const name = document.createElement('strong');
    name.textContent = business.name || 'Business Portfolio';

    const id = document.createElement('small');
    id.textContent = 'Business ID: ' + business.id;

    copy.append(name, id);
    item.append(icon, copy);
    businessList.appendChild(item);
  });
}

async function handleSuccessfulLogin() {
  try {
    setStep(stepLogin, 'done');
    setStep(stepPermission, 'active');
    setStatus('Verifying business_management permission…');

    await checkPermission();

    permissionStatus.textContent = 'Granted ✓';
    setStep(stepPermission, 'done');
    setStep(stepBusinesses, 'active');
    setStatus('Loading authorized Business Portfolios…');

    const businesses = await loadBusinesses();
    renderBusinesses(businesses);

    resultPanel.hidden = false;
    setStep(stepBusinesses, 'done');
    setStatus('Business Portfolio access completed successfully.', 'success');
  } catch (error) {
    resultPanel.hidden = true;
    setStatus(error.message, 'error');
    setStep(stepPermission, 'active');
  } finally {
    loginButton.disabled = false;
  }
}

window.fbAsyncInit = function () {
  try {
    FB.init({
      appId: META_APP_ID,
      cookie: true,
      xfbml: false,
      version: GRAPH_API_VERSION
    });

    loginButton.disabled = false;
    setStatus('Ready. Click “Continue with Facebook” to start.');
  } catch {
    setStatus('Unable to initialize Meta Login.', 'error');
  }
};

loginButton.addEventListener('click', () => {
  resetResult();
  loginButton.disabled = true;
  setStatus('Opening Meta Login…');

  try {
    FB.login(
      (response) => {
        if (!response || !response.authResponse) {
          loginButton.disabled = false;
          setStatus('Meta Login was cancelled or not completed.', 'error');
          return;
        }

        void handleSuccessfulLogin();
      },
      {
        scope: 'business_management',
        return_scopes: true,
        auth_type: 'rerequest'
      }
    );
  } catch {
    loginButton.disabled = false;
    setStatus('Unable to open Meta Login.', 'error');
  }
});

(function loadFacebookSdk(documentObject, tagName, id) {
  if (documentObject.getElementById(id)) return;

  const firstScript = documentObject.getElementsByTagName(tagName)[0];
  const sdkScript = documentObject.createElement(tagName);

  sdkScript.id = id;
  sdkScript.src = 'https://connect.facebook.net/en_US/sdk.js';
  sdkScript.async = true;
  sdkScript.defer = true;
  sdkScript.crossOrigin = 'anonymous';
  sdkScript.onerror = () => setStatus('Unable to load Meta SDK.', 'error');

  firstScript.parentNode.insertBefore(sdkScript, firstScript);
})(document, 'script', 'facebook-jssdk');
