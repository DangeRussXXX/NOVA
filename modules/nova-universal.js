/* NOVA UNIVERSAL MEDIA CENTER — Phase 1
   Load AFTER modules/nova-media.js. Keeps existing functions intact.
   Playlist metadata is local to this browser; cloud sync is NOT active. */
(function(){
"use strict";
const KEY="novaUniversalPlaylistsV1";
let playlists=[];
try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(data))playlists=data;}catch(e){}
if(!playlists.length)playlists=[{id:"favorites",name:"Favorites",items:[]},{id:"roadtrip",name:"Road Trip Mix",items:[]}];
function save(){try{localStorage.setItem(KEY,JSON.stringify(playlists));}catch(e){console.warn("NOVA playlist save failed",e);}}
function sourceItems(){
 const all=[];
 try{musicLibrary.forEach(x=>all.push({key:"music:"+novaTrackKey(x.file),type:"music",name:x.file.name,url:x.url}));}catch(e){}
 try{videoLibrary.forEach(x=>all.push({key:"video:"+x.file.name+"|"+x.file.size+"|"+x.file.lastModified,type:"video",name:x.file.name,url:x.url}));}catch(e){}
 try{novaYtSaved.forEach(x=>all.push({key:"youtube:"+x.id,type:"youtube",name:x.url||x.id,url:x.url||"https://www.youtube.com/watch?v="+x.id,id:x.id}));}catch(e){}
 return all;
}
function getSource(key){return sourceItems().find(x=>x.key===key)||null;}
function makeItem(x){return {key:x.key,type:x.type,name:x.name,url:x.type==="youtube"?x.url:undefined};}
let embeddedWindow=null;
let embeddedPanel=null;
function open(){
 if(embeddedPanel){
   const showing=embeddedPanel.hidden;
   embeddedPanel.hidden=!showing;
   document.body.classList.toggle("novaEmbeddedMediaMode",showing);
   const btn=document.getElementById("novaMediaPopoutButton");
   if(btn){btn.classList.toggle("novaMediaModeSelected",showing);btn.setAttribute("aria-pressed",String(showing));}
   if(showing)embeddedPanel.scrollIntoView({behavior:"smooth",block:"nearest"});
   return;
 }
 const host=document.querySelector(".novaUnifiedConsole")||document.querySelector(".novaTopStack")||document.querySelector(".mainGrid");
 if(!host){console.error("NOVA Media Mode: dashboard host missing");return;}
 embeddedPanel=document.createElement("section");
 embeddedPanel.id="novaEmbeddedMediaPanel";
 embeddedPanel.className="panel card";
 embeddedPanel.setAttribute("aria-label","NOVA Media Mode");
 embeddedPanel.innerHTML='<div class="novaEmbeddedMediaHeader"><span>⚡ NOVA MEDIA MODE</span><button type="button" class="control" id="novaMediaModeClose">BACK TO NOVA</button></div>';
 const frame=document.createElement("iframe");
 frame.id="novaEmbeddedMediaFrame";
 frame.title="NOVA Media Library and Playlists";
 frame.setAttribute("allow","autoplay; encrypted-media; picture-in-picture");
 embeddedPanel.append(frame);
 host.insertAdjacentElement("afterend",embeddedPanel);
 embeddedPanel.querySelector("#novaMediaModeClose").addEventListener("click",()=>open());
 document.body.classList.add("novaEmbeddedMediaMode");
 const btn=document.getElementById("novaMediaPopoutButton");
 if(btn){btn.classList.add("novaMediaModeSelected");btn.setAttribute("aria-pressed","true");}
 const w=frame.contentWindow;
 embeddedWindow=w;
 w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOVA UNIVERSAL MEDIA CENTER</title><style>
*{box-sizing:border-box}body{margin:0;background:#030b13;color:#d8f5ff;font:14px Segoe UI,Arial,sans-serif}header{padding:15px 20px;border-bottom:1px solid #174c5c;background:#071923;display:flex;align-items:center;justify-content:space-between}h1{margin:0;font-size:19px;color:#38dafa;letter-spacing:2px}main{display:grid;grid-template-columns:minmax(220px,290px) minmax(0,1fr);gap:16px;padding:16px}section,.side{border:1px solid #195064;border-radius:12px;background:#071722;padding:14px;min-width:0}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #246378;border-radius:7px;background:#0a2634;color:#d8f5ff;padding:8px 10px}button:hover{border-color:#42d9fb;color:#42d9fb}button:disabled{opacity:.3;cursor:default}input[type=text],select{width:100%;border:1px solid #246378;background:#04121b;color:#fff;border-radius:7px;padding:9px}input[type=file]{display:none}.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.row>*{flex-shrink:0}.grow{flex:1!important;min-width:100px}h2{font-size:14px;letter-spacing:1px;color:#42d9fb;margin:14px 0 9px}.muted{color:#8aa8b7;font-size:12px}.list{max-height:320px;overflow:auto}.entry{display:flex;align-items:center;gap:7px;padding:8px 5px;border-bottom:1px solid #153643}.entry .name{flex:1;min-width:0;overflow-wrap:anywhere}.entry small{display:block;color:#8aa8b7}.entry button{padding:5px 8px}.selected{background:#103443;border-radius:7px}.stage{height:min(42vw,380px);min-height:210px;background:#000;border:1px solid #1c4556;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden}.stage video,.stage iframe{height:100%;width:100%;border:0}.stage audio{width:90%}.big{font-size:22px;color:#42d9fb;text-align:center;padding:20px}.status{min-height:22px;color:#8ae9ba}.seek{width:100%}.pill{border:1px solid #2c687c;padding:3px 7px;border-radius:30px;color:#86dcec;font-size:10px}#playlistNames .entry{cursor:pointer}#playlistNames .entry .name{font-weight:600}@media(max-width:760px){main{grid-template-columns:1fr}.stage{height:250px}}

/* Embedded NOVA dashboard design */
body{background:#06121c;font-family:Segoe UI,Arial,sans-serif}header{display:none}
main{padding:12px;grid-template-columns:minmax(245px,34%) minmax(0,1fr);gap:12px}
section,.side{border:1px solid #225a70;background:linear-gradient(145deg,#091f2d,#07131e);box-shadow:inset 0 0 20px #051019}
button{background:linear-gradient(#123b4c,#082331);border:1px solid #2d8197;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.06em;min-height:34px}
button:hover{background:#17465a;box-shadow:0 0 10px #29bddd55}
h2{letter-spacing:2px}.selected{background:#124255;border-left:3px solid #39d9f6}
.stage{height:110px;min-height:110px;background:radial-gradient(circle,#113b51,#030c13)}
.stage:has(video),.stage:has(iframe){height:300px}
@media(max-width:800px){main{grid-template-columns:1fr}.stage{height:110px}}
</style></head><body><header><h1>⚡ NOVA UNIVERSAL MEDIA CENTER</h1><button id="close">CLOSE</button></header><main><aside class="side"><h2>YOUR PLAYLISTS</h2><div class="row"><input id="newName" class="grow" type="text" placeholder="New playlist name"><button id="create">+ CREATE</button></div><div id="playlistNames" class="list"></div><h2>MEDIA LIBRARY</h2><input id="search" type="text" placeholder="Search songs, videos, YouTube..."><div class="row"><select id="filter" class="grow"><option value="all">ALL MEDIA</option><option value="music">MUSIC</option><option value="video">VIDEO</option><option value="youtube">YOUTUBE</option></select><button id="refresh">REFRESH</button></div><div class="row"><label><button id="addMusic">+ MUSIC FILES</button></label><button id="addVideos">+ VIDEO FILES</button><button id="addFolder">+ FOLDER</button></div><div class="row"><input id="ytLink" class="grow" type="text" placeholder="Paste YouTube URL"><button id="addYt">+ YOUTUBE</button></div><div id="library" class="list"></div><p class="muted">Adding to a playlist does not delete or move original media files.</p></aside><section><h2>UNIVERSAL PLAYER</h2><div id="stage" class="stage"><div class="big">NOVA READY<br><span class="muted">Choose a playlist item to play</span></div></div><div class="row"><button id="prev">◀◀ PREV</button><button id="toggle">▶ PLAY / PAUSE</button><button id="stop">■ STOP</button><button id="next">NEXT ▶▶</button><label class="grow">VOLUME <input id="volume" type="range" min="0" max="1" step=".01" value=".8"></label></div><input id="seek" class="seek" type="range" min="0" max="100" value="0"><p id="now" class="status">Nothing playing</p><h2>PLAYLIST EDITOR</h2><div class="row"><input id="rename" class="grow" type="text" placeholder="Playlist name"><button id="renameBtn">RENAME</button><button id="deleteBtn">DELETE PLAYLIST</button></div><div class="row"><span id="count" class="muted"></span><button id="clear">CLEAR PLAYLIST</button></div><div id="tracks" class="list"></div><p class="muted">▲ ▼ reorder • REMOVE only removes from this playlist. Local music files must be present in this browser; cloud storage is a future phase.</p></section></main><input id="musicFiles" type="file" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.opus" multiple><input id="videoFiles" type="file" accept="video/*" multiple><input id="folderFiles" type="file" webkitdirectory directory multiple><script>window.addEventListener('beforeunload',()=>{document.querySelectorAll('audio,video').forEach(x=>x.pause())});<\/script></body></html>`);w.document.close();
 const d=w.document,$=id=>d.getElementById(id);let currentId=playlists[0]?.id||"favorites",activeIndex=-1,activeMedia=null,activeType="",ytFrame=null;
 const hybridStage=document.getElementById("novaHybridVideoStage");
 const hybridNow=document.getElementById("novaHybridNowPlaying");
 const hybridTitle=document.getElementById("novaHybridTrackName");
 let hybridVideoVisible=true;
 function hybridMode(type,name){
   document.body.classList.toggle("novaHybridVideoActive",type==="video"||type==="youtube");
   document.body.classList.toggle("novaHybridMusicActive",type==="music");
   if(hybridStage)hybridStage.hidden=type!=="video"&&type!=="youtube";
   if(hybridNow)hybridNow.hidden=!type;
   if(hybridTitle)hybridTitle.textContent=type?"NOW PLAYING: "+name:"";
   const musicTitle=document.getElementById("novaMusicInfoTitle");
   if(type==="music"&&musicTitle)musicTitle.textContent=name;
 }
 function hybridReset(){hybridMode("","");if(hybridStage)hybridStage.replaceChildren();}
 function hybridAction(action){
   if(action==="prev")prev();else if(action==="next")next();
   else if(action==="toggle")$("toggle").click();
 }
 const dashboardButtons=[["novaMediaPrev","prev"],["novaMediaNext","next"],["novaMediaPlayPause","toggle"]];
 const buttonHandlers=[];
 for(const [id,action] of dashboardButtons){const b=document.getElementById(id);if(!b)continue;
   const fn=e=>{if(activeIndex<0)return;e.preventDefault();e.stopImmediatePropagation();hybridAction(action);};
   b.addEventListener("click",fn,true);buttonHandlers.push([b,fn]);
 }
 const backButton=document.getElementById("novaHybridBackOrb");
 const backFn=()=>{if(!hybridStage)return;hybridVideoVisible=!hybridVideoVisible;
   const show=hybridVideoVisible;hybridStage.hidden=!show;
   document.body.classList.toggle("novaHybridVideoActive",show);
   if(backButton)backButton.textContent=show?"RETURN TO ORB":"SHOW VIDEO";
 };
 if(backButton)backButton.addEventListener("click",backFn);
 // Media Mode is persistent: hiding its panel does not interrupt playback.

 const stopEngines=()=>{if(activeMedia){try{activeMedia.pause()}catch(e){}}if(ytFrame){try{ytFrame.contentWindow.postMessage(JSON.stringify({event:"command",func:"stopVideo",args:[]}),"https://www.youtube.com")}catch(e){}}};
 const selected=()=>playlists.find(p=>p.id===currentId);
 const notify=s=>{$("now").textContent=s;};
 const safeName=x=>String(x||"");
 function renderPlaylists(){const box=$("playlistNames");box.replaceChildren();playlists.forEach(p=>{const row=d.createElement("div");row.className="entry"+(p.id===currentId?" selected":"");const name=d.createElement("span");name.className="name";name.textContent=p.name+" ("+p.items.length+")";row.append(name);row.onclick=()=>{stopEngines();currentId=p.id;activeIndex=-1;renderAll();};box.append(row);});}
 function resolve(item){if(item.type==="youtube")return {...item,url:item.url||"https://www.youtube.com/watch?v="+item.key.slice(8),id:item.key.slice(8)};return getSource(item.key);}
 function renderTracks(){const p=selected(),box=$("tracks");box.replaceChildren();if(!p)return;$("rename").value=p.name;$("count").textContent=p.items.length+" ITEMS";p.items.forEach((item,i)=>{const row=d.createElement("div");row.className="entry"+(activeIndex===i?" selected":"");const name=d.createElement("span");name.className="name";name.textContent=item.name;const type=d.createElement("small");type.textContent=item.type.toUpperCase()+(resolve(item)?"":" • FILE NOT ON THIS DEVICE");name.append(type);const play=d.createElement("button");play.textContent="▶";play.title="Play";play.onclick=()=>playAt(i);const up=d.createElement("button");up.textContent="▲";up.disabled=i===0;up.onclick=()=>move(i,-1);const down=d.createElement("button");down.textContent="▼";down.disabled=i===p.items.length-1;down.onclick=()=>move(i,1);const del=d.createElement("button");del.textContent="REMOVE";del.onclick=()=>{if(i===activeIndex){stopEngines();activeIndex=-1;}else if(i<activeIndex)activeIndex--;p.items.splice(i,1);save();renderAll();};row.append(name,play,up,down,del);box.append(row);});}
 function move(i,delta){const p=selected(),j=i+delta;[p.items[i],p.items[j]]=[p.items[j],p.items[i]];if(activeIndex===i)activeIndex=j;else if(activeIndex===j)activeIndex=i;save();renderTracks();}
 function renderLibrary(){const box=$("library");box.replaceChildren();const q=$("search").value.trim().toLowerCase(),filter=$("filter").value;sourceItems().filter(x=>(filter==="all"||x.type===filter)&&x.name.toLowerCase().includes(q)).forEach(item=>{const row=d.createElement("div");row.className="entry";const name=d.createElement("span");name.className="name";name.textContent=item.name;const tag=d.createElement("small");tag.textContent=item.type.toUpperCase();name.append(tag);const add=d.createElement("button");add.textContent="+ ADD";add.onclick=()=>{const p=selected();if(!p)return;if(p.items.some(x=>x.key===item.key)){notify("Already in this playlist.");return;}p.items.push(makeItem(item));save();renderAll();};row.append(name,add);box.append(row);});}
 function renderAll(){renderPlaylists();renderTracks();renderLibrary();}
 function playAt(i){const p=selected(),item=p?.items[i];if(!item)return;const source=resolve(item);if(!source){notify("Media file unavailable on this device. Add it to this browser first.");return;}stopEngines();activeIndex=i;activeType=item.type;const stage=$("stage");stage.replaceChildren();if(hybridStage)hybridStage.replaceChildren();activeMedia=null;ytFrame=null;hybridVideoVisible=true;hybridMode(item.type,item.name);if(backButton)backButton.textContent="RETURN TO ORB";if(item.type==="youtube"){const id=source.id||item.key.slice(8);const frame=document.createElement("iframe");frame.allow="autoplay; encrypted-media; picture-in-picture";frame.allowFullscreen=true;frame.src="https://www.youtube.com/embed/"+encodeURIComponent(id)+"?enablejsapi=1&autoplay=1&playsinline=1";if(hybridStage){hybridStage.append(frame);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(frame);ytFrame=frame;$("seek").disabled=true;}else{const media=document.createElement(item.type==="video"?"video":"audio");media.controls=item.type==="video";media.autoplay=true;media.src=source.url;media.volume=Number($("volume").value);media.addEventListener("ended",()=>next());media.addEventListener("timeupdate",()=>{if(Number.isFinite(media.duration)&&media.duration>0)$("seek").value=String(100*media.currentTime/media.duration)});if(item.type==="video"&&hybridStage){hybridStage.append(media);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(media);activeMedia=media;$("seek").disabled=false;media.play().catch(()=>notify("Playback was blocked. Press PLAY to start."));}notify("NOW PLAYING: "+item.name);renderTracks();}
 function next(){const n=selected()?.items.length||0;if(n)playAt((activeIndex+1+n)%n);}
 function prev(){const n=selected()?.items.length||0;if(n)playAt((activeIndex-1+n)%n);}
 $("prev").onclick=prev;$("next").onclick=next;
 $("toggle").onclick=()=>{if(activeType==="youtube"&&ytFrame){ytFrame.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"https://www.youtube.com");return;}if(!activeMedia){playAt(activeIndex<0?0:activeIndex);return;}if(activeMedia.paused)activeMedia.play().catch(()=>{});else activeMedia.pause();};
 $("stop").onclick=()=>{stopEngines();if(activeMedia)activeMedia.currentTime=0;hybridReset();activeIndex=-1;notify("STOPPED");};
 $("volume").oninput=()=>{if(activeMedia)activeMedia.volume=Number($("volume").value);};
 $("seek").oninput=()=>{if(activeMedia&&Number.isFinite(activeMedia.duration))activeMedia.currentTime=activeMedia.duration*Number($("seek").value)/100;};
 $("create").onclick=()=>{const name=$("newName").value.trim();if(!name)return;const id="p"+Date.now()+Math.random().toString(36).slice(2,7);playlists.push({id,name,items:[]});currentId=id;$("newName").value="";save();renderAll();};
 $("renameBtn").onclick=()=>{const p=selected(),name=$("rename").value.trim();if(p&&name){p.name=name;save();renderAll();}};
 $("deleteBtn").onclick=()=>{const p=selected();if(!p||!w.confirm("Delete playlist '"+p.name+"'? Your original files will remain."))return;stopEngines();playlists=playlists.filter(x=>x!==p);if(!playlists.length)playlists.push({id:"favorites",name:"Favorites",items:[]});currentId=playlists[0].id;activeIndex=-1;save();renderAll();};
 $("clear").onclick=()=>{const p=selected();if(p&&w.confirm("Remove all items from this playlist?")){stopEngines();p.items=[];activeIndex=-1;save();renderAll();}};
 $("search").oninput=renderLibrary;$("filter").onchange=renderLibrary;$("refresh").onclick=renderAll;
 $("addMusic").onclick=()=>$('musicFiles').click();$("addVideos").onclick=()=>$('videoFiles').click();$("addFolder").onclick=()=>$('folderFiles').click();
 $("musicFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";setTimeout(renderLibrary,200);};
 $("folderFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";setTimeout(renderLibrary,200);};
 $("videoFiles").onchange=e=>{const files=Array.from(e.target.files||[]);files.forEach(file=>{if(!videoLibrary.some(x=>x.file.name===file.name&&x.file.size===file.size)){videoLibrary.push({file,url:URL.createObjectURL(file)});try{novaPersistVideo(file)}catch(e){}}});try{novaRenderVideoList()}catch(e){}e.target.value="";renderLibrary();};
 $("addYt").onclick=()=>{const id=extractYouTubeId($("ytLink").value);if(!id){notify("Enter a valid YouTube link or video ID.");return;}if(!novaYtSaved.some(x=>x.id===id)){novaYtSaved.push({id,url:"https://www.youtube.com/watch?v="+id});novaSaveYt();}$("ytLink").value="";renderLibrary();};
 $("close").onclick=()=>open();
 const timer=window.setInterval(()=>{if(!embeddedPanel?.isConnected){clearInterval(timer);return;}if(!embeddedPanel.hidden)renderLibrary();},4000);
 renderAll();
}
/* Override ONLY the Media header button. Existing media APIs remain unchanged. */
function attach(){const button=document.getElementById("novaMediaPopoutButton");if(!button)return;const replacement=button.cloneNode(true);button.replaceWith(replacement);replacement.addEventListener("click",open);replacement.title="Toggle NOVA Media Mode";replacement.setAttribute("aria-pressed","false");}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(attach,0));else setTimeout(attach,0);
window.openNovaUniversalMediaCenter=open;
window.toggleNovaMediaMode=open;
})();
