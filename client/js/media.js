/* media.js */
const MediaManager = (() => {
  let _file = null;
  let _type = null;
  let _mediaRecorder = null;
  let _chunks = [];
  let _recTimer = null;
  let _recSecs = 0;

  // ── File input ────────────────────────────────────────────
  document.getElementById('file-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) setPending(f);
    e.target.value = '';
  });

  const setPending = (file) => {
    _file = file;
    _type = detectType(file);
    const bar = document.getElementById('media-bar');
    const preview = document.getElementById('media-bar-preview');
    preview.innerHTML = '';

    if (_type === 'image') {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    } else if (_type === 'video') {
      const vid = document.createElement('video');
      vid.src = URL.createObjectURL(file);
      vid.muted = true;
      preview.appendChild(vid);
    } else {
      preview.innerHTML = `<div style="font-size:28px;color:var(--blue)"><i class="fa-solid fa-file"></i></div>`;
    }

    const info = document.createElement('div');
    info.innerHTML = `<div class="media-bar-name">${UI.esc(file.name)}</div><div class="media-bar-size">${UI.fmtSize(file.size)}</div>`;
    preview.appendChild(info);
    bar.classList.remove('hidden');
  };

  const clearPending = () => {
    _file = null; _type = null;
    document.getElementById('media-bar').classList.add('hidden');
    document.getElementById('media-bar-preview').innerHTML = '';
  };

  document.getElementById('cancel-media').addEventListener('click', clearPending);

  const hasPending = () => !!_file;

  const sendPending = async (chatId, replyTo = null, caption = '') => {
    if (!_file) return;
    const file = _file, type = _type;
    clearPending();

    try {
      UI.toast('Uploading…', 'info', 8000);
      const fd = new FormData();
      fd.append('file', file);
      const up = await API.uploadFile(fd);

      SocketManager.sendMessage({
        chatId,
        content: caption || undefined,
        type,
        mediaUrl:  up.url,
        mediaType: up.mimetype,
        mediaSize: up.size,
        mediaName: up.filename,
        replyTo:   replyTo || undefined,
      }, res => {
        if (res?.error) UI.toast('Upload failed: ' + res.error, 'error');
      });
    } catch (err) {
      UI.toast('Upload failed: ' + err.message, 'error');
    }
  };

  const detectType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  // ── Voice recording ───────────────────────────────────────
  document.getElementById('rec-btn').addEventListener('click', startRec);
  document.getElementById('cancel-rec').addEventListener('click', cancelRec);
  document.getElementById('send-rec').addEventListener('click', sendRec);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _chunks = []; _recSecs = 0;
      _mediaRecorder = new MediaRecorder(stream);
      _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data); };
      _mediaRecorder.start(100);
      document.getElementById('rec-bar').classList.remove('hidden');
      document.getElementById('rec-btn').style.color = 'var(--red)';
      _recTimer = setInterval(() => {
        _recSecs++;
        const m = Math.floor(_recSecs / 60), s = _recSecs % 60;
        document.getElementById('rec-time').textContent = `${m}:${s.toString().padStart(2,'0')}`;
        if (_recSecs >= 300) sendRec();
      }, 1000);
    } catch {
      UI.toast('Microphone access denied', 'error');
    }
  }

  function stopRec() {
    if (_mediaRecorder?.state !== 'inactive') {
      _mediaRecorder.stop();
      _mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    clearInterval(_recTimer);
    document.getElementById('rec-bar').classList.add('hidden');
    document.getElementById('rec-btn').style.color = '';
  }

  function cancelRec() { stopRec(); _chunks = []; }

  async function sendRec() {
    if (!_mediaRecorder) return;
    stopRec();
    if (!_chunks.length) return;
    const chatId = MessageManager.getCurrentChatId();
    if (!chatId) return;
    try {
      const blob = new Blob(_chunks, { type: 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const fd = new FormData();
      fd.append('file', file);
      const up = await API.uploadFile(fd);
      SocketManager.sendMessage({ chatId, type: 'audio', mediaUrl: up.url, mediaType: up.mimetype, mediaSize: up.size, mediaName: up.filename }, res => {
        if (res?.error) UI.toast(res.error, 'error');
      });
    } catch (err) {
      UI.toast('Failed to send voice: ' + err.message, 'error');
    }
    _chunks = [];
  }

  // ── Lightbox ──────────────────────────────────────────────
  const openLightbox = (url, type = 'image') => {
    const lb = document.getElementById('lightbox');
    const content = document.getElementById('lightbox-content');
    content.innerHTML = '';
    if (type === 'image') {
      const img = document.createElement('img'); img.src = url;
      content.appendChild(img);
    } else {
      const vid = document.createElement('video'); vid.src = url; vid.controls = true; vid.autoplay = true;
      content.appendChild(vid);
    }
    lb.classList.remove('hidden');
  };

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-bg').addEventListener('click', closeLightbox);

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.querySelector('video')?.pause();
    lb.classList.add('hidden');
  }

  return { hasPending, sendPending, clearPending, setPending, openLightbox };
})();
