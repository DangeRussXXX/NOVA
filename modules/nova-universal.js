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
function initializePermanentMedia(){
 const host=document.getElementById("novaPermanentMedia");
 if(!host)return;
 const w=window;
 const d=document,$=id=>document.getElementById(id);let currentId=playlists[0]?.id||"favorites",activeIndex=-1,activeMedia=null,activeType="",ytFrame=null;
 const hybridStage=document.getElementById("novaHybridVideoStage");
 const hybridNow=document.getElementById("novaHybridNowPlaying");
 const hybridTitle=document.getElementById("novaHybridTrackName");
 const videoControls=document.getElementById("novaMediaVideoControls");
 // Move the EXISTING video toggle into the permanent top Now Playing card.
 // This preserves the original button and its listener rather than cloning it.
 if(videoControls&&hybridNow)videoControls.appendChild(hybridNow);
 let hybridVideoVisible=true;
 function hybridMode(type,name){
   document.body.classList.toggle("novaHybridVideoActive",type==="video"||type==="youtube");
   document.body.classList.toggle("novaHybridMusicActive",type==="music");
   if(hybridStage)hybridStage.hidden=type!=="video"&&type!=="youtube";
   if(hybridNow)hybridNow.hidden=type!=="video"&&type!=="youtube";
   hybridVideoVisible=type==="video"||type==="youtube";
   if(backButton)backButton.textContent="RETURN TO ORB";
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
 const backFn=()=>{
   if(!hybridStage||!(activeType==="video"||activeType==="youtube"))return;
   hybridVideoVisible=!hybridVideoVisible;
   hybridStage.hidden=!hybridVideoVisible;
   document.body.classList.toggle("novaHybridVideoActive",hybridVideoVisible);
   if(backButton){backButton.textContent=hybridVideoVisible?"RETURN TO ORB":"SHOW VIDEO";
     backButton.setAttribute("aria-pressed",String(hybridVideoVisible));}
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
 function playAt(i){const p=selected(),item=p?.items[i];if(!item)return;const source=resolve(item);if(!source){notify("Media file unavailable on this device. Add it to this browser first.");return;}stopEngines();activeIndex=i;activeType=item.type;let stage=$("novaNativeAudioStage");if(!stage){stage=document.createElement("div");stage.id="novaNativeAudioStage";stage.hidden=true;host.append(stage);}stage.replaceChildren();if(hybridStage)hybridStage.replaceChildren();activeMedia=null;ytFrame=null;hybridVideoVisible=true;hybridMode(item.type,item.name);if(backButton)backButton.textContent="RETURN TO ORB";if(item.type==="youtube"){const id=source.id||item.key.slice(8);const frame=document.createElement("iframe");frame.allow="autoplay; encrypted-media; picture-in-picture";frame.allowFullscreen=true;frame.src="https://www.youtube.com/embed/"+encodeURIComponent(id)+"?enablejsapi=1&autoplay=1&playsinline=1";if(hybridStage){hybridStage.append(frame);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(frame);ytFrame=frame;$("seek").disabled=true;}else{const media=document.createElement(item.type==="video"?"video":"audio");media.controls=item.type==="video";media.autoplay=true;media.src=source.url;media.volume=Number($("volume").value);media.addEventListener("ended",()=>next());media.addEventListener("timeupdate",()=>{if(Number.isFinite(media.duration)&&media.duration>0)$("seek").value=String(100*media.currentTime/media.duration)});if(item.type==="video"&&hybridStage){hybridStage.append(media);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(media);activeMedia=media;$("seek").disabled=false;media.play().catch(()=>notify("Playback was blocked. Press PLAY to start."));}notify("NOW PLAYING: "+item.name);renderTracks();}
 function next(){const n=selected()?.items.length||0;if(n)playAt((activeIndex+1+n)%n);}
 function prev(){const n=selected()?.items.length||0;if(n)playAt((activeIndex-1+n)%n);}
 $("prev").onclick=prev;$("next").onclick=next;
 $("toggle").onclick=()=>{if(activeType==="youtube"&&ytFrame){ytFrame.contentWindow.postMessage(JSON.stringify({event:"command",func:"playVideo",args:[]}),"https://www.youtube.com");return;}if(!activeMedia){playAt(activeIndex<0?0:activeIndex);return;}if(activeMedia.paused)activeMedia.play().catch(()=>{});else activeMedia.pause();};
 $("stop").onclick=()=>{stopEngines();if(activeMedia)activeMedia.currentTime=0;activeType="";hybridReset();activeIndex=-1;notify("STOPPED");};
 $("volume").oninput=()=>{if(activeMedia)activeMedia.volume=Number($("volume").value);};
 $("seek").oninput=()=>{if(activeMedia&&Number.isFinite(activeMedia.duration))activeMedia.currentTime=activeMedia.duration*Number($("seek").value)/100;};
 $("create").onclick=()=>{const name=$("newName").value.trim();if(!name)return;const id="p"+Date.now()+Math.random().toString(36).slice(2,7);playlists.push({id,name,items:[]});currentId=id;$("newName").value="";save();renderAll();};
 $("renameBtn").onclick=()=>{const p=selected(),name=$("rename").value.trim();if(p&&name){p.name=name;save();renderAll();}};
 $("deleteBtn").onclick=()=>{const p=selected();if(!p||!w.confirm("Delete playlist '"+p.name+"'? Your original files will remain."))return;stopEngines();playlists=playlists.filter(x=>x!==p);if(!playlists.length)playlists.push({id:"favorites",name:"Favorites",items:[]});currentId=playlists[0].id;activeIndex=-1;save();renderAll();};
 $("clear").onclick=()=>{const p=selected();if(p&&w.confirm("Remove all items from this playlist?")){stopEngines();p.items=[];activeIndex=-1;save();renderAll();}};
 $("search").oninput=renderLibrary;$("filter").onchange=renderLibrary;$("refresh").onclick=renderAll;
 $("addMusic").onclick=()=>$('novaPermanentMusicFiles').click();$("addVideos").onclick=()=>$('novaPermanentVideoFiles').click();$("addFolder").onclick=()=>$('novaPermanentFolderFiles').click();
 $("novaPermanentMusicFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";setTimeout(renderLibrary,200);};
 $("novaPermanentFolderFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";setTimeout(renderLibrary,200);};
 $("novaPermanentVideoFiles").onchange=e=>{const files=Array.from(e.target.files||[]);files.forEach(file=>{if(!videoLibrary.some(x=>x.file.name===file.name&&x.file.size===file.size)){videoLibrary.push({file,url:URL.createObjectURL(file)});try{novaPersistVideo(file)}catch(e){}}});try{novaRenderVideoList()}catch(e){}e.target.value="";renderLibrary();};
 $("addYt").onclick=()=>{const id=extractYouTubeId($("ytLink").value);if(!id){notify("Enter a valid YouTube link or video ID.");return;}if(!novaYtSaved.some(x=>x.id===id)){novaYtSaved.push({id,url:"https://www.youtube.com/watch?v="+id});novaSaveYt();}$("ytLink").value="";renderLibrary();};

 const timer=window.setInterval(()=>{if(!host.isConnected){clearInterval(timer);return;}renderLibrary();},4000);
 renderAll();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializePermanentMedia);
else initializePermanentMedia();
window.openNovaUniversalMediaCenter=()=>document.getElementById("novaPermanentMedia")?.scrollIntoView({behavior:"smooth",block:"nearest"});
})();
