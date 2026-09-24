(() => {
  'use strict';

  const sessionKey = 'velvet-plate-admin-auth';
  // Kept in sync with the Admin Console credentials.
  const username = 'admin123';
  const password = 'admin123';

  const unlock = () => {
    document.body.classList.remove('staff-locked');
    document.querySelector('.staff-auth-gate')?.remove();
  };

  if (sessionStorage.getItem(sessionKey) === 'true') {
    unlock();
    return;
  }

  const gate = document.createElement('section');
  gate.className = 'staff-auth-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'staff-auth-title');
  gate.innerHTML = `
    <div class="staff-auth-card">
      <span class="staff-lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <p class="eyebrow">Taste Africa staff</p>
      <h1 id="staff-auth-title">Staff access</h1>
      <p>Sign in with the same credentials used for the Admin Console.</p>
      <form class="staff-auth-form">
        <label>Username<input name="username" autocomplete="username" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        <p class="staff-auth-error" aria-live="polite"></p>
        <button class="staff-auth-submit" type="submit">Unlock panel</button>
      </form>
    </div>`;

  document.body.append(gate);
  const form = gate.querySelector('form');
  const usernameField = form.elements.username;
  const passwordField = form.elements.password;
  const error = gate.querySelector('.staff-auth-error');
  usernameField.focus();

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (usernameField.value.trim() === username && passwordField.value === password) {
      sessionStorage.setItem(sessionKey, 'true');
      unlock();
      return;
    }
    error.textContent = 'Incorrect username or password.';
    passwordField.value = '';
    passwordField.focus();
  });
})();
