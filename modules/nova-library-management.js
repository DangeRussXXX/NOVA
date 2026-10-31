
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
    const playlists = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || '[]');
    if (!Array.isArray(playlists)) return;
    for (const playlist of playlists) {
      if (Array.isArray(playlist.items))
        playlist.items = playlist.items.filter(item => !removedKeys.has(item.key));
    }
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
  }
  function stopPlayer(id) {
    const player = $(id);
    if (!player) return;
    try { player.pause(); player.removeAttribute('src'); player.load(); } catch (_) {}
  }
  async function removeOne(item) {
    if (!confirm(`Remove "${item.name}" from NOVA's media library?\n\nThis removes the browser-stored copy and playlist references. Your original computer file will NOT be deleted.`)) return;
    try {
      if (item.type === 'music') await transact('novaPersistentPlaylistDB', 2, 'tracks', 'delete', item.key.slice(6));
      if (item.type === 'video') await transact('novaVideoPlaylistV2', 1, 'videos', 'delete', item.key.slice(6));
      if (item.type === 'youtube') {
        const saved = youtube();
        const index = saved.findIndex(x => x.id === item.key.slice(8));
        if (index !== -1) saved.splice(index, 1);
        if (typeof novaSaveYt === 'function') novaSaveYt();
      }
      updatePlaylists(new Set([item.key]));
      // Refresh private in-memory media state from persistent storage.
      location.reload();
    } catch (error) {
      console.error('NOVA: could not remove library item', error);
      alert('NOVA could not finish removing this item. Check the browser console.');
    }
  }
  async function removeAll(button) {
    const all = items();
    if (!all.length) { alert('NOVA media library is already empty.'); return; }
    const message = `REMOVE ALL ${all.length} ITEMS FROM NOVA MEDIA LIBRARY?\n\n`+
      `${all.filter(x=>x.type==='music').length} songs, `+
      `${all.filter(x=>x.type==='video').length} videos, `+
      `${all.filter(x=>x.type==='youtube').length} YouTube entries.\n\n`+
      'This clears NOVA browser-stored media copies and removes them from playlists. '+
      'Original files on your computer are NOT deleted.\n\nThis cannot be undone inside NOVA.';
    if (!confirm(message)) return;
    button.disabled = true;
    button.textContent = 'REMOVING...';
    try {
      // Remove stored file copies first. If either operation fails, stop and report it.
      await transact('novaPersistentPlaylistDB', 2, 'tracks', 'clear');
      await transact('novaVideoPlaylistV2', 1, 'videos', 'clear');
      stopPlayer('audioPlayer');
      stopPlayer('videoPlayer');
      const saved = youtube();
      if (Array.isArray(saved)) saved.splice(0, saved.length);
      if (typeof novaSaveYt === 'function') novaSaveYt();
      try { localStorage.setItem('novaPersistentPlaylistOrderV1', '[]'); } catch (_) {}
      updatePlaylists(new Set(all.map(x => x.key)));
      location.reload();
    } catch (error) {
      console.error('NOVA: bulk library removal failed', error);
      alert('NOVA could not finish clearing the library. Some items may have been removed. Check the browser console before retrying.');
      button.disabled = false;
      button.textContent = 'REMOVE ALL FROM LIBRARY';
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
    const update = () => {
      const all = items();
      const count = type => all.filter(x => x.type === type).length;
      bar.textContent = `SHOWING ${list.querySelectorAll('.entry').length} / ${all.length} MEDIA  •  ${count('music')} SONGS  •  ${count('video')} VIDEOS  •  ${count('youtube')} YOUTUBE`;
      button.disabled = all.length === 0;
      const query = ($('search')?.value || '').trim().toLowerCase();
      const filter = $('filter')?.value || 'all';
      const visible = all.filter(x => (filter === 'all' || x.type === filter) && x.name.toLowerCase().includes(query));
      list.querySelectorAll('.entry').forEach((row, index) => {
        const item = visible[index];
        if (!item || row.querySelector('.novaRemoveLibrary')) return;
        const add = row.querySelector('button');
        if (add) { add.textContent = '+ PLAYLIST'; add.title = 'Add to selected playlist'; }
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'novaRemoveLibrary';
        remove.dataset.novaRemove = item.key;
        remove.textContent = 'REMOVE FROM LIBRARY';
        remove.title = 'Remove browser copy; original computer file remains';
        remove.addEventListener('click', () => removeOne(item));
        row.append(remove);
      });
    };
    new MutationObserver(update).observe(list, {childList:true});
    $('search')?.addEventListener('input', () => queueMicrotask(update));
    $('filter')?.addEventListener('change', () => queueMicrotask(update));
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
