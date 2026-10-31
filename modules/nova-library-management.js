/* NOVA Media Library — consolidated, non-blocking controls.
   Original computer files are never modified or deleted. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PLAYLIST_KEY = 'novaUniversalPlaylistsV1';
  const keyOf = f => `${f.name}|${f.size}|${f.lastModified}`;
  const music = () => { try { return Array.isArray(musicLibrary) ? musicLibrary : []; } catch (_) { return []; } };
  const videos = () => { try { return Array.isArray(videoLibrary) ? videoLibrary : []; } catch (_) { return []; } };
  const youtube = () => { try { return Array.isArray(novaYtSaved) ? novaYtSaved : []; } catch (_) { return []; } };
  const items = () => [
    ...music().filter(x => x && x.file).map(x => ({type:'music', key:'music:'+keyOf(x.file), name:x.file.name})),
    ...videos().filter(x => x && x.file).map(x => ({type:'video', key:'video:'+keyOf(x.file), name:x.file.name})),
    ...youtube().map(x => ({type:'youtube', key:'youtube:'+x.id, name:x.url || x.id}))
  ];

  function modal(message, destructiveLabel='REMOVE') {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'novaLibraryConfirmOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px';
      const panel = document.createElement('div');
      panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
      panel.setAttribute('aria-label','Confirm media library change');
      panel.style.cssText = 'background:#141c25;color:#f4f7fa;border:1px solid #627d92;border-radius:12px;padding:25px;max-width:490px;width:100%;box-shadow:0 16px 70px #000;font:16px/1.5 Arial,sans-serif';
      const title = document.createElement('h3'); title.textContent='NOVA MEDIA LIBRARY'; title.style.cssText='margin:0 0 15px;color:#80e4bd;font-size:20px';
      const body = document.createElement('p'); body.textContent=message; body.style.cssText='white-space:pre-line;margin:0 0 20px';
      const actions = document.createElement('div'); actions.style.cssText='display:flex;gap:12px;justify-content:flex-end';
      const cancel = document.createElement('button'); cancel.type='button'; cancel.textContent='CANCEL';
      const yes = document.createElement('button'); yes.type='button'; yes.textContent=destructiveLabel;
      for(const b of [cancel,yes]) b.style.cssText='font:700 15px Arial;padding:12px 20px;border-radius:7px;cursor:pointer;border:1px solid #8ba1ad;background:#243746;color:white';
      yes.style.background='#9b2929'; yes.style.borderColor='#e65c5c';
      actions.append(cancel,yes); panel.append(title,body,actions); overlay.append(panel);
      const finish = value => { document.removeEventListener('keydown', escape); overlay.remove(); resolve(value); };
      const escape = e => { if(e.key==='Escape') finish(false); };
      document.addEventListener('keydown', escape);
      cancel.addEventListener('click',()=>finish(false)); yes.addEventListener('click',()=>finish(true));
      overlay.addEventListener('click',e=>{if(e.target===overlay) finish(false);});
      document.body.append(overlay); cancel.focus();
    });
  }

  function transact(dbName, version, storeName, operation, key) {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open(dbName,version);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName,{keyPath:'key'});};
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result;
        try {
          const tx=db.transaction(storeName,'readwrite');
          const store=tx.objectStore(storeName);
          if(operation==='clear') store.clear(); else store.delete(key);
          tx.oncomplete=()=>{db.close();resolve();};
          tx.onerror=()=>{db.close();reject(tx.error);};
          tx.onabort=()=>{db.close();reject(tx.error);};
        } catch(error){db.close();reject(error);}
      };
    });
  }
  function updatePlaylists(keys) {
    try {
      const data=JSON.parse(localStorage.getItem(PLAYLIST_KEY)||'[]');
      if(!Array.isArray(data)) return;
      data.forEach(p=>{if(Array.isArray(p.items))p.items=p.items.filter(x=>!keys.has(x.key));});
      localStorage.setItem(PLAYLIST_KEY,JSON.stringify(data));
    } catch(error) { console.warn('NOVA playlist cleanup:',error); }
  }
  function removeInMemory(item) {
    if(item.type==='music') {
      const arr=music(); const i=arr.findIndex(x=>keyOf(x.file)===item.key.slice(6));
      if(i>=0){try{URL.revokeObjectURL(arr[i].url);}catch(_){} arr.splice(i,1);}
      try { localStorage.setItem('novaPersistentPlaylistOrderV1',JSON.stringify(arr.map(x=>keyOf(x.file)))); } catch(_){}
    } else if(item.type==='video') {
      const arr=videos();const i=arr.findIndex(x=>keyOf(x.file)===item.key.slice(6));
      if(i>=0){try{URL.revokeObjectURL(arr[i].url);}catch(_){} arr.splice(i,1);}
    } else {
      const arr=youtube();const i=arr.findIndex(x=>x.id===item.key.slice(8));
      if(i>=0) arr.splice(i,1);
      try { localStorage.setItem('novaYouTubePlaylistV2',JSON.stringify(arr)); } catch(_){}
    }
  }
  async function deleteOne(item,button) {
    if(!await modal(`Remove “${item.name}” from NOVA?\n\nYour original computer file will NOT be deleted.`)) return;
    if(button)button.disabled=true;
    try {
      if(item.type==='music') await transact('novaPersistentPlaylistDB',2,'tracks','delete',item.key.slice(6));
      if(item.type==='video') await transact('novaVideoPlaylistV2',1,'videos','delete',item.key.slice(6));
      removeInMemory(item); updatePlaylists(new Set([item.key]));
      location.reload();
    } catch(error) {
      console.error('NOVA library remove failed:',error);
      if(button)button.disabled=false;
      await modal('NOVA could not remove this item. The original file is safe.','OK');
    }
  }
  async function deleteAll(button) {
    const all=items();
    if(!all.length) return;
    const summary=`Remove all ${all.length} items from NOVA?\n\n${all.filter(x=>x.type==='music').length} songs, ${all.filter(x=>x.type==='video').length} videos, ${all.filter(x=>x.type==='youtube').length} YouTube entries.\n\nOriginal files on your computer will NOT be deleted.`;
    if(!await modal(summary,'REMOVE ALL')) return;
    button.disabled=true;button.textContent='REMOVING...';
    try {
      await transact('novaPersistentPlaylistDB',2,'tracks','clear');
      await transact('novaVideoPlaylistV2',1,'videos','clear');
      all.forEach(removeInMemory);
      localStorage.setItem('novaPersistentPlaylistOrderV1','[]');
      localStorage.setItem('novaYouTubePlaylistV2','[]');
      updatePlaylists(new Set(all.map(x=>x.key)));
      location.reload();
    } catch(error) {
      console.error('NOVA remove all failed:',error);
      button.disabled=false;button.textContent='REMOVE ALL FROM LIBRARY';
      await modal('Some media could not be removed. Original files are safe.','OK');
    }
  }
  function init() {
    const list=$('library'); if(!list) return;
    let bar=$('novaMediaCountBar');
    if(!bar){bar=document.createElement('div');bar.id='novaMediaCountBar';list.before(bar);}
    bar.setAttribute('aria-live','polite');
    let clear=$('novaRemoveAllLibrary');
    if(!clear){clear=document.createElement('button');clear.id='novaRemoveAllLibrary';clear.className='novaRemoveAllLibrary';clear.type='button';clear.textContent='REMOVE ALL FROM LIBRARY';list.before(clear);}
    clear.addEventListener('click',()=>deleteAll(clear));
    let busy=false;
    function refresh() {
      if(busy) return;
      busy=true;
      try {
        const all=items();
        const visible=all.filter(x=>($('filter')?.value==='all'||!$('filter')?.value||x.type===$('filter').value)&&x.name.toLowerCase().includes(($('search')?.value||'').trim().toLowerCase()));
        const rows=[...list.querySelectorAll('.entry')];
        bar.textContent=`SHOWING ${rows.length} / ${all.length} MEDIA  •  ${all.filter(x=>x.type==='music').length} SONGS  •  ${all.filter(x=>x.type==='video').length} VIDEOS  •  ${all.filter(x=>x.type==='youtube').length} YOUTUBE`;
        clear.disabled=!all.length;
        rows.forEach((row,index)=>{
          const item=visible[index];
          let btn=row.querySelector('.novaRemoveLibrary');
          if(!item){if(btn)btn.remove();return;}
          if(!btn){btn=document.createElement('button');btn.type='button';btn.className='novaRemoveLibrary';btn.textContent='REMOVE FROM LIBRARY';row.append(btn);}
          btn.dataset.novaRemove=item.key;
        });
      } finally {busy=false;}
    }
    // Delegation works even when NOVA re-renders the entire library.
    list.addEventListener('click',e=>{
      const btn=e.target.closest?.('.novaRemoveLibrary');
      if(!btn||!list.contains(btn))return;
      e.preventDefault();e.stopImmediatePropagation();
      const item=items().find(x=>x.key===btn.dataset.novaRemove);
      if(item) deleteOne(item,btn);
    },true);
    new MutationObserver(refresh).observe(list,{childList:true});
    $('search')?.addEventListener('input',()=>queueMicrotask(refresh));
    $('filter')?.addEventListener('change',()=>queueMicrotask(refresh));
    $('refresh')?.addEventListener('click',()=>queueMicrotask(refresh));
    // Integrated library used a different file input; bind its visible controls
    // directly to the same working inputs used by NOVA's permanent library.
    const picker=(buttonId,inputId)=>{
      const button=$(buttonId),input=$(inputId);
      if(!button||!input)return;
      button.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        input.value='';input.click();
      },true);
    };
    picker('novaMediaAddMusic','novaPermanentMusicFiles');
    picker('novaMediaAddFolder','novaPermanentFolderFiles');
    refresh();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
