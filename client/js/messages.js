/* messages.js */
const MessageManager = (() => {
  let _msgs = [];
  let _chatId = null;
  let _replyTo = null;
  let _editId = null;
  let _typingTimer = null;
  let _isTyping = false;
  const _typers = new Map();

  const getCurrentChatId = () => _chatId;

  // ── Load messages ─────────────────────────────────────────
  const loadMessages = async (chatId) => {
    _chatId = chatId;
    _msgs = [];
    _replyTo = null;
    _editId = null;
    cancelReply();

    const list = document.getElementById('msgs-list');
    list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t3)"><i class="fa-solid fa-spinner fa-spin" style="font-size:22px"></i></div>`;

    try {
      const d = await API.getMessages(chatId, '?page=1&limit=50');
      _msgs = d.messages || [];
      list.innerHTML = '';

      if (!_msgs.length) {
        list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--t3);font-size:13px">No messages yet — say hello! 👋</div>`;
        return;
      }

      renderAll(_msgs);
      scrollBottom(false);

      // Mark unread as read
      const me = Auth.getUser();
      const unread = _msgs.filter(m => m.sender?._id !== me?._id && !m.readBy?.some(r => r.user === me?._id || r.user?._id === me?._id));
      if (unread.length) SocketManager.markRead(chatId, unread.map(m => m._id));

    } catch (err) {
      list.innerHTML = `<div style="text-align:center;padding:48px;color:var(--red);font-size:13px">Failed to load messages.<br><small>${UI.esc(err.message)}</small></div>`;
    }
  };

  // ── Render all ────────────────────────────────────────────
  const renderAll = (msgs) => {
    const list = document.getElementById('msgs-list');
    let lastDate = null, lastSenderId = null;
    msgs.forEach(m => {
      const d = UI.fmtDate(m.createdAt);
      if (d !== lastDate) { list.appendChild(makeDateDiv(d)); lastDate = d; lastSenderId = null; }
      const consec = lastSenderId === (m.sender?._id || m.sender) && m.type !== 'system';
      const el = makeMsgEl(m, consec);
      if (el) list.appendChild(el);
      lastSenderId = m.sender?._id || m.sender;
    });
  };

  const makeDateDiv = (text) => {
    const el = document.createElement('div');
    el.className = 'date-div';
    el.innerHTML = `<span>${text}</span>`;
    return el;
  };

  // ── Build message element ─────────────────────────────────
  const makeMsgEl = (msg, consec = false) => {
    const me = Auth.getUser();
    if (msg.type === 'system') {
      const el = document.createElement('div');
      el.className = 'sys-msg';
      el.innerHTML = `<span>${UI.esc(msg.content)}</span>`;
      return el;
    }

    const senderId = msg.sender?._id || msg.sender;
    const isOut = senderId === me?._id;

    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${isOut ? 'out' : 'in'}${consec ? ' consecutive' : ''}`;
    wrap.dataset.msgId = msg._id;

    wrap.addEventListener('contextmenu', e => { e.preventDefault(); showMsgCtx(e, msg, isOut); });

    if (msg.isDeleted) {
      const row = document.createElement('div');
      row.className = 'msg-row';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.innerHTML = `<div class="msg-deleted"><i class="fa-solid fa-ban"></i> This message was deleted</div>`;
      row.appendChild(bubble);
      wrap.appendChild(row);
      return wrap;
    }

    const row = document.createElement('div');
    row.className = 'msg-row';

    // Avatar for group incoming
    const chat = ChatManager.getActiveChat();
    if (!isOut && !consec && chat?.type === 'group') {
      const avEl = document.createElement('img');
      avEl.className = 'msg-av';
      if (msg.sender?.avatar) {
        avEl.src = msg.sender.avatar;
        avEl.onerror = () => avEl.replaceWith(UI.initials(msg.sender, 26));
      } else {
        avEl.replaceWith(UI.initials(msg.sender, 26));
        // replace will fail since not in DOM yet, use initials directly
        const initEl = UI.initials(msg.sender, 26);
        initEl.style.flexShrink = '0';
        row.appendChild(initEl);
        row.appendChild(makeBubble(msg, isOut, chat));
        wrap.appendChild(row);
        return wrap;
      }
      row.appendChild(avEl);
    }

    row.appendChild(makeBubble(msg, isOut, chat));
    wrap.appendChild(row);

    // Reactions
    if (msg.reactions?.length) {
      wrap.appendChild(makeReactionsEl(msg.reactions));
    }

    return wrap;
  };

  const makeBubble = (msg, isOut, chat) => {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    // Group sender name
    if (!isOut && chat?.type === 'group') {
      const sn = document.createElement('div');
      sn.className = 'msg-sender';
      sn.textContent = msg.sender?.displayName || msg.sender?.username || '';
      bubble.appendChild(sn);
    }

    // Reply context
    if (msg.replyTo) {
      const rc = document.createElement('div');
      rc.className = 'reply-ctx';
      rc.innerHTML = `
        <div class="reply-ctx-name">${UI.esc(msg.replyTo.sender?.displayName || msg.replyTo.sender?.username || 'Unknown')}</div>
        <div class="reply-ctx-text">${UI.esc(getMsgPreview(msg.replyTo))}</div>
      `;
      rc.addEventListener('click', () => scrollToMsg(msg.replyTo._id));
      bubble.appendChild(rc);
    }

    // Content
    bubble.appendChild(makeContent(msg));

    // Meta
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    if (msg.isEdited) {
      const ed = document.createElement('span');
      ed.className = 'msg-edited'; ed.textContent = 'edited';
      meta.appendChild(ed);
    }
    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = UI.fmtTime(msg.createdAt);
    meta.appendChild(time);

    if (isOut) {
      const tick = document.createElement('span');
      tick.className = 'tick';
      const isRead = msg.readBy?.length > 0;
      const isDelivered = msg.deliveredTo?.length > 0;
      tick.innerHTML = `<i class="fa-solid fa-check${(isRead || isDelivered) ? '-double' : ''}"></i>`;
      if (isRead) tick.classList.add('read');
      else if (isDelivered) tick.classList.add('delivered');
      else tick.classList.add('sent');
      meta.appendChild(tick);
    }

    bubble.appendChild(meta);
    return bubble;
  };

  const makeContent = (msg) => {
    const wrap = document.createElement('div');
    switch(msg.type) {
      case 'image': {
        const div = document.createElement('div');
        div.className = 'msg-img-wrap';
        const img = document.createElement('img');
        img.src = msg.mediaUrl; img.alt = 'Image'; img.loading = 'lazy';
        img.addEventListener('click', () => MediaManager.openLightbox(msg.mediaUrl, 'image'));
        div.appendChild(img);
        wrap.appendChild(div);
        if (msg.content) {
          const cap = document.createElement('div');
          cap.className = 'msg-text'; cap.style.marginTop = '5px';
          cap.innerHTML = UI.linkify(msg.content);
          wrap.appendChild(cap);
        }
        break;
      }
      case 'video': {
        const div = document.createElement('div');
        div.className = 'msg-video-wrap';
        const vid = document.createElement('video');
        vid.src = msg.mediaUrl; vid.controls = true; vid.preload = 'metadata';
        div.appendChild(vid); wrap.appendChild(div);
        break;
      }
      case 'audio': {
        const div = document.createElement('div');
        div.className = 'msg-audio';
        const aud = document.createElement('audio');
        aud.src = msg.mediaUrl; aud.controls = true;
        div.appendChild(aud); wrap.appendChild(div);
        break;
      }
      case 'file': {
        const div = document.createElement('div');
        div.className = 'msg-file';
        div.innerHTML = `
          <div class="msg-file-icon"><i class="fa-solid fa-file"></i></div>
          <div class="msg-file-info">
            <div class="msg-file-name">${UI.esc(msg.mediaName || 'File')}</div>
            <div class="msg-file-size">${UI.fmtSize(msg.mediaSize)}</div>
          </div>
          <i class="fa-solid fa-download" style="color:var(--blue);margin-left:auto"></i>
        `;
        div.addEventListener('click', () => {
          const a = document.createElement('a');
          a.href = msg.mediaUrl; a.download = msg.mediaName || 'file';
          a.click();
        });
        wrap.appendChild(div);
        break;
      }
      default: { // text
        const div = document.createElement('div');
        div.className = 'msg-text';
        div.innerHTML = UI.linkify(msg.content || '');
        wrap.appendChild(div);
      }
    }
    return wrap;
  };

  const makeReactionsEl = (reactions) => {
    const wrap = document.createElement('div');
    wrap.className = 'msg-reactions';
    const grouped = {};
    (reactions || []).forEach(r => { if (!grouped[r.emoji]) grouped[r.emoji] = 0; grouped[r.emoji]++; });
    Object.entries(grouped).forEach(([emoji, count]) => {
      const chip = document.createElement('div');
      chip.className = 'react-chip';
      chip.innerHTML = `${emoji} <span>${count}</span>`;
      chip.addEventListener('click', () => SocketManager.reactToMessage(chip.closest('[data-msg-id]')?.dataset.msgId, emoji));
      wrap.appendChild(chip);
    });
    return wrap;
  };

  // ── Context menu on message ───────────────────────────────
  const showMsgCtx = (e, msg, isOut) => {
    const items = [
      { label: 'Reply', icon: 'fa-reply', action: () => setReply(msg) },
      { label: 'React', icon: 'fa-face-smile', action: () => showQuickReact(e, msg._id) },
    ];
    if (msg.type === 'text' && msg.content) {
      items.push({ label: 'Copy', icon: 'fa-copy', action: () => navigator.clipboard.writeText(msg.content).catch(() => {}) });
    }
    if (isOut && msg.type === 'text' && !msg.isDeleted) {
      items.push({ label: 'Edit', icon: 'fa-pen', action: () => startEdit(msg) });
    }
    if (isOut && !msg.isDeleted) {
      items.push({ label: 'Delete for everyone', icon: 'fa-trash', danger: true, action: () => doDelete(msg._id, true) });
    }
    items.push({ label: 'Delete for me', icon: 'fa-trash-can', danger: true, action: () => doDelete(msg._id, false) });
    UI.showCtx(e.clientX, e.clientY, items);
  };

  const showQuickReact = (e, msgId) => {
    const emojis = ['👍','❤️','😂','😮','😢','🙏','🔥','✅'];
    const picker = document.createElement('div');
    picker.style.cssText = `position:fixed;z-index:2100;background:var(--bg1);border:1px solid var(--border2);border-radius:var(--r-full);padding:6px 10px;display:flex;gap:6px;box-shadow:var(--shadow);animation:fadeIn .12s`;
    picker.style.left = e.clientX + 'px';
    picker.style.top  = (e.clientY - 54) + 'px';
    emojis.forEach(em => {
      const b = document.createElement('button');
      b.textContent = em;
      b.style.cssText = 'font-size:21px;cursor:pointer;background:none;border:none;transition:transform .1s;border-radius:4px;padding:2px';
      b.onmouseenter = () => b.style.transform = 'scale(1.35)';
      b.onmouseleave = () => b.style.transform = '';
      b.addEventListener('click', () => { SocketManager.reactToMessage(msgId, em); picker.remove(); });
      picker.appendChild(b);
    });
    document.body.appendChild(picker);
    setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 100);
  };

  // ── Reply ─────────────────────────────────────────────────
  const setReply = (msg) => {
    _replyTo = msg;
    document.getElementById('reply-bar-name').textContent = msg.sender?.displayName || msg.sender?.username || '';
    document.getElementById('reply-bar-text').textContent = getMsgPreview(msg);
    document.getElementById('reply-bar').classList.remove('hidden');
    document.getElementById('msg-input').focus();
  };
  const cancelReply = () => {
    _replyTo = null;
    document.getElementById('reply-bar').classList.add('hidden');
    document.getElementById('cancel-reply').onclick = cancelReply;
  };
  document.getElementById('cancel-reply').addEventListener('click', cancelReply);

  // ── Edit ──────────────────────────────────────────────────
  const startEdit = (msg) => {
    _editId = msg._id;
    const input = document.getElementById('msg-input');
    input.value = msg.content || '';
    input.focus();
    document.getElementById('reply-bar-name').textContent = '✏️ Editing message';
    document.getElementById('reply-bar-text').textContent = msg.content || '';
    document.getElementById('reply-bar').classList.remove('hidden');
    document.getElementById('cancel-reply').onclick = cancelEdit;
    document.getElementById('send-btn').innerHTML = '<i class="fa-solid fa-check"></i>';
  };
  const cancelEdit = () => {
    _editId = null;
    document.getElementById('msg-input').value = '';
    document.getElementById('send-btn').innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    document.getElementById('cancel-reply').onclick = cancelReply;
    cancelReply();
  };

  // ── Delete ────────────────────────────────────────────────
  const doDelete = (msgId, forEveryone) => {
    SocketManager.deleteMessage(msgId, forEveryone, res => {
      if (res?.error) UI.toast(res.error, 'error');
    });
  };

  // ── Send ──────────────────────────────────────────────────
  const sendText = async () => {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();

    // If editing
    if (_editId) {
      if (!content) return;
      const id = _editId;
      cancelEdit();
      SocketManager.editMessage(id, content, res => {
        if (res?.error) UI.toast(res.error, 'error');
      });
      return;
    }

    // If pending media
    if (typeof MediaManager !== 'undefined' && MediaManager.hasPending()) {
      await MediaManager.sendPending(_chatId, _replyTo?._id, content);
      cancelReply();
      input.value = '';
      autoResize(input);
      return;
    }

    if (!content) return;
    if (!_chatId) { UI.toast('No chat selected', 'error'); return; }

    const replyId = _replyTo?._id;
    cancelReply();
    input.value = '';
    autoResize(input);
    stopTyping();

    SocketManager.sendMessage({
      chatId: _chatId,
      content,
      type: 'text',
      replyTo: replyId || undefined,
    }, res => {
      if (res?.error) UI.toast(`Send failed: ${res.error}`, 'error');
    });
  };

  // ── Typing ────────────────────────────────────────────────
  const startTyping = () => {
    if (!_isTyping && _chatId) { _isTyping = true; SocketManager.typingStart(_chatId); }
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(stopTyping, 2200);
  };
  const stopTyping = () => {
    if (_isTyping && _chatId) { _isTyping = false; SocketManager.typingStop(_chatId); }
    clearTimeout(_typingTimer);
  };

  // ── Input listeners ───────────────────────────────────────
  const msgInput = document.getElementById('msg-input');

  const autoResize = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 116) + 'px';
  };

  msgInput.addEventListener('input', () => { autoResize(msgInput); startTyping(); });
  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  });
  document.getElementById('send-btn').addEventListener('click', sendText);

  // ── Socket events ─────────────────────────────────────────
  SocketManager.on('message:new', msg => {
    const isForActiveChat = msg.chat === _chatId;
    ChatManager.updateLastMessage(msg.chat, msg);

    if (!isForActiveChat) return;

    const list = document.getElementById('msgs-list');
    const lastMsg = _msgs[_msgs.length - 1];
    const lastSenderId = lastMsg?.sender?._id || lastMsg?.sender;
    const thisSenderId = msg.sender?._id || msg.sender;
    const consec = lastSenderId === thisSenderId;

    _msgs.push(msg);

    // Date divider if needed
    const d = UI.fmtDate(msg.createdAt);
    const lastDateEl = list.querySelector('.date-div:last-of-type span');
    if (lastDateEl?.textContent !== d) list.appendChild(makeDateDiv(d));

    const el = makeMsgEl(msg, consec);
    if (el) list.appendChild(el);

    // Remove "no messages" placeholder
    const placeholder = list.querySelector('[style*="No messages"]') || list.querySelector('[style*="say hello"]');
    placeholder?.remove();

    scrollBottom(true);

    // Mark as read if window focused
    if (document.hasFocus()) SocketManager.markRead(_chatId, [msg._id]);
  });

  SocketManager.on('message:edited', ({ messageId, content, isEdited, editedAt }) => {
    const msg = _msgs.find(m => m._id === messageId);
    if (msg) { msg.content = content; msg.isEdited = isEdited; }
    const el = document.querySelector(`.msg-wrap[data-msg-id="${messageId}"]`);
    if (el) {
      const textEl = el.querySelector('.msg-text');
      if (textEl) textEl.innerHTML = UI.linkify(content);
      if (!el.querySelector('.msg-edited')) {
        const ed = document.createElement('span');
        ed.className = 'msg-edited'; ed.textContent = 'edited';
        el.querySelector('.msg-meta')?.prepend(ed);
      }
    }
  });

  SocketManager.on('message:deleted', ({ messageId, forEveryone }) => {
    if (forEveryone) {
      const msg = _msgs.find(m => m._id === messageId);
      if (msg) msg.isDeleted = true;
      const el = document.querySelector(`.msg-wrap[data-msg-id="${messageId}"]`);
      const bubble = el?.querySelector('.msg-bubble');
      if (bubble) bubble.innerHTML = `<div class="msg-deleted"><i class="fa-solid fa-ban"></i> This message was deleted</div>`;
    } else {
      document.querySelector(`.msg-wrap[data-msg-id="${messageId}"]`)?.remove();
      _msgs = _msgs.filter(m => m._id !== messageId);
    }
  });

  SocketManager.on('message:read', ({ chatId, messageIds, readBy }) => {
    if (chatId !== _chatId) return;
    messageIds.forEach(id => {
      const msg = _msgs.find(m => m._id === id);
      if (msg) { if (!msg.readBy) msg.readBy = []; if (!msg.readBy.some(r => r.user === readBy)) msg.readBy.push({ user: readBy }); }
      const tickEl = document.querySelector(`.msg-wrap[data-msg-id="${id}"] .tick`);
      if (tickEl) { tickEl.innerHTML = '<i class="fa-solid fa-check-double"></i>'; tickEl.className = 'tick read'; }
    });
  });

  SocketManager.on('message:reacted', ({ messageId, reactions }) => {
    const msg = _msgs.find(m => m._id === messageId);
    if (msg) msg.reactions = reactions;
    const wrap = document.querySelector(`.msg-wrap[data-msg-id="${messageId}"]`);
    if (wrap) {
      wrap.querySelector('.msg-reactions')?.remove();
      if (reactions?.length) wrap.appendChild(makeReactionsEl(reactions));
    }
  });

  // ── Typing indicator ──────────────────────────────────────
  SocketManager.on('typing:start', ({ chatId, userId, username }) => {
    if (chatId !== _chatId) return;
    _typers.set(userId, username);
    updateTyping();
  });
  SocketManager.on('typing:stop', ({ chatId, userId }) => {
    if (chatId !== _chatId) return;
    _typers.delete(userId);
    updateTyping();
  });
  const updateTyping = () => {
    const el = document.getElementById('typing-wrap');
    const who = document.getElementById('typing-who');
    if (_typers.size === 0) { el.classList.add('hidden'); return; }
    who.textContent = [..._typers.values()].slice(0, 2).join(', ');
    el.classList.remove('hidden');
    scrollBottom(false);
  };

  // ── Message search ────────────────────────────────────────
  document.getElementById('msg-search-btn').addEventListener('click', () => {
    const bar = document.getElementById('msg-search-bar');
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) document.getElementById('msg-search-input').focus();
  });
  document.getElementById('close-msg-search').addEventListener('click', () => {
    document.getElementById('msg-search-bar').classList.add('hidden');
    document.getElementById('msg-search-input').value = '';
  });
  const doMsgSearch = UI.debounce(async (q) => {
    if (!q || !_chatId) return;
    try {
      const d = await API.searchMessages(_chatId, q);
      if (d.messages?.length) { UI.toast(`Found ${d.messages.length} result(s)`, 'info'); scrollToMsg(d.messages[0]._id); }
      else UI.toast('No messages found', 'info');
    } catch {}
  }, 500);
  document.getElementById('msg-search-input').addEventListener('input', e => doMsgSearch(e.target.value.trim()));

  // ── Helpers ───────────────────────────────────────────────
  const scrollBottom = (smooth = true) => {
    const area = document.getElementById('msgs-area');
    area.scrollTo({ top: area.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  };
  const scrollToMsg = (id) => {
    const el = document.querySelector(`.msg-wrap[data-msg-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el) { el.style.outline = '2px solid var(--green)'; setTimeout(() => el.style.outline = '', 1400); }
  };
  const getMsgPreview = (msg) => {
    if (msg.isDeleted) return 'Deleted message';
    if (msg.type === 'text') return msg.content || '';
    const map = { image: '📷 Photo', video: '🎥 Video', audio: '🎤 Voice message', file: '📎 File' };
    return map[msg.type] || msg.type || '';
  };

  return { loadMessages, getCurrentChatId, scrollBottom };
})();
