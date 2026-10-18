/* NOVA Lyrics Ticker v1 — independent of hardware and playback controls.
   Uses public metadata and optional time-coded LRCLIB lyrics. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const original = $('now');
  if (!original || original.dataset.novaLyricsReady) return;
  original.dataset.novaLyricsReady = '1';
  // Reuse the existing animated ticker instead of inserting a competing element.
  const display = original;
  display.id = 'now';
  display.setAttribute('aria-live', 'off');
  let sourceKey = '', artist = '', song = '', lines = [], started = 0, mediaType = '', token = 0;
  let youtubeSeconds = 0, youtubePlaying = false, lastYoutubeEvent = 0;
  let morseText = '', morseUntil = 0;
  window.addEventListener('nova:morse-ticker', event => {
    const text = String(event.detail?.text || '').trim();
    if (!text) return;
    morseText = text;
    morseUntil = Date.now() + Math.min(30000, Math.max(1000, Number(event.detail?.durationMs) || 15000));
    display.textContent = morseText;
  });
  const normalize = s => String(s || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim();
  function parseTitle(raw) {
    let s = normalize(raw).replace(/\s*\((?:official\s+)?(?:music\s+)?video\)\s*/ig, ' ').replace(/\s*\[(?:official\s+)?(?:music\s+)?video\]\s*/ig, ' ').trim();
    const parts = s.split(/\s+[-–—]\s+/);
    return parts.length > 1 ? {artist: parts.shift().trim(), song: parts.join(' - ').trim()} : {artist: '', song: s};
  }
  function lrcParse(data) {
    const found = [];
    for (const line of String(data || '').split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d+)?)\]/g)];
      const words = line.replace(/\[\d{1,3}:\d{2}(?:\.\d+)?\]/g, '').trim();
      if (!words) continue;
      for (const m of tags) found.push({at: Number(m[1]) * 60 + Number(m[2]), words});
    }
    return found.sort((a,b) => a.at - b.at);
  }
  async function loadLyrics(localToken) {
    if (!song) return;
    try {
      const params = new URLSearchParams({track_name: song, artist_name: artist});
      const res = await fetch('https://lrclib.net/api/search?' + params, {signal: AbortSignal.timeout(7000)});
      if (!res.ok) return;
      const matches = await res.json();
      if (localToken !== token || !Array.isArray(matches)) return;
      const candidate = matches.find(x => x.syncedLyrics && (!artist || String(x.artistName || '').toLowerCase().includes(artist.toLowerCase()))) || matches.find(x => x.syncedLyrics);
      if (candidate) lines = lrcParse(candidate.syncedLyrics);
    } catch (_) { /* unavailable lyrics: keep title visible */ }
  }
  function setSong(key, raw, type) {
    if (!key || key === sourceKey) return;
    sourceKey = key; mediaType = type; started = Date.now(); lines = []; youtubeSeconds = 0;
    const info = parseTitle(raw); artist = info.artist; song = info.song;
    const localToken = ++token;
    if (type === 'youtube') {
      fetch('https://noembed.com/embed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + key.slice(3)))
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (token !== localToken || !data || !data.title) return;
          const meta = parseTitle(data.title);
          artist = meta.artist || data.author_name || ''; song = meta.song;
          started = Date.now(); lines = []; loadLyrics(localToken);
        }).catch(() => {});
    } else loadLyrics(localToken);
  }
  function checkSource() {
    try {
      const audio = $('audioPlayer');
      const local = typeof musicIndex !== 'undefined' && typeof musicLibrary !== 'undefined' && musicIndex >= 0 ? musicLibrary[musicIndex] : null;
      const yt = typeof youtubeVideoId !== 'undefined' ? youtubeVideoId : '';
      const frame = $('youtubeFrame');
      const ytActive = !!(yt && frame && /youtube\.com\/embed\//.test(frame.getAttribute('src') || '') &&
        (document.body.classList.contains('novaHybridVideoActive') || document.getElementById('novaIntegratedYouTube')?.classList.contains('active')));
      if (ytActive) setSong('yt:' + yt, 'YouTube song', 'youtube');
      else if (local && audio && audio.src) setSong('local:' + (local.file?.name || musicIndex), local.file?.name || 'Local music', 'local');
    } catch (_) {}
  }
  function timePosition() {
    if (mediaType === 'local') return $('audioPlayer')?.currentTime || 0;
    if (mediaType === 'youtube') return youtubeSeconds + (youtubePlaying ? Math.max(0, (Date.now() - lastYoutubeEvent) / 1000) : 0);
    return 0;
  }
  function render() {
    if (morseText && Date.now() < morseUntil) { display.textContent = morseText; return; }
    if (morseText) { morseText = ''; morseUntil = 0; }
    checkSource();
    if (!sourceKey) return;
    const heading = '♫ NOW PLAYING • ' + (artist ? artist + ' — ' : '') + (song || 'UNKNOWN TITLE');
    if (Date.now() - started < 5500 || !lines.length) { display.textContent = heading; return; }
    const audio = $('audioPlayer');
    const paused = mediaType === 'local' ? !!audio?.paused : !youtubePlaying;
    const pos = timePosition();
    let current = -1;
    for (let i = 0; i < lines.length; i++) if (lines[i].at <= pos + .12) current = i;
    display.textContent = paused ? 'Ⅱ PAUSED • ' + (current >= 0 ? lines[current].words : heading) :
      current >= 0 ? '♫ ' + lines[current].words : heading;
  }
  window.addEventListener('message', event => {
    if (!/https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)$/.test(event.origin)) return;
    let msg; try { msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (_) { return; }
    if (msg?.event !== 'infoDelivery' || !msg.info) return;
    if (typeof msg.info.currentTime === 'number') { youtubeSeconds = msg.info.currentTime; lastYoutubeEvent = Date.now(); }
    if (typeof msg.info.playerState === 'number') youtubePlaying = msg.info.playerState === 1;
  });
  setInterval(() => {
    const frame = $('youtubeFrame');
    if (frame?.contentWindow && typeof youtubeVideoId !== 'undefined' && youtubeVideoId) {
      try { frame.contentWindow.postMessage(JSON.stringify({event:'listening', id:'novaLyricsTicker'}), 'https://www.youtube.com');
        frame.contentWindow.postMessage(JSON.stringify({event:'command',func:'getCurrentTime',args:[]}), 'https://www.youtube.com'); } catch (_) {}
    }
    render();
  }, 600);
  render();
})();
