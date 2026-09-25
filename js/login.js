/* ==========================================================================
   Login / Create Account logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.seedIfNeeded();

  // If already logged in, skip straight to dashboard
  if (AGMS.auth.getSession()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function showTab(name) {
    const isLogin = name === 'login';
    tabLoginBtn.classList.toggle('active', isLogin);
    tabRegisterBtn.classList.toggle('active', !isLogin);
    loginForm.classList.toggle('active', isLogin);
    registerForm.classList.toggle('active', !isLogin);
  }

  tabLoginBtn.addEventListener('click', () => showTab('login'));
  tabRegisterBtn.addEventListener('click', () => showTab('register'));
  document.querySelectorAll('[data-switch]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); showTab(el.dataset.switch); });
  });

  // Password visibility toggles
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('i');
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      icon.className = isPwd ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  });

  // Demo fill
  document.getElementById('demoFillBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginEmail').value = 'admin@agms.com';
    document.getElementById('loginPassword').value = 'admin123';
    AGMS.toast('Demo credentials filled in.', 'info');
  });

  function setError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    input.classList.toggle('invalid', !!message);
    err.textContent = message || '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* --------------------------------- Login --------------------------------- */

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    setError('loginEmail', 'loginEmailError', '');
    setError('loginPassword', 'loginPasswordError', '');

    let hasError = false;
    if (!email) { setError('loginEmail', 'loginEmailError', 'Email is required.'); hasError = true; }
    else if (!isValidEmail(email)) { setError('loginEmail', 'loginEmailError', 'Enter a valid email address.'); hasError = true; }

    if (!password) { setError('loginPassword', 'loginPasswordError', 'Password is required.'); hasError = true; }

    if (hasError) {
      document.getElementById('authCard').classList.add('shake');
      setTimeout(() => document.getElementById('authCard').classList.remove('shake'), 400);
      return;
    }

    const btn = loginForm.querySelector('.btn-submit');
    btn.classList.add('loading');
    btn.querySelector('span').textContent = 'Signing in…';

    setTimeout(() => {
      const result = AGMS.auth.login(email, password);
      if (!result.ok) {
        btn.classList.remove('loading');
        btn.querySelector('span').textContent = 'Sign In';
        setError('loginPassword', 'loginPasswordError', result.message);
        document.getElementById('authCard').classList.add('shake');
        setTimeout(() => document.getElementById('authCard').classList.remove('shake'), 400);
        AGMS.toast(result.message, 'error');
        return;
      }
      AGMS.toast('Welcome back! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 500);
    }, 450);
  });

  /* ------------------------------- Register --------------------------------- */

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    ['regName', 'regEmail', 'regPassword', 'regConfirm'].forEach(id => setError(id, id + 'Error', ''));

    let hasError = false;
    if (!name || name.length < 2) { setError('regName', 'regNameError', 'Enter your full name.'); hasError = true; }
    if (!email) { setError('regEmail', 'regEmailError', 'Email is required.'); hasError = true; }
    else if (!isValidEmail(email)) { setError('regEmail', 'regEmailError', 'Enter a valid email address.'); hasError = true; }

    if (!password || password.length < 6) { setError('regPassword', 'regPasswordError', 'Minimum 6 characters required.'); hasError = true; }
    if (confirm !== password) { setError('regConfirm', 'regConfirmError', 'Passwords do not match.'); hasError = true; }

    if (hasError) {
      document.getElementById('authCard').classList.add('shake');
      setTimeout(() => document.getElementById('authCard').classList.remove('shake'), 400);
      return;
    }

    const btn = registerForm.querySelector('.btn-submit');
    btn.classList.add('loading');
    btn.querySelector('span').textContent = 'Creating account…';

    setTimeout(() => {
      const result = AGMS.auth.register(name, email, password);
      btn.classList.remove('loading');
      btn.querySelector('span').textContent = 'Create Account';

      if (!result.ok) {
        setError('regEmail', 'regEmailError', result.message);
        AGMS.toast(result.message, 'error');
        return;
      }

      AGMS.toast('Account created! Please sign in.', 'success');
      registerForm.reset();
      showTab('login');
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').focus();
    }, 450);
  });
});
