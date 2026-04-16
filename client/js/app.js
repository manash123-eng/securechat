/* app.js — Bootstrap */
(async () => {
  // ── Emoji picker setup ────────────────────────────────────
  UI.initEmoji(emoji => {
    const inp = document.getElementById('msg-input');
    const s = inp.selectionStart, e2 = inp.selectionEnd;
    inp.value = inp.value.slice(0, s) + emoji + inp.value.slice(e2);
    inp.selectionStart = inp.selectionEnd = s + emoji.length;
    inp.focus();
  });

  // ── Show app after login ──────────────────────────────────
  const boot = async (user) => {
    UI.applyTheme(user.theme || 'dark');
    Auth.updateSidebarMe(user);

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Connect socket FIRST before loading chats
    const token = localStorage.getItem('sc_token');
    SocketManager.connect(token);

    // Wire up socket → chat events
    SocketManager.on('user:status', ({ userId, isOnline, lastSeen }) => {
      ChatManager.updateUserStatus(userId, isOnline, lastSeen);
    });

    SocketManager.on('notification:new', ({ sender, preview }) => {
      UI.toast(`💬 ${sender}: ${preview}`, 'info', 4500);
      if (Notification.permission === 'granted') {
        try { new Notification(`SecureChat — ${sender}`, { body: preview }); } catch {}
      }
    });

    SocketManager.on('reconnected', () => {
      // Re-join active chat room after reconnect
      const chatId = ChatManager.getActiveChatId();
      if (chatId) SocketManager.joinChat(chatId);
    });

    await ChatManager.loadChats();

    // Request notification permission politely
    if (Notification?.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 3000);
    }
  };

  // ── Hook into auth callbacks ──────────────────────────────
  Auth.onAuthenticated(async (user) => {
    await boot(user);
  });

  // ── Try restore session ───────────────────────────────────
  const user = await Auth.tryRestore();
  if (user) await boot(user);

  // ── Responsive ───────────────────────────────────────────
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      document.getElementById('sidebar').classList.remove('slide-out');
    }
  });

  // ── Mark read when tab comes to focus ────────────────────
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const chatId = MessageManager.getCurrentChatId();
      if (chatId) API.markAsRead(chatId).catch(() => {});
    }
  });

  console.log('🔐 SecureChat ready');
})();
