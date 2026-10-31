
/* NOVA Media Center — individual removal and REMOVE ALL FROM LIBRARY.
   Removes browser-stored copies only. Never deletes files on the computer. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PLAYLIST_KEY = 'novaUniversalPlaylistsV1';
  const fileKey = file => `${file.name}|${file.size}|${file.lastModified}`;
  const music = () => { try { return typeof musicLibrary !== 'undefined' ? musicLibrary : []; } catch (_) { return []; } };
  const videos = () => { try { return typeof videoLibrary !== 'undefined' ? videoLibrary : []; } catch (_) { return []; } };
  const youtube = () => { try { return typeof novaYtSaved !== 'undefined' ? novaYtSaved : []; } catch (_) { return []; } };
  const items = () => [
    ...music().map(x => ({type:'music', key:'music:'+fileKey(x.file), name:x.file.name})),
    ...videos().map(x => ({type:'video', key:'video:'+fileKey(x.file), name:x.file.name})),
    ...youtube().map(x => ({type:'youtube', key:'youtube:'+x.id, name:x.url||x.id}))
  ];
  function transact(dbName, version, storeName, operation, key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName))
          request.result.createObjectStore(storeName, {keyPath:'key'});
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          if (operation === 'clear') store.clear();
          else store.delete(key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        } catch (error) { db.close(); reject(error); }
      };
    });
  }
  function updatePlaylists(removedKeys) {
    try {
      const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || '[]');
      if (!Array.isArray(playlists)) return;
      for (const playlist of playlists) {
        if (Array.isArray(playlist.items))
          playlist.items = playlist.items.filter(item => !removedKeys.has(item.key));
      }
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
    } catch (error) { console.warn('NOVA playlist reference update failed:', error); }
  }
  function refreshMedia() {
    try { if (typeof renderMusicList === 'function') renderMusicList(); } catch (e) { console.warn(e); }
    try { if (typeof renderVideoList === 'function') renderVideoList(); } catch (e) { console.warn(e); }
    try { if (typeof novaRenderVideoList === 'function') novaRenderVideoList(); } catch (e) { console.warn(e); }
    try { if (typeof novaRenderYtSaved === 'function') novaRenderYtSaved(); } catch (e) { console.warn(e); }
    try { if (typeof renderNovaIntegratedMediaLibrary === 'function') renderNovaIntegratedMediaLibrary(); } catch (e) { console.warn(e); }
    try { if (typeof saveCurrentPlaylistOrder === 'function') saveCurrentPlaylistOrder(); } catch (e) { console.warn(e); }
    window.dispatchEvent(new Event('nova:library-updated'));
  }
  function removeMemoryItem(item) {
    if (item.type === 'music') {
      const library = music();
      const index = library.findIndex(x => fileKey(x.file) === item.key.slice(6));
      if (index >= 0) {
        if (typeof musicIndex !== 'undefined' && musicIndex === index) stopPlayer('audioPlayer');
        try { URL.revokeObjectURL(library[index].url); } catch (_) {}
        library.splice(index, 1);
        if (typeof musicIndex !== 'undefined') musicIndex = musicIndex === index ? -1 : musicIndex > index ? musicIndex - 1 : musicIndex;
      }
    } else if (item.type === 'video') {
      const library = videos();
      const index = library.findIndex(x => fileKey(x.file) === item.key.slice(6));
      if (index >= 0) {
        if (typeof videoIndex !== 'undefined' && videoIndex === index) stopPlayer('videoPlayer');
        try { URL.revokeObjectURL(library[index].url); } catch (_) {}
        library.splice(index, 1);
        if (typeof videoIndex !== 'undefined') videoIndex = videoIndex === index ? -1 : videoIndex > index ? videoIndex - 1 : videoIndex;
      }
    } else {
      const saved = youtube();
      const index = saved.findIndex(x => String(x.id) === item.key.slice(8));
      if (index >= 0) saved.splice(index, 1);
      if (typeof novaSaveYt === 'function') novaSaveYt();
    }
  }
  function stopPlayer(id) {
    const player = $(id);
    if (!player) return;
    try { player.pause(); player.removeAttribute('src'); player.load(); } catch (_) {}
  }
  async function removeOne(item) {
    if (!confirm(`Remove "${item.name}" from NOVA's media library?\n\nOriginal files on your computer will NOT be deleted.`)) return;
    try {
      if (item.type === 'music') await transact('novaPersistentPlaylistDB', 2, 'tracks', 'delete', item.key.slice(6));
      if (item.type === 'video') await transact('novaVideoPlaylistV2', 1, 'videos', 'delete', item.key.slice(6));
      removeMemoryItem(item);
      updatePlaylists(new Set([item.key]));
      refreshMedia();
    } catch (error) {
      console.error('NOVA: could not remove library item', error);
      alert('NOVA could not remove this item. Check the browser console.');
    }
  }
  async function removeAll(button) {
    const all = items();
    if (!all.length) { alert('NOVA media library is already empty.'); return; }
    if (!confirm(`REMOVE ALL ${all.length} ITEMS FROM NOVA MEDIA LIBRARY?\n\nThis removes browser-stored media and playlist references. Original files on your computer will NOT be deleted.`)) return;
    button.disabled = true;
    button.textContent = 'REMOVING...';
    try {
      await transact('novaPersistentPlaylistDB', 2, 'tracks', 'clear');
      await transact('novaVideoPlaylistV2', 1, 'videos', 'clear');
      stopPlayer('audioPlayer'); stopPlayer('videoPlayer');
      for (const item of all) removeMemoryItem(item);
      try { localStorage.setItem('novaPersistentPlaylistOrderV1', '[]'); } catch (_) {}
      updatePlaylists(new Set(all.map(x => x.key)));
      refreshMedia();
    } catch (error) {
      console.error('NOVA: bulk library removal failed', error);
      alert('NOVA could not finish clearing the library. Check the browser console.');
    } finally {
      button.textContent = 'REMOVE ALL FROM LIBRARY';
      button.disabled = items().length === 0;
    }
  }
  function init() {
    const list = $('library');
    if (!list) return;
    let bar = $('novaMediaCountBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'novaMediaCountBar';
      list.before(bar);
    }
    bar.setAttribute('aria-live', 'polite');
    let button = $('novaRemoveAllLibrary');
    if (!button) {
      button = document.createElement('button');
      button.id = 'novaRemoveAllLibrary';
      button.type = 'button';
      button.className = 'novaRemoveAllLibrary';
      button.textContent = 'REMOVE ALL FROM LIBRARY';
      button.title = 'Clear NOVA media entries without deleting original computer files';
      list.before(button);
    }
    button.addEventListener('click', () => removeAll(button));
    let updating = false;
    const update = () => {
      if (updating) return;
      updating = true;
      try {
        const all = items();
        const count = type => all.filter(x => x.type === type).length;
        const rows = Array.from(list.querySelectorAll('.entry'));
        bar.textContent = `SHOWING ${rows.length} / ${all.length} MEDIA  •  ${count('music')} SONGS  •  ${count('video')} VIDEOS  •  ${count('youtube')} YOUTUBE`;
        button.disabled = all.length === 0;
        const query = ($('search')?.value || '').trim().toLowerCase();
        const filter = $('filter')?.value || 'all';
        const visible = all.filter(x => (filter === 'all' || x.type === filter) && x.name.toLowerCase().includes(query));
        const assigned = new Set();
        rows.forEach((row, index) => {
          // Match by the filename actually displayed, not the unfiltered array index.
          const display = (row.textContent || '').replace(/\s*\+ PLAYLIST.*$/is, '').trim().toLowerCase();
          let item = visible.find(x => !assigned.has(x.key) && (display.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(display)));
          if (!item && visible.length === rows.length) item = visible[index];
          if (!item) return;
          assigned.add(item.key);
          const add = row.querySelector('button:not(.novaRemoveLibrary)');
          if (add) { add.textContent = '+ PLAYLIST'; add.title = 'Add to selected playlist'; }
          let remove = row.querySelector('.novaRemoveLibrary');
          if (!remove) {
            remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'novaRemoveLibrary';
            remove.textContent = 'REMOVE FROM LIBRARY';
            remove.title = 'Remove browser copy; original computer file remains';
            row.append(remove);
          }
          remove.dataset.novaRemove = item.key;
          remove.onclick = () => removeOne(item);
        });
      } finally { updating = false; }
    };
    new MutationObserver(() => queueMicrotask(update)).observe(list, {childList:true});
    $('search')?.addEventListener('input', () => queueMicrotask(update));
    $('filter')?.addEventListener('change', () => queueMicrotask(update));
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
