/* api.js */
const API = (() => {
  const BASE = '/api';
  const token = () => localStorage.getItem('sc_token');

  const h = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    ...extra
  });

  const req = async (method, path, body, isForm = false) => {
    const opts = { method };
    if (isForm) {
      opts.headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      if (body) opts.body = body;
    } else {
      opts.headers = h();
      if (body) opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE}${path}`, opts);
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  };

  return {
    // Auth
    register:      d  => req('POST', '/auth/register', d),
    login:         d  => req('POST', '/auth/login', d),
    logout:        () => req('POST', '/auth/logout'),
    getMe:         () => req('GET',  '/auth/me'),
    updateProfile: fd => req('PATCH','/auth/profile', fd, true),
    // Users
    searchUsers:   q  => req('GET',  `/users/search?q=${encodeURIComponent(q)}`),
    getContacts:   () => req('GET',  '/users/contacts'),
    addContact:    id => req('POST', `/users/contacts/${id}`),
    removeContact: id => req('DELETE',`/users/contacts/${id}`),
    // Chats
    getChats:              ()     => req('GET',  '/chats'),
    getOrCreatePrivate:    uid   => req('POST', `/chats/private/${uid}`),
    createGroup:           fd    => req('POST', '/chats/group', fd, true),
    getChatById:           id    => req('GET',  `/chats/${id}`),
    leaveGroup:            id    => req('DELETE',`/chats/${id}/leave`),
    // Messages
    getMessages:    (cid, qs='') => req('GET',  `/messages/${cid}${qs}`),
    sendMessage:    (cid, fd)    => req('POST', `/messages/${cid}`, fd, true),
    editMessage:    (mid, c)     => req('PATCH', `/messages/${mid}`, { content: c }),
    deleteMessage:  (mid, fe)    => req('DELETE',`/messages/${mid}`, { forEveryone: fe }),
    searchMessages: (cid, q)     => req('GET',  `/messages/${cid}/search/messages?q=${encodeURIComponent(q)}`),
    markAsRead:     cid          => req('POST', `/messages/${cid}/read`),
    // Upload
    uploadFile: fd => req('POST', '/upload', fd, true),
  };
})();
