/* NOVA Media Center — library count + individual remove, no media-mode changes */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'novaUniversalPlaylistsV1';
  const musicKey = file => `${file.name}|${file.size}|${file.lastModified}`;
  function libraryItems() {
    const items=[];
    try { musicLibrary.forEach(x=>items.push({type:'music',key:'music:'+musicKey(x.file),name:x.file.name})); } catch (_) {}
    try { videoLibrary.forEach(x=>items.push({type:'video',key:'video:'+musicKey(x.file),name:x.file.name})); } catch (_) {}
    try { novaYtSaved.forEach(x=>items.push({type:'youtube',key:'youtube:'+x.id,name:x.url||x.id})); } catch (_) {}
    return items;
  }
  function dbDelete(dbName,version,store,key) {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(dbName,version);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store,{keyPath:'key'});
      };
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result;
        try {
          const tx=db.transaction(store,'readwrite');
          tx.objectStore(store).delete(key);
          tx.oncomplete=()=>{db.close();resolve();};
          tx.onerror=()=>{db.close();reject(tx.error);};
          tx.onabort=()=>{db.close();reject(tx.error);};
        } catch(err) {db.close();reject(err);}
      };
    });
  }
  function removePlaylistReferences(key) {
    try {
      const playlists=JSON.parse(localStorage.getItem(KEY)||'[]');
      if(!Array.isArray(playlists))return;
      for(const p of playlists)if(Array.isArray(p.items))p.items=p.items.filter(x=>x.key!==key);
      localStorage.setItem(KEY,JSON.stringify(playlists));
      // The universal module holds an in-memory copy. Refresh to sync it safely.
      // A reload is required because the original module does not expose that copy.
    } catch(err) {console.warn('NOVA playlist reference cleanup:',err);}
  }
  async function removeItem(item) {
    if(!confirm(`Remove "${item.name}" from NOVA's media library?\n\nThis removes its browser-stored copy and its playlist entries. It will NOT delete the original file from your computer.`))return;
    const button=$('library')?.querySelector(`button[data-nova-remove="${CSS.escape(item.key)}"]`);
    if(button)button.disabled=true;
    try {
      if(item.type==='music') {
        await dbDelete('novaPersistentPlaylistDB',2,'tracks',item.key.slice(6));
        const index=musicLibrary.findIndex(x=>musicKey(x.file)===item.key.slice(6));
        if(index!==-1){
          const entry=musicLibrary[index];
          const player=$('audioPlayer');
          if(player && player.src===entry.url){player.pause();player.removeAttribute('src');player.load();}
          try{URL.revokeObjectURL(entry.url);}catch(_){}
          musicLibrary.splice(index,1);
          if(typeof musicIndex!=='undefined')musicIndex=-1;
          try{renderMusicList();}catch(_){}
        }
        try{localStorage.setItem('novaPersistentPlaylistOrderV1',JSON.stringify(musicLibrary.map(x=>musicKey(x.file))));}catch(_){}
        try{updateSavedPlaylistStatus();}catch(_){}
        const count=$('musicCount');if(count)count.textContent=`${musicLibrary.length} tracks`;
      } else if(item.type==='video') {
        await dbDelete('novaVideoPlaylistV2',1,'videos',item.key.slice(6));
        const index=videoLibrary.findIndex(x=>musicKey(x.file)===item.key.slice(6));
        if(index!==-1){
          const entry=videoLibrary[index];
          const player=$('videoPlayer');
          if(player && player.src===entry.url){player.pause();player.removeAttribute('src');player.load();}
          try{URL.revokeObjectURL(entry.url);}catch(_){}
          videoLibrary.splice(index,1);
          try{novaRenderVideoList();}catch(_){}
        }
      } else if(item.type==='youtube') {
        const index=novaYtSaved.findIndex(x=>x.id===item.key.slice(8));
        if(index!==-1){novaYtSaved.splice(index,1);novaSaveYt();try{novaRenderYtSaved();}catch(_){}}
      }
      removePlaylistReferences(item.key);
      // Force an in-memory playlist sync without editing private state: reload the page.
      // Browser storage is already updated before reload.
      location.reload();
    } catch(err) {
      console.error('NOVA library removal failed:',err);
      alert('NOVA could not remove this item from browser storage. Nothing else was deleted. Check the browser console.');
      if(button)button.disabled=false;
    }
  }
  function init() {
    const list=$('library');if(!list)return;
    let bar=$('novaMediaCountBar');
    if(!bar){bar=document.createElement('div');bar.id='novaMediaCountBar';list.before(bar);}
    bar.setAttribute('aria-live','polite');
    const update=()=>{
      const all=libraryItems();
      const count=type=>all.filter(x=>x.type===type).length;
      bar.textContent=`SHOWING ${list.querySelectorAll('.entry').length} / ${all.length} MEDIA  •  ${count('music')} SONGS  •  ${count('video')} VIDEOS  •  ${count('youtube')} YOUTUBE`;
      const lookup=new Map(all.map(x=>[x.key,x]));
      const query=($('search')?.value||'').trim().toLowerCase();
      const filter=$('filter')?.value||'all';
      const visible=all.filter(x=>(filter==='all'||x.type===filter)&&x.name.toLowerCase().includes(query));
      list.querySelectorAll('.entry').forEach((row,index)=>{
        const item=visible[index];if(!item||row.querySelector('.novaRemoveLibrary'))return;
        const add=row.querySelector('button');if(add){add.textContent='+ PLAYLIST';add.title='Add to selected playlist';}
        const remove=document.createElement('button');remove.type='button';remove.className='novaRemoveLibrary';
        remove.dataset.novaRemove=item.key;remove.textContent='REMOVE FROM LIBRARY';
        remove.title='Remove browser copy; original computer file remains';
        remove.addEventListener('click',()=>removeItem(item));
        row.append(remove);
      });
    };
    const observer=new MutationObserver(update);
    observer.observe(list,{childList:true});
    $('search')?.addEventListener('input',()=>queueMicrotask(update));
    $('filter')?.addEventListener('change',()=>queueMicrotask(update));
    update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
