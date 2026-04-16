/* socket.js */
const SocketManager = (() => {
  let socket = null;
  const _handlers = {};

  const connect = (token) => {
    if (socket?.connected) return socket;

    socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      _emit('connected');
      document.getElementById('conn-status')?.classList.add('hidden');
    });

    socket.on('disconnect', reason => {
      console.warn('🔴 Disconnected:', reason);
      _emit('disconnected', reason);
    });

    socket.on('reconnecting', () => {
      document.getElementById('conn-status')?.classList.remove('hidden');
    });

    socket.on('reconnect', () => {
      document.getElementById('conn-status')?.classList.add('hidden');
      _emit('reconnected');
    });

    socket.on('connect_error', err => {
      console.error('Socket error:', err.message);
      document.getElementById('conn-status')?.classList.remove('hidden');
    });

    // Forward all app events
    [
      'message:new','message:edited','message:deleted',
      'message:read','message:delivered','message:reacted',
      'typing:start','typing:stop',
      'user:status','notification:new'
    ].forEach(ev => socket.on(ev, d => _emit(ev, d)));

    return socket;
  };

  const disconnect = () => { socket?.disconnect(); socket = null; };

  const on  = (ev, fn) => { (_handlers[ev] = _handlers[ev] || []).push(fn); return () => off(ev, fn); };
  const off = (ev, fn) => { if (_handlers[ev]) _handlers[ev] = _handlers[ev].filter(h => h !== fn); };
  const _emit = (ev, d) => (_handlers[ev] || []).forEach(h => { try { h(d); } catch(e){ console.error(e); }});

  const emit = (ev, d, cb) => {
    if (!socket?.connected) { console.warn('Socket not connected, cannot emit:', ev); return; }
    socket.emit(ev, d, cb);
  };

  return {
    connect, disconnect, on, off,
    joinChat:       id      => emit('chat:join', { chatId: id }),
    sendMessage:    (d, cb) => emit('message:send', d, cb),
    typingStart:    id      => emit('typing:start', { chatId: id }),
    typingStop:     id      => emit('typing:stop',  { chatId: id }),
    markRead:       (id, ids) => emit('message:read', { chatId: id, messageIds: ids }),
    editMessage:    (mid, c, cb) => emit('message:edit',   { messageId: mid, content: c }, cb),
    deleteMessage:  (mid, fe, cb)=> emit('message:delete', { messageId: mid, forEveryone: fe }, cb),
    reactToMessage: (mid, emoji) => emit('message:react',  { messageId: mid, emoji }),
    isConnected:    () => !!socket?.connected,
  };
})();
