/* chat.js */
const ChatManager = (() => {
  let _chats = [];
  let _activeChatId = null;

  const getActiveChatId = () => _activeChatId;
  const getChats = () => _chats;
  const getActiveChat = () => _chats.find(c => c._id === _activeChatId);

  // ── Load all chats ─────────────────────────────────────────
  const loadChats = async () => {
    try {
      const d = await API.getChats();
      _chats = d.chats || [];
      renderList();
    } catch (err) {
      UI.toast('Could not load chats', 'error');
    }
  };

  // ── Render sidebar list ───────────────────────────────────
  const renderList = (filtered = null) => {
    const list = document.getElementById('chat-list');
    const empty = document.getElementById('empty-state');
    const items = filtered ?? _chats;
    list.innerHTML = '';
    if (!items.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    items.forEach(c => list.appendChild(makeChatItem(c)));
  };

  const makeChatItem = (chat) => {
    const me = Auth.getUser();
    const isGroup = chat.type === 'group';
    const other = !isGroup ? chat.participants?.find(p => p.user?._id !== me?._id) : null;
    const name = isGroup ? chat.name : (other?.user?.displayName || other?.user?.username || 'Unknown');
    const av = isGroup ? { avatar: chat.avatar, displayName: name } : other?.user;
    const online = !isGroup && other?.user?.isOnline;

    const lm = chat.lastMessage;
    let preview = 'No messages yet', previewClass = '';
    if (lm) {
      if (lm.isDeleted) { preview = '🚫 Deleted message'; previewClass = 'italic'; }
      else if (lm.type === 'text') {
        const prefix = lm.sender?._id === me?._id ? 'You: ' : '';
        preview = prefix + (lm.content || '').substring(0, 55);
      } else {
        const icons = { image:'📷 Photo', video:'🎥 Video', audio:'🎤 Voice', file:'📎 File' };
        preview = icons[lm.type] || lm.type;
      }
    }

    const el = document.createElement('div');
    el.className = `chat-item${_activeChatId === chat._id ? ' active' : ''}`;
    el.dataset.chatId = chat._id;

    // Build avatar
    const avWrap = document.createElement('div');
    avWrap.style.position = 'relative';
    avWrap.style.flexShrink = '0';
    const avEl = UI.makeAv(av, 44);
    avWrap.appendChild(avEl);
    if (online) {
      const dot = document.createElement('div');
      dot.className = 'online-ring';
      avWrap.appendChild(dot);
    }

    el.appendChild(avWrap);

    const body = document.createElement('div');
    body.className = 'chat-item-body';
    const timeStr = lm ? UI.fmtDate(lm.createdAt || chat.lastActivity) : '';
    const hasUnread = (chat.unreadCount || 0) > 0;
    body.innerHTML = `
      <div class="chat-item-row">
        <span class="chat-item-name">${UI.esc(name)}</span>
        <span class="chat-item-time${hasUnread ? ' has-unread' : ''}">${UI.esc(timeStr)}</span>
      </div>
      <div class="chat-item-preview">
        <span class="chat-item-last${previewClass ? ' ' + previewClass : ''}">${UI.esc(preview)}</span>
        ${hasUnread ? `<span class="unread-dot">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>` : ''}
      </div>
    `;
    el.appendChild(body);

    el.addEventListener('click', () => selectChat(chat._id));
    el.addEventListener('contextmenu', e => { e.preventDefault(); showChatCtx(e, chat); });
    return el;
  };

  const showChatCtx = (e, chat) => {
    UI.showCtx(e.clientX, e.clientY, [
      { label: 'Mark as read', icon: 'fa-check-double', action: () => API.markAsRead(chat._id).catch(() => {}) },
      {
        label: chat.type === 'group' ? 'Leave group' : 'Delete chat',
        icon: 'fa-right-from-bracket', danger: true,
        action: async () => {
          try {
            if (chat.type === 'group') await API.leaveGroup(chat._id);
            _chats = _chats.filter(c => c._id !== chat._id);
            renderList();
            if (_activeChatId === chat._id) {
              _activeChatId = null;
              document.getElementById('chat-view').classList.add('hidden');
              document.getElementById('welcome').classList.remove('hidden');
            }
          } catch (err) { UI.toast(err.message, 'error'); }
        }
      }
    ]);
  };

  // ── Select chat ───────────────────────────────────────────
  const selectChat = async (chatId) => {
    _activeChatId = chatId;

    document.querySelectorAll('.chat-item').forEach(el => {
      el.classList.toggle('active', el.dataset.chatId === chatId);
    });
    // Clear unread
    const c = _chats.find(x => x._id === chatId);
    if (c) c.unreadCount = 0;
    renderList();

    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('chat-view').classList.remove('hidden');

    // Mobile
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.add('slide-out');

    let chat = _chats.find(x => x._id === chatId);
    if (!chat) {
      try { const d = await API.getChatById(chatId); chat = d.chat; } catch { return; }
    }

    updateHeader(chat);
    SocketManager.joinChat(chatId);
    await MessageManager.loadMessages(chatId);
  };

  const updateHeader = (chat) => {
    const me = Auth.getUser();
    const isGroup = chat.type === 'group';
    const other = !isGroup ? chat.participants?.find(p => p.user?._id !== me?._id) : null;
    const name = isGroup ? chat.name : (other?.user?.displayName || other?.user?.username || 'Unknown');
    const av = isGroup ? { avatar: chat.avatar, displayName: name } : other?.user;
    const online = !isGroup && other?.user?.isOnline;

    document.getElementById('chat-head-name').textContent = name;
    const sub = document.getElementById('chat-head-sub');
    if (isGroup) {
      sub.textContent = `${chat.participants?.length || 0} members`;
      sub.className = 'chat-head-sub';
    } else {
      sub.textContent = online ? 'Online' : `Last seen ${UI.fmtLastSeen(other?.user?.lastSeen)}`;
      sub.className = `chat-head-sub${online ? ' online' : ''}`;
    }

    // Render avatar in header
    const avContainer = document.getElementById('chat-av-wrap');
    avContainer.innerHTML = '';
    const avEl = UI.makeAv(av, 36);
    if (online) {
      const dot = document.createElement('div');
      dot.className = 'online-ring';
      avEl.appendChild(dot);
    }
    avContainer.appendChild(avEl);
  };

  // ── Update user status across chats ──────────────────────
  const updateUserStatus = (userId, isOnline, lastSeen) => {
    _chats.forEach(chat => {
      if (chat.type === 'private') {
        const p = chat.participants?.find(x => x.user?._id === userId);
        if (p?.user) { p.user.isOnline = isOnline; p.user.lastSeen = lastSeen; }
      }
    });
    renderList();
    if (_activeChatId) {
      const ac = _chats.find(c => c._id === _activeChatId);
      if (ac) updateHeader(ac);
    }
  };

  // ── Update last message on sidebar ───────────────────────
  const updateLastMessage = (chatId, msg) => {
    const idx = _chats.findIndex(c => c._id === chatId);
    if (idx >= 0) {
      _chats[idx].lastMessage = msg;
      _chats[idx].lastActivity = msg.createdAt;
      if (chatId !== _activeChatId) _chats[idx].unreadCount = (_chats[idx].unreadCount || 0) + 1;
      // Move to top
      const [chat] = _chats.splice(idx, 1);
      _chats.unshift(chat);
      renderList();
    } else {
      // Chat not in list yet, reload
      loadChats();
    }
  };

  // ── Sidebar search ────────────────────────────────────────
  const searchInput = document.getElementById('chat-search');
  const clearBtn = document.getElementById('search-clear');
  const chatListEl = document.getElementById('chat-list');
  const searchPanel = document.getElementById('search-panel');

  const doSearch = UI.debounce(async (q) => {
    if (!q) {
      searchPanel.classList.add('hidden');
      chatListEl.classList.remove('hidden');
      clearBtn.classList.add('hidden');
      return;
    }
    clearBtn.classList.remove('hidden');
    chatListEl.classList.add('hidden');
    searchPanel.classList.remove('hidden');
    searchPanel.innerHTML = '<div style="padding:16px;color:var(--t3);font-size:13px;text-align:center">Searching…</div>';

    try {
      const localChats = _chats.filter(c => {
        const me = Auth.getUser();
        const isGroup = c.type === 'group';
        const other = !isGroup ? c.participants?.find(p => p.user?._id !== me?._id) : null;
        const name = isGroup ? c.name : (other?.user?.displayName || other?.user?.username || '');
        return name.toLowerCase().includes(q.toLowerCase());
      });

      const usersData = await API.searchUsers(q);
      const users = usersData.users || [];

      searchPanel.innerHTML = '';

      if (localChats.length) {
        const hdr = document.createElement('div');
        hdr.className = 'srch-hdr'; hdr.textContent = 'Chats';
        searchPanel.appendChild(hdr);
        localChats.forEach(c => searchPanel.appendChild(makeChatItem(c)));
      }
      if (users.length) {
        const hdr = document.createElement('div');
        hdr.className = 'srch-hdr'; hdr.textContent = 'People';
        searchPanel.appendChild(hdr);
        users.forEach(u => searchPanel.appendChild(makeUserItem(u, async () => {
          searchInput.value = ''; doSearch('');
          const d = await API.getOrCreatePrivate(u._id);
          if (!_chats.find(c => c._id === d.chat._id)) _chats.unshift(d.chat);
          renderList();
          selectChat(d.chat._id);
        })));
      }
      if (!localChats.length && !users.length) {
        searchPanel.innerHTML = '<div style="padding:24px;color:var(--t3);font-size:13px;text-align:center">No results found</div>';
      }
    } catch {
      searchPanel.innerHTML = '<div style="padding:16px;color:var(--red);font-size:13px;text-align:center">Search failed</div>';
    }
  }, 380);

  searchInput.addEventListener('input', e => doSearch(e.target.value.trim()));
  clearBtn.addEventListener('click', () => { searchInput.value = ''; doSearch(''); searchInput.focus(); });

  // ── New Chat modal ────────────────────────────────────────
  document.getElementById('new-chat-btn').addEventListener('click', () => UI.openModal('modal-new-chat'));

  const ncSearch = document.getElementById('nc-search');
  const ncResults = document.getElementById('nc-results');
  const doNcSearch = UI.debounce(async q => {
    if (!q) { ncResults.innerHTML = ''; return; }
    try {
      const d = await API.searchUsers(q);
      ncResults.innerHTML = '';
      if (!d.users.length) { ncResults.innerHTML = '<div style="padding:16px;color:var(--t3);font-size:13px;text-align:center">No users found</div>'; return; }
      d.users.forEach(u => ncResults.appendChild(makeUserItem(u, async () => {
        UI.closeModal('modal-new-chat');
        ncSearch.value = ''; ncResults.innerHTML = '';
        const cd = await API.getOrCreatePrivate(u._id);
        if (!_chats.find(c => c._id === cd.chat._id)) _chats.unshift(cd.chat);
        renderList();
        selectChat(cd.chat._id);
      })));
    } catch {}
  }, 380);
  ncSearch.addEventListener('input', e => doNcSearch(e.target.value.trim()));

  // ── New Group modal ───────────────────────────────────────
  document.getElementById('new-group-btn').addEventListener('click', () => {
    selectedUsers = [];
    document.getElementById('grp-chips').innerHTML = '';
    document.getElementById('grp-name').value = '';
    UI.openModal('modal-new-group');
  });

  let selectedUsers = [];
  const grpSearch = document.getElementById('grp-search');
  const grpResults = document.getElementById('grp-results');
  const grpChips = document.getElementById('grp-chips');

  const doGrpSearch = UI.debounce(async q => {
    if (!q) { grpResults.innerHTML = ''; return; }
    try {
      const d = await API.searchUsers(q);
      grpResults.innerHTML = '';
      d.users.forEach(u => {
        const already = selectedUsers.find(x => x._id === u._id);
        const el = makeUserItem(u, () => {
          if (!already) { selectedUsers.push(u); renderChips(); }
          grpSearch.value = ''; grpResults.innerHTML = '';
        });
        if (already) el.style.opacity = '.5';
        grpResults.appendChild(el);
      });
    } catch {}
  }, 380);
  grpSearch.addEventListener('input', e => doGrpSearch(e.target.value.trim()));

  const renderChips = () => {
    grpChips.innerHTML = '';
    selectedUsers.forEach(u => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `<span>${UI.esc(u.displayName || u.username)}</span><button data-id="${u._id}"><i class="fa-solid fa-xmark"></i></button>`;
      chip.querySelector('button').onclick = () => { selectedUsers = selectedUsers.filter(x => x._id !== u._id); renderChips(); };
      grpChips.appendChild(chip);
    });
  };

  document.getElementById('create-grp-btn').addEventListener('click', async () => {
    const name = document.getElementById('grp-name').value.trim();
    if (!name) { UI.toast('Enter a group name', 'error'); return; }
    if (!selectedUsers.length) { UI.toast('Add at least one person', 'error'); return; }
    const btn = document.getElementById('create-grp-btn');
    UI.setLoading(btn, true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      selectedUsers.forEach(u => fd.append('participantIds[]', u._id));
      const d = await API.createGroup(fd);
      _chats.unshift(d.chat);
      renderList();
      UI.closeModal('modal-new-group');
      selectedUsers = [];
      selectChat(d.chat._id);
      UI.toast('Group created!', 'success');
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      UI.setLoading(btn, false);
    }
  });

  // ── Back button (mobile) ──────────────────────────────────
  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('slide-out');
    _activeChatId = null;
    document.getElementById('chat-view').classList.add('hidden');
    document.getElementById('welcome').classList.remove('hidden');
  });

  // ── Helper: user result item ──────────────────────────────
  const makeUserItem = (user, onClick) => {
    const el = document.createElement('div');
    el.className = 'user-item';
    const avEl = UI.makeAv(user, 38);
    el.appendChild(avEl);
    const info = document.createElement('div');
    info.className = 'user-item-info';
    info.innerHTML = `<div class="user-item-name">${UI.esc(user.displayName || user.username)}</div><div class="user-item-sub">@${UI.esc(user.username)}</div>`;
    el.appendChild(info);
    const action = document.createElement('span');
    action.className = 'user-item-action';
    action.textContent = 'Message';
    el.appendChild(action);
    el.addEventListener('click', onClick);
    return el;
  };

  return { loadChats, renderList, selectChat, updateHeader, updateUserStatus, updateLastMessage, getActiveChatId, getChats, getActiveChat };
})();
