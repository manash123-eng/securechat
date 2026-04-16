/* auth.js */
const Auth = (() => {
  let _user = null;
  let _onAuth = null; // set by app.js

  const getUser = () => _user;
  const setUser = u => { _user = u; };
  const onAuthenticated = fn => { _onAuth = fn; };

  // ── Tab switch ────────────────────────────────────────────
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
      document.getElementById('login-error').classList.add('hidden');
      document.getElementById('register-error').classList.add('hidden');
    });
  });

  // ── Password toggles ──────────────────────────────────────
  document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.previousElementSibling;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.innerHTML = `<i class="fa-solid fa-eye${show ? '' : '-slash'}"></i>`;
    });
  });

  // ── Login ─────────────────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('login-btn');
    UI.setLoading(btn, true);
    try {
      const data = await API.login({
        email:    document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      });
      localStorage.setItem('sc_token', data.token);
      _user = data.user;
      _onAuth?.(data.user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      UI.setLoading(btn, false);
    }
  });

  // ── Register ──────────────────────────────────────────────
  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('register-btn');
    UI.setLoading(btn, true);
    try {
      const data = await API.register({
        username:    document.getElementById('reg-username').value.trim(),
        displayName: document.getElementById('reg-displayname').value.trim(),
        email:       document.getElementById('reg-email').value.trim(),
        password:    document.getElementById('reg-password').value,
      });
      localStorage.setItem('sc_token', data.token);
      _user = data.user;
      _onAuth?.(data.user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      UI.setLoading(btn, false);
    }
  });

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await API.logout(); } catch {}
    localStorage.removeItem('sc_token');
    SocketManager.disconnect();
    _user = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    UI.toast('Logged out', 'info');
  });

  // ── Restore session ───────────────────────────────────────
  const tryRestore = async () => {
    if (!localStorage.getItem('sc_token')) return null;
    try {
      const d = await API.getMe();
      _user = d.user;
      return d.user;
    } catch {
      localStorage.removeItem('sc_token');
      return null;
    }
  };

  // ── Profile modal ─────────────────────────────────────────
  document.getElementById('sidebar-user-btn').addEventListener('click', openProfile);

  function openProfile() {
    const u = _user;
    if (!u) return;
    document.getElementById('prof-name').value = u.displayName || '';
    document.getElementById('prof-status').value = u.status || '';
    // avatar
    const avEl = document.getElementById('profile-av');
    avEl.innerHTML = '';
    avEl.appendChild(u.avatar ? (() => { const i = document.createElement('img'); i.src = u.avatar; i.style.width = i.style.height = '100%'; i.style.objectFit = 'cover'; return i; })() : UI.initials(u, 80));
    UI.openModal('modal-profile');
  }

  document.getElementById('av-upload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const avEl = document.getElementById('profile-av');
      avEl.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover"/>`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-profile-btn');
    const fd = new FormData();
    fd.append('displayName', document.getElementById('prof-name').value.trim());
    fd.append('status',      document.getElementById('prof-status').value.trim());
    const avFile = document.getElementById('av-upload').files[0];
    if (avFile) fd.append('avatar', avFile);
    UI.setLoading(btn, true);
    try {
      const d = await API.updateProfile(fd);
      _user = d.user;
      updateSidebarMe(d.user);
      UI.closeModal('modal-profile');
      UI.toast('Profile saved!', 'success');
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // ── Theme toggle ──────────────────────────────────────────
  document.getElementById('theme-btn').addEventListener('click', async () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    UI.applyTheme(next);
    if (_user) {
      try {
        const fd = new FormData();
        fd.append('theme', next);
        await API.updateProfile(fd);
        _user.theme = next;
      } catch {}
    }
  });

  const updateSidebarMe = u => {
    document.getElementById('my-displayname').textContent = u.displayName || u.username;
    UI.setAvWrap('my-av-wrap', u, 38, false);
  };

  return { getUser, setUser, onAuthenticated, tryRestore, updateSidebarMe };
})();
