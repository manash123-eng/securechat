/* ui.js */
const UI = (() => {
  // ── Toasts ────────────────────────────────────────────────
  const toast = (msg, type = 'info', ms = 3500) => {
    const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${esc(msg)}</span>`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 280); }, ms);
  };

  // ── Modals ────────────────────────────────────────────────
  const openModal  = id => document.getElementById(id)?.classList.remove('hidden');
  const closeModal = id => document.getElementById(id)?.classList.add('hidden');

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-close]');
    if (t) closeModal(t.dataset.close);
    if (!e.target.closest('#ctx-menu')) hideCtx();
    if (!e.target.closest('#emoji-picker') && !e.target.closest('#emoji-btn'))
      document.getElementById('emoji-picker').classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
      document.getElementById('emoji-picker').classList.add('hidden');
      hideCtx();
    }
  });

  // ── Context menu ──────────────────────────────────────────
  const showCtx = (x, y, items) => {
    const m = document.getElementById('ctx-menu');
    const ul = document.getElementById('ctx-list');
    ul.innerHTML = '';
    items.forEach(({ label, icon, action, danger }) => {
      const li = document.createElement('li');
      li.className = danger ? 'danger' : '';
      li.innerHTML = `<i class="fa-solid ${icon}"></i>${label}`;
      li.onclick = () => { action(); hideCtx(); };
      ul.appendChild(li);
    });
    m.classList.remove('hidden');
    const rect = m.getBoundingClientRect();
    m.style.left = (x + rect.width > window.innerWidth ? x - rect.width : x) + 'px';
    m.style.top  = (y + rect.height > window.innerHeight ? y - rect.height : y) + 'px';
  };
  const hideCtx = () => document.getElementById('ctx-menu').classList.add('hidden');

  // ── Avatars ───────────────────────────────────────────────
  const COLORS = ['#25d366','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#10b981'];
  const getColor = name => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

  const makeAv = (user, size = 42) => {
    const wrap = document.createElement('div');
    wrap.className = `av-wrap${size < 40 ? ' sm' : ''}`;
    wrap.style.width = wrap.style.height = size + 'px';

    if (user?.avatar) {
      const img = document.createElement('img');
      img.src = user.avatar; img.className = 'av'; img.alt = '';
      img.onerror = () => { img.replaceWith(initials(user, size)); };
      wrap.appendChild(img);
    } else {
      wrap.appendChild(initials(user, size));
    }
    return wrap;
  };

  const initials = (user, size = 42) => {
    const div = document.createElement('div');
    div.className = 'av-initials';
    div.style.cssText = `width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px;background:${getColor(user?.displayName||user?.username)}`;
    div.textContent = (user?.displayName || user?.username || '?').charAt(0).toUpperCase();
    return div;
  };

  const setAvWrap = (containerId, user, size = 42, showOnline = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const wrap = makeAv(user, size);
    if (showOnline && user?.isOnline) {
      const dot = document.createElement('div');
      dot.className = 'online-ring';
      wrap.appendChild(dot);
    }
    container.appendChild(wrap);
  };

  // ── Time formatters ───────────────────────────────────────
  const fmtTime = d => new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  const fmtDate = d => {
    const date = new Date(d), now = new Date();
    const diff = now - date;
    if (diff < 86400000 && date.getDate() === now.getDate()) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month:'short', day:'numeric' });
  };

  const fmtLastSeen = d => {
    if (!d) return '';
    const diff = Date.now() - new Date(d);
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `today at ${fmtTime(d)}`;
    return `${fmtDate(d)} at ${fmtTime(d)}`;
  };

  const fmtSize = b => {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  };

  // ── Helpers ───────────────────────────────────────────────
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const linkify = t => esc(t).replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const setLoading = (btn, on) => {
    if (on) { btn._orig = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true; }
    else { btn.innerHTML = btn._orig || ''; btn.disabled = false; }
  };

  const applyTheme = theme => {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerHTML = `<i class="fa-solid fa-${theme==='dark'?'sun':'moon'}"></i>`;
  };

  // ── Emoji picker ──────────────────────────────────────────
  const EMOJIS = ['😀','😂','🥰','😍','😊','😎','🤔','😅','🥺','😭','😡','🤯','😴','🥳','👍','👎','👏','🙌','🤝','🙏','❤️','🔥','⭐','✨','🎉','🎊','🚀','💯','✅','❌','😂','🤣','💀','👀','💪','🫡','🫶','🤗','😏','🥴','🤡','💔','💕','🙃','🫠','😤','🤫','🫢','🥸','😇'];
  const initEmoji = (onSelect) => {
    const grid = document.getElementById('emoji-grid');
    grid.innerHTML = '';
    EMOJIS.forEach(e => {
      const b = document.createElement('button');
      b.className = 'em-btn'; b.textContent = e;
      b.onclick = () => { onSelect(e); document.getElementById('emoji-picker').classList.add('hidden'); };
      grid.appendChild(b);
    });
    document.getElementById('emoji-btn').addEventListener('click', ev => {
      const p = document.getElementById('emoji-picker');
      p.classList.toggle('hidden');
      if (!p.classList.contains('hidden')) {
        const r = ev.currentTarget.getBoundingClientRect();
        p.style.left = r.left + 'px';
        p.style.bottom = (window.innerHeight - r.top + 6) + 'px';
        p.style.top = 'auto';
      }
      ev.stopPropagation();
    });
  };

  return {
    toast, openModal, closeModal, showCtx, hideCtx,
    makeAv, initials, setAvWrap, getColor,
    fmtTime, fmtDate, fmtLastSeen, fmtSize,
    esc, linkify, debounce, setLoading, applyTheme, initEmoji
  };
})();
