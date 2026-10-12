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







 // NOVA 1.9.6: Adaptive UI moves the existing controls and ticker outside



 // #novaPermanentMedia AFTER initialization. Resolve IDs globally so all



 // callbacks keep finding the SAME original elements after relocation.



 const d=document,$=id=>document.getElementById(id);let currentId=playlists[0]?.id||"favorites",activeIndex=-1,activeMedia=null,activeType="",ytFrame=null;









 // NOVA 1.9.17: Theater layout is owned by index.html (single source of truth).

 const hybridStage=document.getElementById("novaHybridVideoStage");







 const hybridNow=document.getElementById("novaHybridNowPlaying");







 const hybridTitle=document.getElementById("novaHybridTrackName");







 const videoControls=document.getElementById("novaMediaVideoControls");







 // Move the EXISTING video toggle into the permanent top Now Playing card.







 // This preserves the original button and its listener rather than cloning it.







 // Keep the display switch in the header at all times during video playback.



 // The previous version hid its entire parent when returning to the orb.



 const headerVideoSwitch=document.getElementById("novaHybridBackOrb");



 // 1.9.16: Keep theater and its switch outside transformed/clipped dashboard ancestors.

 // Both are moved, never cloned: existing playback and button listeners remain intact.

 const theaterHome=document.querySelector('.novaUnifiedConsole .novaLeftHome');

 if(hybridStage && theaterHome && hybridStage.parentElement!==theaterHome){

   theaterHome.appendChild(hybridStage);

 }

 const videoPanel=document.querySelector(".novaUnifiedConsole");

 if(headerVideoSwitch && videoPanel && headerVideoSwitch.parentElement!==videoPanel)videoPanel.appendChild(headerVideoSwitch);







 let hybridVideoVisible=true;







 function hybridMode(type,name){







   document.body.classList.toggle("novaHybridVideoActive",type==="video"||type==="youtube");







   document.body.classList.toggle("novaHybridMusicActive",type==="music");







   if(hybridStage)hybridStage.hidden=type!=="video"&&type!=="youtube";







   if(hybridNow)hybridNow.hidden=type!=="video"&&type!=="youtube";



   if(headerVideoSwitch)headerVideoSwitch.hidden=type!=="video"&&type!=="youtube";







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







   const fn=e=>{e.preventDefault();e.stopImmediatePropagation();const control=$(action==="toggle"?"toggle":action);if(control)control.click();};







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















 // Stop both the universal player and the original NOVA media engines.







 // The original audioPlayer is separate from activeMedia; failing to pause it







 // causes music and YouTube to play simultaneously.







 const stopEngines=()=>{







   if(activeMedia){try{activeMedia.pause()}catch(e){}}







   if(ytFrame){try{ytFrame.contentWindow.postMessage(JSON.stringify({event:"command",func:"stopVideo",args:[]}),"*")}catch(e){}







     // Remove the old iframe so its audio cannot continue in the background.







     try{ytFrame.removeAttribute("src");ytFrame.remove()}catch(e){} ytFrame=null;







   }







   for(const id of ["audioPlayer","videoPlayer"]){







     const element=document.getElementById(id);







     if(element){try{element.pause()}catch(e){}}







   }







   const legacyYouTube=document.getElementById("youtubeFrame");







   if(legacyYouTube){try{legacyYouTube.contentWindow?.postMessage(JSON.stringify({event:"command",func:"stopVideo",args:[]}),"*")}catch(e){}}







 };







 // NOVA 1.9.5: central playback arbiter for legacy and universal native media.



 // A browser can have several media elements; only one is permitted to play.



 const isNOVAPlayback=el=>el instanceof HTMLMediaElement &&



   el.id!=="desktopCameraVideo" && !el.closest(".cameraViewport") &&



   (el.tagName==="AUDIO" || el.tagName==="VIDEO");



 let activeNative=null;



 document.addEventListener("play",event=>{



   const playing=event.target;



   if(!isNOVAPlayback(playing))return;



   activeNative=playing;



   document.querySelectorAll("audio,video").forEach(other=>{



     if(other!==playing&&isNOVAPlayback(other)){



       try{other.pause()}catch(e){}



     }



   });



   // Stop any iframe players if native media starts.



   if(ytFrame){



     try{ytFrame.contentWindow?.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}),"*")}catch(e){}



   }



   const legacyFrame=document.getElementById("youtubeFrame");



   if(legacyFrame)try{legacyFrame.contentWindow?.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}),"*")}catch(e){}



   const item=selected()?.items[activeIndex];



   const legacyTitle=document.getElementById("novaMusicInfoTitle")?.textContent?.trim();



   const title=(playing===activeMedia&&item?.name)||legacyTitle||playing.dataset.novaTitle||"MEDIA PLAYING";



   emitMediaState("playing",{title});







 },true);



 document.addEventListener("pause",event=>{



   const el=event.target;



   if(!isNOVAPlayback(el)||el!==activeNative)return;



   // Pausing the old player during a handoff must not overwrite the new title.



   queueMicrotask(()=>{if(activeNative===el&&el.paused){emitMediaState("paused");}});



 },true);



 let youtubePaused=false;







 function youtubeCommandLocal(command){







   if(!ytFrame)return;







   try{ytFrame.contentWindow?.postMessage(JSON.stringify({event:"command",func:command,args:[]}),"*")}catch(e){}







 }















 const selected=()=>playlists.find(p=>p.id===currentId);







 const emitMediaState=(state,detail={})=>{



  window.dispatchEvent(new CustomEvent('nova:media-state',{detail:{state,...detail}}));



};



const notify=s=>{if(!/^NOW PLAYING:/i.test(s)){const el=$("now");if(el&&s!=="STOPPED")el.dataset.novaStatus=s;}};







 const safeName=x=>String(x||"");







 function renderPlaylists(){const box=$("playlistNames");box.replaceChildren();playlists.forEach(p=>{const row=d.createElement("div");row.className="entry"+(p.id===currentId?" selected":"");const name=d.createElement("span");name.className="name";name.textContent=p.name+" ("+p.items.length+")";row.append(name);row.onclick=()=>{stopEngines();currentId=p.id;activeIndex=-1;activeMedia=null;activeType="";emitMediaState("stopped");renderAll();};box.append(row);});}







 function resolve(item){if(item.type==="youtube")return {...item,url:item.url||"https://www.youtube.com/watch?v="+item.key.slice(8),id:item.key.slice(8)};return getSource(item.key);}







 function renderTracks(){const p=selected(),box=$("tracks");box.replaceChildren();if(!p)return;$("rename").value=p.name;$("count").textContent=p.items.length+" ITEMS";p.items.forEach((item,i)=>{const row=d.createElement("div");row.className="entry"+(activeIndex===i?" selected":"");const name=d.createElement("span");name.className="name";name.textContent=item.name;const type=d.createElement("small");type.textContent=item.type.toUpperCase()+(resolve(item)?"":" • FILE NOT ON THIS DEVICE");name.append(type);const play=d.createElement("button");play.textContent="▶";play.title="Play";play.onclick=()=>playAt(i);const up=d.createElement("button");up.textContent="▲";up.disabled=i===0;up.onclick=()=>move(i,-1);const down=d.createElement("button");down.textContent="▼";down.disabled=i===p.items.length-1;down.onclick=()=>move(i,1);const del=d.createElement("button");del.textContent="REMOVE";del.onclick=()=>{if(i===activeIndex){stopEngines();activeIndex=-1;}else if(i<activeIndex)activeIndex--;p.items.splice(i,1);save();renderAll();};row.append(name,play,up,down,del);box.append(row);});}







 function move(i,delta){const p=selected(),j=i+delta;[p.items[i],p.items[j]]=[p.items[j],p.items[i]];if(activeIndex===i)activeIndex=j;else if(activeIndex===j)activeIndex=i;save();renderTracks();}







 function renderLibrary(){const box=$("library");const scroll=box.scrollTop;box.replaceChildren();const q=$("search").value.trim().toLowerCase(),filter=$("filter").value;sourceItems().filter(x=>(filter==="all"||x.type===filter)&&x.name.toLowerCase().includes(q)).forEach(item=>{const row=d.createElement("div");row.className="entry";const name=d.createElement("span");name.className="name";name.textContent=item.name;const tag=d.createElement("small");tag.textContent=item.type.toUpperCase();name.append(tag);const add=d.createElement("button");add.textContent="+ ADD";add.onclick=()=>{const p=selected();if(!p)return;if(p.items.some(x=>x.key===item.key)){notify("Already in this playlist.");return;}p.items.push(makeItem(item));save();renderAll();};row.append(name,add);box.append(row);});box.scrollTop=scroll;}







 function renderAll(){renderPlaylists();renderTracks();renderLibrary();}







 // YouTube's iframe does not emit the HTMLMediaElement "ended" event.
 // Subscribe to the official IFrame Player API to advance the existing playlist.
 let novaYtApiPromise=null;
 let novaYtPlayer=null;
 let novaYtGeneration=0;
 let novaYtEndHandled=false;
 function novaLoadYouTubeApi(){
   if(window.YT && typeof window.YT.Player==="function")return Promise.resolve(window.YT);
   if(novaYtApiPromise)return novaYtApiPromise;
   novaYtApiPromise=new Promise((resolve,reject)=>{
     const previous=window.onYouTubeIframeAPIReady;
     window.onYouTubeIframeAPIReady=function(){
       if(typeof previous==="function")try{previous()}catch(error){console.warn("NOVA: earlier YouTube API callback failed",error)}
       resolve(window.YT);
     };
     if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
       const script=document.createElement("script");
       script.src="https://www.youtube.com/iframe_api";
       script.onerror=()=>{novaYtApiPromise=null;reject(new Error("YouTube IFrame API failed to load"));};
       document.head.appendChild(script);
     }
   });
   return novaYtApiPromise;
 }
 function novaWatchYouTubeEnd(frame,generation){
   novaLoadYouTubeApi().then(YT=>{
     if(generation!==novaYtGeneration || frame!==ytFrame || !frame.isConnected)return;
     novaYtPlayer=new YT.Player(frame,{
       events:{
         onStateChange:event=>{
           if(generation!==novaYtGeneration || activeType!=="youtube" || frame!==ytFrame)return;
           if(event.data===YT.PlayerState.PLAYING){youtubePaused=false;novaYtEndHandled=false;}
           if(event.data===YT.PlayerState.ENDED && !novaYtEndHandled){
             novaYtEndHandled=true;
             next();
           }
         },
         onError:event=>console.warn("NOVA YouTube player error:",event.data)
       }
     });
   }).catch(error=>console.warn("NOVA YouTube autoplay listener unavailable:",error));
 }

 function playAt(i){const p=selected(),item=p?.items[i];if(!item)return;const source=resolve(item);if(!source){notify("Media file unavailable. Restore or re-add the file.");renderTracks();return;}novaYtGeneration++;novaYtEndHandled=false;novaYtPlayer=null;stopEngines();youtubePaused=false;activeIndex=i;activeType=item.type;let stage=$("novaNativeAudioStage");if(!stage){stage=document.createElement("div");stage.id="novaNativeAudioStage";stage.hidden=true;host.append(stage);}stage.replaceChildren();if(hybridStage)hybridStage.replaceChildren();activeMedia=null;ytFrame=null;hybridVideoVisible=true;hybridMode(item.type,item.name);if(backButton)backButton.textContent="RETURN TO ORB";if(item.type==="youtube"){const id=source.id||item.key.slice(8);const frame=document.createElement("iframe");frame.allow="autoplay; encrypted-media; picture-in-picture";frame.allowFullscreen=true;frame.src="https://www.youtube.com/embed/"+encodeURIComponent(id)+"?enablejsapi=1&autoplay=1&playsinline=1";if(hybridStage){hybridStage.append(frame);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(frame);ytFrame=frame;novaWatchYouTubeEnd(frame,novaYtGeneration);$("seek").disabled=true;}else{const media=document.createElement(item.type==="video"?"video":"audio");media.controls=item.type==="video";media.autoplay=false;media.src=source.url;media.volume=Number($("volume").value);media.addEventListener("ended",()=>next());media.addEventListener("timeupdate",()=>{if(Number.isFinite(media.duration)&&media.duration>0)$("seek").value=String(100*media.currentTime/media.duration)});if(item.type==="video"&&hybridStage){hybridStage.append(media);stage.textContent="VIDEO PLAYING ON NOVA DASHBOARD";}else stage.append(media);activeMedia=media;$("seek").disabled=false;media.play().catch(()=>{notify("Playback was blocked. Press PLAY to start.");emitMediaState("paused",{title:item.name});});}notify("NOW PLAYING: "+item.name);



  if(item.type==="youtube"){



    // The YouTube iframe uses its own player, so publish its selected title.







    emitMediaState("playing",{title:item.name,type:item.type});



  }



  renderTracks();}







 // Voice commands use the original #audioPlayer / musicLibrary engine.



 // Route the SAME dashboard buttons to that engine when it owns playback.



 function legacyMusicIsActive(){



   const audio=document.getElementById('audioPlayer');



   return !!(audio && audio.currentSrc && activeNative===audio && !audio.ended);



 }



 function legacyMusicAction(action){



   const audio=document.getElementById('audioPlayer');



   if(!audio)return false;



   if(action==='toggle'){



     if(audio.paused){



       const result=audio.play();



       if(result&&typeof result.catch==='function')result.catch(err=>console.warn('NOVA legacy resume:',err));



     }else audio.pause();



   }else{



     const fn=action==='next'?window.nextMusic:window.previousMusic;



     if(typeof fn==='function')fn();



     else console.warn('NOVA: legacy '+action+' handler is unavailable');



   }



   return true;



 }



 function advancePlaylist(direction){
   const items=selected()?.items||[];
   const n=items.length;
   if(!n)return;
   for(let step=1;step<=n;step++){
     const i=((activeIndex+direction*step)%n+n)%n;
     if(resolve(items[i])){playAt(i);return;}
   }
   notify("No playable tracks in this playlist. Restore the media files.");
 }
 function next(){if(legacyMusicIsActive()){legacyMusicAction('next');return;}advancePlaylist(1);}







 function prev(){if(legacyMusicIsActive()){legacyMusicAction('prev');return;}advancePlaylist(-1);}







 $("prev").onclick=prev;$("next").onclick=next;







 $("toggle").onclick=()=>{







   if(legacyMusicIsActive()){const wasPlaying=!document.getElementById('audioPlayer').paused;legacyMusicAction('toggle');return;}







   if(activeType==="youtube"&&ytFrame){youtubeCommandLocal(youtubePaused?"playVideo":"pauseVideo");youtubePaused=!youtubePaused;emitMediaState(youtubePaused?'paused':'playing',{title:selected()?.items[activeIndex]?.name||'',type:'youtube'});return;}







   // Named playlists take priority when using PLAY.
   if(!activeMedia && activeType!=="youtube" && selected()?.items.length){
     advancePlaylist(1);
     return;
   }
   // First Play after page load follows the same path as "NOVA, play music".



   // Do not create a second universal audio element for the initial click.



   if(!activeMedia){



     const legacyAudio=document.getElementById('audioPlayer');



     if(legacyAudio && legacyAudio.currentSrc && !legacyAudio.ended){



       legacyMusicAction('toggle');







       return;



     }



     if(typeof window.playMusic==='function'){



       window.playMusic();



       // Actual media play events keep the visual indicator synchronized.



       return;



     }



     // Fallback for standalone universal playlists when no legacy library exists.



     playAt(activeIndex<0?0:activeIndex);



     return;



   }







   if(activeMedia.paused){activeMedia.play().catch(()=>{});}else{activeMedia.pause();}



    // play/pause DOM events update the ticker and button after the state actually changes.







 };







 $("stop").onclick=()=>{stopEngines();if(activeMedia){try{activeMedia.currentTime=0}catch(e){}}activeMedia=null;activeType="";youtubePaused=false;hybridReset();activeIndex=-1;notify("STOPPED");emitMediaState('stopped');};







 $("volume").oninput=()=>{



    const value=Number($("volume").value);



    if(activeMedia)activeMedia.volume=value;



    for(const id of ['audioPlayer','videoPlayer']){const el=document.getElementById(id);if(el)el.volume=value;}



    if(ytFrame)try{ytFrame.contentWindow?.postMessage(JSON.stringify({event:'command',func:'setVolume',args:[Math.round(value*100)]}),'*');}catch(e){}



  };







 $("seek").oninput=()=>{if(activeMedia&&Number.isFinite(activeMedia.duration)&&activeMedia.duration>0)activeMedia.currentTime=activeMedia.duration*Number($("seek").value)/100;};







 $("create").onclick=()=>{const name=$("newName").value.trim();if(!name)return;const id="p"+Date.now()+Math.random().toString(36).slice(2,7);playlists.push({id,name,items:[]});currentId=id;$("newName").value="";save();renderAll();};







 $("renameBtn").onclick=()=>{const p=selected(),name=$("rename").value.trim();if(p&&name){p.name=name;save();renderAll();}};







 $("deleteBtn").onclick=()=>{const p=selected();if(!p||!w.confirm("Delete playlist '"+p.name+"'? Your original files will remain."))return;stopEngines();playlists=playlists.filter(x=>x!==p);if(!playlists.length)playlists.push({id:"favorites",name:"Favorites",items:[]});currentId=playlists[0].id;activeIndex=-1;save();renderAll();};







 $("clear").onclick=()=>{const p=selected();if(p&&w.confirm("Remove all items from this playlist?")){stopEngines();p.items=[];activeIndex=-1;save();renderAll();}};







 $("search").oninput=renderLibrary;$("filter").onchange=renderLibrary;$("refresh").onclick=renderAll;







 $("addMusic").onclick=()=>$('novaPermanentMusicFiles').click();$("addVideos").onclick=()=>$('novaPermanentVideoFiles').click();$("addFolder").onclick=()=>$('novaPermanentFolderFiles').click();







 $("novaPermanentMusicFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";renderLibrary();};







 $("novaPermanentFolderFiles").onchange=e=>{addMusicFiles(e.target.files,false,true);e.target.value="";setTimeout(renderLibrary,200);};







 $("novaPermanentVideoFiles").onchange=e=>{const files=Array.from(e.target.files||[]);files.forEach(file=>{if(!videoLibrary.some(x=>x.file.name===file.name&&x.file.size===file.size)){videoLibrary.push({file,url:URL.createObjectURL(file)});try{novaPersistVideo(file)}catch(e){}}});try{novaRenderVideoList()}catch(e){}e.target.value="";renderLibrary();};







 $("addYt").onclick=()=>{const id=extractYouTubeId($("ytLink").value);if(!id){notify("Enter a valid YouTube link or video ID.");return;}if(!novaYtSaved.some(x=>x.id===id)){novaYtSaved.push({id,url:"https://www.youtube.com/watch?v="+id});novaSaveYt();}$("ytLink").value="";renderLibrary();};















   // NOVA 1.9.3: Bridge the EXISTING playback bar to whichever NOVA engine is active.



  // The scoped universal controller remains the owner of playlists and track selection.



  const barIds=['prev','stop','next'];



  const nativeEngine=()=>{



    if(activeMedia&&!activeMedia.paused&&!activeMedia.ended)return activeMedia;



    for(const id of ['audioPlayer','videoPlayer']){



      const el=document.getElementById(id);



      if(el&&el.currentSrc&&!el.paused&&!el.ended)return el;



    }



    return activeMedia||null;



  };



  for(const id of barIds){



    const btn=$(id);if(!btn)continue;



    btn.addEventListener('click',e=>{



      const legacy=nativeEngine();



      if(!legacy||legacy===activeMedia)return;



      // If an existing legacy engine is playing, use its own functions.



      if(id==='toggle'){e.stopImmediatePropagation();legacy.paused?legacy.play().catch(()=>{}):legacy.pause();}



      else if(id==='stop'){e.stopImmediatePropagation();legacy.pause();try{legacy.currentTime=0;}catch(_){}emitMediaState('stopped');}



      else if(id==='prev'&&typeof window.previousSong==='function'){e.stopImmediatePropagation();window.previousSong();}



      else if(id==='next'&&typeof window.nextSong==='function'){e.stopImmediatePropagation();window.nextSong();}



    },true);



  }



  // Keep seek and volume synchronized when a legacy native player is active.



  const seekEl=$('seek'),volEl=$('volume');



  seekEl?.addEventListener('input',()=>{



    if(activeIndex>=0)return;



    const el=nativeEngine();



    if(el&&Number.isFinite(el.duration)&&el.duration>0)el.currentTime=el.duration*Number(seekEl.value)/100;



  });



  volEl?.addEventListener('input',()=>{



    if(activeIndex>=0)return;



    const el=nativeEngine();if(el)el.volume=Number(volEl.value);



  });



  const mediaClock=window.setInterval(()=>{



    if(!host.isConnected){clearInterval(mediaClock);return;}



    const el=nativeEngine();



    if(el&&Number.isFinite(el.duration)&&el.duration>0){



      if(document.activeElement!==seekEl)seekEl.value=String(Math.max(0,Math.min(100,el.currentTime/el.duration*100)));



      seekEl.disabled=false;



    }



  },400);



// NOVA 1.9.10: one action-oriented button indicator.



  // PLAY (▶) means click to resume; PAUSE (Ⅱ) means click to pause.



  // Playback events are authoritative, including voice-started legacy music.



  const playIndicator=$('toggle');



  const compactIndicator=document.getElementById('novaMediaPlayPause');



  function actualPlaying(){



    return Array.from(document.querySelectorAll('audio,video'))



      .some(el=>isNOVAPlayback(el)&&!el.paused&&!el.ended&&!!el.currentSrc)



      ||!!(ytFrame&&activeType==='youtube'&&!youtubePaused);



  }



  function paintPlayButton(playing){



    for(const button of [playIndicator,compactIndicator]){



      if(!button)continue;



      button.textContent=playing?'Ⅱ':'▶';



      button.title=playing?'Pause music':'Play music';



      button.setAttribute('aria-label',playing?'Pause music':'Play music');



      button.setAttribute('aria-pressed',String(playing));



    }



  }



  // Do not toggle the icon optimistically in capture listeners: the playback



  // handler already changes the real media state, and double-toggling was



  // causing the icon to disagree with what the player was doing.



  for(const name of ['play','playing','pause','ended']){



    document.addEventListener(name,()=>queueMicrotask(()=>paintPlayButton(actualPlaying())),true);



  }



  // Other NOVA scripts can start playback via voice; reflect that as well.



  const indicatorTimer=window.setInterval(()=>{



    if(!host.isConnected){clearInterval(indicatorTimer);return;}



    paintPlayButton(actualPlaying());



  },350);



  paintPlayButton(actualPlaying());







  // Public volume setter used by NOVA's existing voice command router.



  // Dispatching input keeps the current volume bar and legacy engine in sync.



  window.novaSetMediaVolumePercent=function(percent){



    const level=Math.max(0,Math.min(100,Number(percent)));



    if(!Number.isFinite(level))return false;



    const value=level/100;



    const slider=$('volume');



    if(slider){slider.value=String(value);slider.dispatchEvent(new Event('input',{bubbles:true}));}



    for(const el of [activeMedia,document.getElementById('audioPlayer'),document.getElementById('videoPlayer')]){



      if(el){el.volume=value;el.muted=false;}



    }



    const oldSlider=document.getElementById('musicVolume');



    if(oldSlider)oldSlider.value=String(value);



    const videoSlider=document.getElementById('videoVolume');



    if(videoSlider)videoSlider.value=String(value);



    if(ytFrame){try{ytFrame.contentWindow?.postMessage(JSON.stringify({event:'command',func:'setVolume',args:[level]}),'*');}catch(e){}}



    return true;



  };







    window.addEventListener("nova:library-updated",()=>{renderLibrary();renderTracks();});
    window.addEventListener("focus",()=>{renderLibrary();renderTracks();});







 renderAll();







}







if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializePermanentMedia);







else initializePermanentMedia();







window.openNovaUniversalMediaCenter=()=>document.getElementById("novaPermanentMedia")?.scrollIntoView({behavior:"smooth",block:"nearest"});







})();
