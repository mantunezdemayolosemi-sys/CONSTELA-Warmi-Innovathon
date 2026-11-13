import { createDiscovery } from './discovery.js';
import { createExplorer } from './explore.js';

const $ = (id) => document.getElementById(id);
let currentUser = null;
let spaceEpoch = 0;
let refreshPromise = null;
const loginForm = $('login-form');
const registerForm = $('register-form');
const profileForm = $('profile-form');
const password = $('register-password');
const confirmation = $('register-confirm');

// Supabase puede volver con tokens en el fragmento. La interfaz usa cookies
// del servidor: no lee ni conserva esos tokens en JavaScript o en la URL.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
$('year').textContent = String(new Date().getFullYear());

async function send(path, { method = 'GET', body, refresh = false } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401 && refresh && data?.error === 'SESSION_EXPIRED') {
    if (!refreshPromise) {
      refreshPromise = send('/web/refresh', { method: 'POST', body: {} }).finally(() => { refreshPromise = null; });
    }
    await refreshPromise;
    return send(path, { method, body });
  }
  if (!response.ok) {
    const error = new Error(data?.message || 'No pudimos completar la operación. Inténtalo otra vez.');
    error.status = response.status;
    throw error;
  }
  return data;
}

const discovery = createDiscovery({
  send,
  showAccount: () => renderAccount(currentUser),
  showOpportunities: () => goSpace('/oportunidades'),
  sessionExpired: () => {
    renderMode('login');
    showAuthError('Tu sesión terminó. Inicia sesión otra vez para continuar tu misión.');
  },
});
const explorer = createExplorer({
  send, showAccount: () => renderAccount(currentUser),
  showDiscovery: () => goSpace('/descubrir'), showOpportunities: () => goSpace('/oportunidades'),
  navigate: path => { changeAddress(path); activateSpace(path); },
  sessionExpired: () => { renderMode('login'); showAuthError('Tu sesión terminó. Inicia sesión para continuar.'); },
});

function activateSpace(path) {
  document.querySelectorAll('#member-nav a').forEach(link => {
    if (link.dataset.space === path) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}
async function goSpace(path) {
  if (!currentUser || explorer.isSaving()) return;
  const active = ++spaceEpoch;
  if (path === '/cuenta') return renderAccount(currentUser);
  discovery.close(); explorer.close();
  if (path === '/galaxias') return explorer.openGalaxies();
  if (path === '/oportunidades') return explorer.openOpportunities();
  try {
    const { interests } = await send('/web/interests', {refresh:true});
    if (!currentUser || active !== spaceEpoch) return;
    if (!interests) return explorer.openGalaxies({onboarding:true});
    activateSpace('/descubrir'); await discovery.open();
  } catch(error) {
    if (active !== spaceEpoch) return;
    if (error.status===401) { renderMode('login'); showAuthError('Inicia sesión para continuar.'); }
    else await explorer.openGalaxies({onboarding:true});
  }
}
async function enter(data, { path = '/descubrir' } = {}) {
  renderAccount(data);
  if (path !== '/cuenta') await goSpace(['/galaxias','/oportunidades'].includes(path)?path:'/descubrir');
}
$('open-discovery').addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  goSpace('/descubrir');
});
document.querySelectorAll('[data-space]').forEach(link => link.addEventListener('click',event=>{
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); goSpace(link.dataset.space);
}));

function busy(form, active, label) {
  const button = form.querySelector('button[type=submit]');
  button.disabled = active;
  button.setAttribute('aria-busy', String(active));
  button.querySelector('span').textContent = label;
}

function showAuthError(message) {
  $('auth-error').textContent = message;
  $('auth-error').hidden = false;
}

function changeAddress(path, replace = false) {
  if (location.pathname + location.search !== path) {
    history[replace ? 'replaceState' : 'pushState'](null, '', path);
  }
}

function renderMode(mode, { navigate = true, focus = false } = {}) {
  spaceEpoch++;
  discovery.reset();
  explorer.reset();
  $('member-nav').hidden = true;
  const isRegister = mode === 'register';
  currentUser = null;
  $('account-view').hidden = true;
  $('logout').hidden = true;
  $('story').hidden = false;
  $('auth-card').hidden = false;
  $('main').classList.remove('account-layout');
  $('auth-card').classList.toggle('register', isRegister);
  $('mode-switch').hidden = false;
  $('card-intro').hidden = false;
  $('feedback-panel').hidden = true;
  $('auth-error').hidden = true;
  loginForm.hidden = isRegister;
  registerForm.hidden = !isRegister;
  $('form-title').textContent = isRegister ? 'Tu historia empieza aquí.' : 'Qué bueno verte.';
  $('form-description').textContent = isRegister ? 'Crea tu cuenta y da el primer paso.' : 'Ingresa a tu cuenta para continuar.';
  document.querySelectorAll('.mode-switch a').forEach(link => {
    if (link.dataset.mode === mode) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${isRegister ? 'Crear cuenta' : 'Iniciar sesión'} · Constela`;
  if (navigate) changeAddress(isRegister ? '/registro' : '/ingresar');
  if (focus) $('form-title').focus({ preventScroll: true });
}

function renderFeedback(kind, message) {
  renderMode('login', { navigate: false });
  $('mode-switch').hidden = true;
  $('card-intro').hidden = true;
  loginForm.hidden = true;
  registerForm.hidden = true;
  $('feedback-panel').hidden = false;
  const confirmationPage = kind === 'confirmed';
  const failed = kind === 'error';
  $('feedback-icon').textContent = confirmationPage ? '✦' : failed ? '↗' : '✉';
  $('feedback-title').textContent = confirmationPage ? 'Sigamos con tu historia.' : failed ? 'Volvamos a intentarlo.' : 'Revisa tu correo.';
  $('feedback-description').textContent = message;
  $('feedback-hint').textContent = confirmationPage
    ? 'Inicia sesión con el correo y la contraseña que elegiste al registrarte.'
    : failed
      ? 'Si el enlace venció o ya fue utilizado, intenta iniciar sesión. Si aún no confirmaste tu correo, vuelve a registrarte con el mismo correo para solicitar un nuevo enlace.'
      : 'Revisa también tu carpeta de spam. Abre el enlace de confirmación y luego vuelve para iniciar sesión.';
  document.title = 'Tu cuenta · Constela';
  $('feedback-title').focus({ preventScroll: true });
}

function renderAccount(data) {
  spaceEpoch++;
  discovery.close();
  explorer.close();
  currentUser = data;
  $('member-nav').hidden = false;
  activateSpace('/cuenta');
  $('auth-card').hidden = true;
  $('story').hidden = true;
  $('account-view').hidden = false;
  $('logout').hidden = false;
  $('main').classList.add('account-layout');
  const name = data.profile.display_name;
  $('greeting-name').textContent = name.trim().split(/\s+/)[0];
  $('profile-avatar').textContent = Array.from(name.trim())[0]?.toUpperCase() || 'C';
  $('profile-name').value = name;
  $('profile-email').value = data.user.email;
  $('profile-notice').hidden = true;
  document.title = 'Tu espacio · Constela';
  changeAddress('/cuenta', true);
}

document.querySelectorAll('[data-mode]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (document.querySelector('.auth-form button[aria-busy=true]')) return;
    renderMode(link.dataset.mode, { focus: true });
  });
});

document.querySelectorAll('[data-password]').forEach(button => {
  button.addEventListener('click', () => {
    const field = $(button.dataset.password);
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

function validatePasswords() {
  confirmation.setCustomValidity(confirmation.value && password.value !== confirmation.value ? 'Las contraseñas deben coincidir.' : '');
  const valid = password.value.length >= 12;
  $('password-help').textContent = valid ? 'Tu contraseña cumple con el mínimo de 12 caracteres.' : 'Usa una frase de al menos 12 caracteres.';
  $('password-help').classList.toggle('valid', valid);
}
password.addEventListener('input', validatePasswords);
confirmation.addEventListener('input', validatePasswords);

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  $('auth-error').hidden = true;
  busy(loginForm, true, 'Entrando…');
  try {
    await send('/web/login', { method: 'POST', body: Object.fromEntries(new FormData(loginForm)) });
    await enter(await send('/web/session', { refresh: true }));
    loginForm.reset();
  } catch (error) { showAuthError(error.message); }
  finally { busy(loginForm, false, 'Iniciar sesión'); }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  validatePasswords();
  if (!registerForm.reportValidity()) return;
  $('auth-error').hidden = true;
  busy(registerForm, true, 'Creando tu cuenta…');
  try {
    const { name, email, password } = Object.fromEntries(new FormData(registerForm));
    const data = await send('/web/register', { method: 'POST', body: { name, email, password } });
    registerForm.reset();
    validatePasswords();
    changeAddress('/registro?enviado=1');
    renderFeedback('email', data.message);
  } catch (error) { showAuthError(error.message); }
  finally { busy(registerForm, false, 'Crear mi cuenta'); }
});

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  busy(profileForm, true, 'Guardando…');
  $('profile-notice').hidden = true;
  try {
    const data = await send('/web/profile', { method: 'PATCH', body: { name: $('profile-name').value }, refresh: true });
    renderAccount({ user: currentUser.user, profile: data.profile });
    $('profile-notice').classList.remove('error-notice');
    $('profile-notice').textContent = 'Listo. Guardamos los cambios de tu perfil.';
    $('profile-notice').hidden = false;
  } catch (error) {
    if (error.status === 401) {
      profileForm.reset();
      renderMode('login');
      showAuthError('Tu sesión terminó. Inicia sesión otra vez para continuar.');
    } else {
      $('profile-notice').classList.add('error-notice');
      $('profile-notice').textContent = error.message;
      $('profile-notice').hidden = false;
    }
  } finally { busy(profileForm, false, 'Guardar cambios'); }
});

$('logout').addEventListener('click', async () => {
  $('logout').disabled = true;
  try {
    await send('/web/logout', { method: 'POST', body: {} });
    [loginForm, registerForm, profileForm].forEach(form => form.reset());
    $('greeting-name').textContent = '';
    renderMode('login', { focus: true });
  } catch (error) {
    const notice = !$('explore-view').hidden ? $('explore-error') : $('discovery-view').hidden ? $('profile-notice') : $('discovery-error');
    notice.textContent = error.message;
    notice.classList.add('error-notice');
    notice.hidden = false;
  } finally { $('logout').disabled = false; }
});

function renderLocation() {
  if (currentUser) {
    goSpace(location.pathname);
    return;
  }
  const query = new URLSearchParams(location.search);
  if (location.pathname === '/confirmacion') {
    const failed = query.get('estado') === 'error' || query.has('error');
    renderFeedback(failed ? 'error' : 'confirmed', failed ? 'No pudimos completar la confirmación desde ese enlace.' : 'Si acabas de confirmar tu correo, ya puedes iniciar sesión en Constela.');
  } else if (location.pathname === '/registro' && query.has('enviado')) {
    renderFeedback('email', 'Si tu correo puede registrarse, recibirás un enlace para confirmar tu cuenta. Si ya tienes cuenta, inicia sesión.');
  } else { renderMode(location.pathname === '/registro' ? 'register' : 'login', { navigate: false }); }
}
window.addEventListener('popstate', renderLocation);
renderLocation();

try { const path=location.pathname; await enter(await send('/web/session', { refresh: true }), { path }); }
catch (error) {
  if (error.status !== 401) showAuthError(error.message);
  else if (['/cuenta', '/descubrir', '/galaxias', '/oportunidades'].includes(location.pathname)) {
    renderMode('login', { navigate: true });
    showAuthError('Inicia sesión para entrar a tu espacio.');
  }
}
