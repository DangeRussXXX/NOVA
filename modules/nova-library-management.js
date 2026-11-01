/* NOVA library removal — delegated events, in-page confirmations, IndexedDB persistence. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const trackKey=f=>`${f.name}|${f.size}|${f.lastModified}`;
const media=()=>{
 const a=[];
 try{musicLibrary.forEach(x=>a.push({type:'music',key:'music:'+trackKey(x.file),name:x.file.name}));}catch(e){}
 try{videoLibrary.forEach(x=>a.push({type:'video',key:'video:'+trackKey(x.file),name:x.file.name}));}catch(e){}
 try{novaYtSaved.forEach(x=>a.push({type:'youtube',key:'youtube:'+x.id,name:x.url||x.id}));}catch(e){}
 return a;
};
function dialog(message){return new Promise(resolve=>{
 const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000b;display:flex;align-items:center;justify-content:center;padding:20px';
 const panel=document.createElement('div');panel.style.cssText='max-width:480px;width:100%;padding:25px;background:#122333;color:#fff;border:2px solid #4bbde5;border-radius:12px;box-shadow:0 15px 55px #000';
 const title=document.createElement('h2');title.textContent='NOVA MEDIA LIBRARY';title.style.margin='0 0 12px';
 const body=document.createElement('p');body.textContent=message;body.style.cssText='white-space:pre-line;line-height:1.5';
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:12px;justify-content:flex-end;margin-top:20px';
 function finish(value){document.removeEventListener('keydown',esc,true);overlay.remove();resolve(value)}
 function esc(e){if(e.key==='Escape'){e.stopPropagation();finish(false)}}
 for(const [label,value] of [['CANCEL',false],['REMOVE',true]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:10px 18px;background:'+(value?'#b93535':'#36566a')+';color:white;border:1px solid #9ab5c8;border-radius:6px;cursor:pointer';b.addEventListener('click',()=>finish(value));actions.append(b)}
 panel.append(title,body,actions);overlay.append(panel);document.body.append(overlay);document.addEventListener('keydown',esc,true);
 actions.firstChild.focus();
})}
function dbAction(name,version,store,operation,key){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(name,version);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(store))req.result.createObjectStore(store,{keyPath:'key'})};
 req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result;let tx;try{tx=db.transaction(store,'readwrite');const s=tx.objectStore(store);operation==='clear'?s.clear():s.delete(key)}catch(e){db.close();reject(e);return}tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error)}};
})}
function prune(keys){try{const k='novaUniversalPlaylistsV1',ps=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(ps)){ps.forEach(p=>{if(Array.isArray(p.items))p.items=p.items.filter(x=>!keys.has(x.key))});localStorage.setItem(k,JSON.stringify(ps))}}catch(e){console.warn('NOVA playlist cleanup:',e)}}
async function remove(targets){const all=media();const keys=new Set(targets.map(x=>x.key));
 if(targets.length===all.length){await dbAction('novaPersistentPlaylistDB',2,'tracks','clear');await dbAction('novaVideoPlaylistV2',1,'videos','clear');try{localStorage.setItem('novaPersistentPlaylistOrderV1','[]')}catch(e){}}
 else for(const x of targets){if(x.type==='music')await dbAction('novaPersistentPlaylistDB',2,'tracks','delete',x.key.slice(6));if(x.type==='video')await dbAction('novaVideoPlaylistV2',1,'videos','delete',x.key.slice(6))}
 try{for(const x of targets.filter(x=>x.type==='youtube')){const i=novaYtSaved.findIndex(y=>y.id===x.key.slice(8));if(i>=0)novaYtSaved.splice(i,1)}if(targets.some(x=>x.type==='youtube')&&typeof novaSaveYt==='function')novaSaveYt()}catch(e){console.warn(e)}
 prune(keys);location.reload();
}
function init(){const list=$('library');if(!list)return;
 let bar=$('novaMediaCountBar');if(!bar){bar=document.createElement('div');bar.id='novaMediaCountBar';list.before(bar)}
 let clear=$('novaRemoveAllLibrary');if(!clear){clear=document.createElement('button');clear.id='novaRemoveAllLibrary';clear.type='button';clear.className='novaRemoveAllLibrary';clear.textContent='REMOVE ALL FROM LIBRARY';list.before(clear)}
 let busy=false;
 async function act(targets){if(busy||!targets.length)return;const msg=targets.length===1?`Remove "${targets[0].name}" from NOVA's library?\n\nYour original computer file will NOT be deleted.`:`Remove ALL ${targets.length} media items from NOVA?\n\nYour original computer files will NOT be deleted.`;if(!await dialog(msg))return;busy=true;try{await remove(targets)}catch(e){console.error('NOVA media removal failed',e);const msg=document.createElement('p');msg.textContent='Could not remove media: '+e.message;msg.style.color='#ff9999';bar.after(msg);busy=false}}
 clear.addEventListener('click',()=>act(media()));
 // Delegate clicks: rows are re-created on every search/filter/library refresh.
 list.addEventListener('click',e=>{const b=e.target.closest('.novaRemoveLibrary');if(!b)return;e.preventDefault();e.stopPropagation();const x=media().find(x=>x.key===b.dataset.novaRemove);if(x)act([x])});
 function refresh(){const all=media(),q=($('search')?.value||'').trim().toLowerCase(),f=$('filter')?.value||'all';const visible=all.filter(x=>(f==='all'||x.type===f)&&x.name.toLowerCase().includes(q));const rows=list.querySelectorAll('.entry');bar.textContent=`SHOWING ${rows.length} / ${all.length} MEDIA • ${all.filter(x=>x.type==='music').length} SONGS • ${all.filter(x=>x.type==='video').length} VIDEOS • ${all.filter(x=>x.type==='youtube').length} YOUTUBE`;clear.disabled=!all.length;rows.forEach((row,i)=>{const item=visible[i];if(!item)return;let b=row.querySelector('.novaRemoveLibrary');if(!b){b=document.createElement('button');b.type='button';b.className='novaRemoveLibrary';b.textContent='REMOVE FROM LIBRARY';row.append(b)}b.dataset.novaRemove=item.key})}
 new MutationObserver(refresh).observe(list,{childList:true});$('search')?.addEventListener('input',()=>queueMicrotask(refresh));$('filter')?.addEventListener('change',()=>queueMicrotask(refresh));refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
