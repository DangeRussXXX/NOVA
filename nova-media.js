/* ============================================================
   NOVA MEDIA MODULE
   Extracted from the working NOVA index without changing the
   existing media architecture. Classic script — not type=module.
   ============================================================ */

/* ============================================================
   MEDIA
   ============================================================ */

let musicLibrary = [];
let musicIndex = -1;
let musicShuffle = false;
let musicRepeat = false;

let videoLibrary = [];
let videoIndex = -1;

let youtubeVideoId = "";


/* ============================================================
   MEDIA INITIALIZATION
   ============================================================ */


function ensureIrisMediaDisplay(){}
function cleanMediaName(name){return String(name||"MEDIA").replace(/\.[^.]+$/,"").replace(/[_]+/g," ").trim()}
function formatMediaClock(s){if(!Number.isFinite(s)||s<0)return"0:00";const t=Math.floor(s);return`${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`}
let novaLastMusicTickerState="";

function setIrisMediaMode(type,title,m,playing){
  if(type==="MUSIC"){
    const cleanTitle=cleanMediaName(title);
    const musicTickerState=
      `${playing ? "PLAYING" : "PAUSED"}|${cleanTitle}`;

    /*
      timeupdate fires constantly while a song plays.
      Only send a ticker event when the track or play/pause state changes.
    */
    if(musicTickerState!==novaLastMusicTickerState){
      novaLastMusicTickerState=musicTickerState;

      const musicTickerMessage=
        `${playing ? "NOW PLAYING" : "MUSIC PAUSED"} • ${cleanTitle}`;

      novaPersistentTickerPush(musicTickerMessage);
    }
  }

  document.body.classList.toggle("irisMediaPlaying",!!playing);

  const display=document.getElementById("novaMusicInfoDisplay");
  const status=document.getElementById("novaMusicInfoStatus");
  const titleEl=document.getElementById("novaMusicInfoTitle");
  const meta=document.getElementById("novaMusicInfoMeta");

  if(!display || !status || !titleEl || !meta)return;

  if(type!=="MUSIC"){
    display.classList.remove("active");
    return;
  }

  display.classList.add("active");

  status.textContent=
    playing
      ? "NOW PLAYING"
      : "MUSIC PAUSED";

  titleEl.textContent=
    cleanMediaName(title);

  if(m){
    const cur=
      Number.isFinite(m.currentTime)
        ? m.currentTime
        : 0;

    const dur=
      Number.isFinite(m.duration)
        ? m.duration
        : 0;

    const volume=
      m.muted
        ? "MUTED"
        : `VOL ${Math.round(m.volume*100)}%`;

    meta.textContent=
      `${formatMediaClock(cur)} / ${formatMediaClock(dur)}  •  ${volume}`;
  }else{
    meta.textContent="";
  }
}
function clearIrisMediaMode(){
  const d=document.getElementById("novaIrisMedia");
  if(d)d.classList.remove("active");

  const info=document.getElementById("novaMusicInfoDisplay");
  if(info)info.classList.remove("active");

  document.body.classList.remove("irisMediaPlaying");
}
function updateIrisFromAudio(){const a=document.getElementById("audioPlayer");if(!a||musicIndex<0||!musicLibrary[musicIndex])return;setIrisMediaMode("MUSIC",musicLibrary[musicIndex].file.name,a,!a.paused)}
function updateIrisFromVideo(){const v=document.getElementById("videoPlayer");if(!v||videoIndex<0||!videoLibrary[videoIndex])return;setIrisMediaMode("VIDEO",videoLibrary[videoIndex].file.name,v,!v.paused)}

function initializeMedia(){

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  const video =
    document.getElementById(
      "videoPlayer"
    );

  audio.volume = .8;
  video.volume = .8;
  ensureIrisMediaDisplay();
  ["play","pause","timeupdate","loadedmetadata","volumechange"].forEach(eventName=>{
    audio.addEventListener(eventName,updateIrisFromAudio);
    video.addEventListener(eventName,updateIrisFromVideo);
  });

  document.getElementById(
    "musicVolume"
  ).addEventListener(
    "input",
    e => {
      audio.volume =
        Number(e.target.value);
    }
  );

  document.getElementById(
    "videoVolume"
  ).addEventListener(
    "input",
    e => {
      video.volume =
        Number(e.target.value);
    }
  );


  document.getElementById(
    "musicFiles"
  ).addEventListener(
    "change",
    handleMusicFiles
  );

  document.getElementById(
    "musicFolderFallback"
  ).addEventListener(
    "change",
    event => {
      addMusicFiles(
        event.target.files || [],
        true
      );

      updateMusicFolderStatus(
        "SELECTED FOLDER",
        true,
        "LOADED"
      );
    }
  );

  initializeMusicDropZone();
  restoreMusicDirectoryHandle();
  requestNovaPersistentStorage();
  restoreSavedPlaylist(false);
  updateSavedPlaylistStatus();

  if(location.protocol === "file:"){
    log(
      "Playlist persistence is browser-dependent when NOVA is opened directly as a local file. For reliable saving, open NOVA from the same local web address each time.",
      "warning"
    );
  }


  document.getElementById(
    "videoFiles"
  ).addEventListener(
    "change",
    handleVideoFiles
  );


  let novaAutoAdvanceLocked = false;

  async function novaAdvanceAfterTrack(reason){

    if(novaAutoAdvanceLocked){
      return;
    }

    novaAutoAdvanceLocked = true;

    try{

      if(!musicLibrary.length){
        log(
          "NOVA auto-play stopped because the playlist is empty.",
          "warning"
        );
        return;
      }

      if(musicRepeat){

        audio.currentTime = 0;

        try{
          await audio.play();

          log(
            "NOVA repeated the current song.",
            "success"
          );

        }catch(error){

          console.error(
            "NOVA repeat playback failed:",
            error
          );

          log(
            `NOVA could not repeat the song: ${error.name || "PLAYBACK ERROR"} ${error.message || ""}`,
            "error"
          );

          speak(
            "I could not restart the song. Check the media player for the playback error."
          );

        }

        return;
      }

      let nextIndex;

      if(musicShuffle){

        nextIndex = musicIndex;

        if(musicLibrary.length > 1){
          while(nextIndex === musicIndex){
            nextIndex =
              Math.floor(
                Math.random() *
                musicLibrary.length
              );
          }
        }

      }else{

        nextIndex =
          musicIndex + 1;

        if(nextIndex >= musicLibrary.length){
          nextIndex = 0;
        }

      }

      const nextItem =
        musicLibrary[nextIndex];

      if(!nextItem || !nextItem.url){

        log(
          "NOVA could not find the next song in the playlist.",
          "error"
        );

        speak(
          "I could not find the next song in the playlist."
        );

        return;
      }

      musicIndex = nextIndex;

      audio.pause();
      audio.src = nextItem.url;
      audio.load();

      renderMusicList();

      log(
        `Auto-playing next song: ${nextItem.file.name}`,
        "success"
      );

      try{

        await audio.play();

      }catch(error){

        console.error(
          "NOVA automatic next-song playback failed:",
          error
        );

        log(
          `NOVA selected ${nextItem.file.name}, but playback failed: ${error.name || "PLAYBACK ERROR"} ${error.message || ""}`,
          "error"
        );

        speak(
          `I selected the next song, ${nextItem.file.name}, but the browser would not start playback.`
        );

      }

    }finally{

      setTimeout(
        () => {
          novaAutoAdvanceLocked = false;
        },
        500
      );

    }

  }

  audio.addEventListener(
    "ended",
    () => {
      novaAdvanceAfterTrack("ended");
    }
  );

  /* Backup for browsers/files that reach the end without reliably
     delivering an ended event. */
  audio.addEventListener(
    "timeupdate",
    () => {

      if(
        !novaAutoAdvanceLocked &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.currentTime > 0 &&
        audio.duration - audio.currentTime <= 0.20
      ){
        novaAdvanceAfterTrack("near-end");
      }

    }
  );

  audio.addEventListener(
    "error",
    () => {

      const mediaError =
        audio.error;

      const code =
        mediaError
          ? mediaError.code
          : "UNKNOWN";

      log(
        `NOVA music player error. Media error code: ${code}.`,
        "error"
      );

      speak(
        `The music player reported an error code ${code}.`
      );

    }
  );


  video.addEventListener(
    "ended",
    () => {

      nextVideo();

    }
  );

}


/* ============================================================
   MEDIA TABS
   ============================================================ */

function showMediaTab(tab){

  document
    .querySelectorAll(".mediaSection")
    .forEach(section => {

      section.classList.remove(
        "active"
      );

    });

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.classList.remove(
        "active"
      );

    });

  document
    .getElementById(
      `${tab}Section`
    )
    .classList.add("active");

  const button =
    document.querySelector(
      `.tab[data-tab="${tab}"]`
    );

  if(button){
    button.classList.add("active");
  }

}


/* ============================================================
   MUSIC
   ============================================================ */

let linkedMusicDirectoryHandle = null;

const NOVA_PLAYLIST_DB="novaPersistentPlaylistDB";
const NOVA_PLAYLIST_STORE="tracks";
const NOVA_PLAYLIST_ORDER_KEY="novaPersistentPlaylistOrderV1";

function getSavedPlaylistOrder(){
  try{
    const value=
      JSON.parse(
        localStorage.getItem(
          NOVA_PLAYLIST_ORDER_KEY
        ) || "[]"
      );

    return Array.isArray(value)
      ? value
      : [];
  }catch(error){
    return [];
  }
}

function saveCurrentPlaylistOrder(){
  const order=
    musicLibrary.map(
      item=>
        novaTrackKey(
          item.file
        )
    );

  localStorage.setItem(
    NOVA_PLAYLIST_ORDER_KEY,
    JSON.stringify(order)
  );
}


async function requestNovaPersistentStorage(){
  try{
    if(navigator.storage && navigator.storage.persist){
      await navigator.storage.persist();
    }
  }catch(error){
    console.warn("NOVA persistent storage request unavailable:",error);
  }
}

function openNovaPlaylistDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(NOVA_PLAYLIST_DB,2);

    request.onupgradeneeded=()=>{
      const db=request.result;

      if(db.objectStoreNames.contains(NOVA_PLAYLIST_STORE)){
        db.deleteObjectStore(NOVA_PLAYLIST_STORE);
      }

      db.createObjectStore(
        NOVA_PLAYLIST_STORE,
        {keyPath:"key"}
      );
    };

    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function novaTrackKey(file){
  return `${file.name}|${file.size}|${file.lastModified}`;
}

async function saveFilesToPersistentPlaylist(files,replaceLibrary=false){
  const incoming=
    Array.from(files||[])
      .filter(isSupportedAudioFile);

  if(!incoming.length)return;

  try{
    await requestNovaPersistentStorage();

    const db=
      await openNovaPlaylistDatabase();

    const tx=
      db.transaction(
        NOVA_PLAYLIST_STORE,
        "readwrite"
      );

    const store=
      tx.objectStore(
        NOVA_PLAYLIST_STORE
      );

    if(replaceLibrary){
      store.clear();
    }

    incoming.forEach(file=>{
      store.put({
        key:novaTrackKey(file),
        name:file.name,
        type:file.type || "audio/mpeg",
        size:file.size,
        lastModified:file.lastModified,
        blob:file.slice(
          0,
          file.size,
          file.type || "audio/mpeg"
        )
      });
    });

    await new Promise(
      (resolve,reject)=>{
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      }
    );

    db.close();

    await updateSavedPlaylistStatus();

  }catch(error){
    console.warn(
      "NOVA playlist save failed:",
      error
    );

    log(
      "NOVA could not save the playlist in browser storage.",
      "warning"
    );
  }
}

async function getSavedPlaylistFiles(){
  try{
    const db=
      await openNovaPlaylistDatabase();

    const tx=
      db.transaction(
        NOVA_PLAYLIST_STORE,
        "readonly"
      );

    const request=
      tx.objectStore(
        NOVA_PLAYLIST_STORE
      ).getAll();

    const rows=
      await new Promise(
        (resolve,reject)=>{
          request.onsuccess=
            ()=>resolve(
              request.result || []
            );

          request.onerror=
            ()=>reject(
              request.error
            );
        }
      );

    db.close();

    const files=
      rows
        .filter(row=>row && row.blob)
        .map(row=>
          new File(
            [row.blob],
            row.name,
            {
              type:
                row.type ||
                row.blob.type ||
                "audio/mpeg",

              lastModified:
                row.lastModified ||
                Date.now()
            }
          )
        )
        .filter(isSupportedAudioFile);

    const savedOrder=
      getSavedPlaylistOrder();

    if(savedOrder.length){
      const positions=
        new Map(
          savedOrder.map(
            (key,index)=>[key,index]
          )
        );

      files.sort(
        (a,b)=>{
          const aPos=
            positions.has(novaTrackKey(a))
              ? positions.get(novaTrackKey(a))
              : Number.MAX_SAFE_INTEGER;

          const bPos=
            positions.has(novaTrackKey(b))
              ? positions.get(novaTrackKey(b))
              : Number.MAX_SAFE_INTEGER;

          return aPos-bPos;
        }
      );
    }

    return files;

  }catch(error){
    console.warn(
      "NOVA playlist restore failed:",
      error
    );

    return [];
  }
}

async function updateSavedPlaylistStatus(){
  const el=
    document.getElementById(
      "musicPlaylistStatus"
    );

  if(!el)return;

  const files=
    await getSavedPlaylistFiles();

  el.textContent=
    files.length
      ? `PLAYLIST SAVED: ${files.length} TRACK${files.length===1?"":"S"}`
      : "PLAYLIST: EMPTY";

  el.classList.toggle(
    "linked",
    files.length > 0
  );
}

async function restoreSavedPlaylist(announce=false){
  const files=
    await getSavedPlaylistFiles();

  if(!files.length){
    if(announce){
      log(
        "No saved music playlist was found.",
        "warning"
      );
    }

    updateSavedPlaylistStatus();
    return;
  }

  addMusicFiles(
    files,
    false,
    false
  );

  if(announce){
    log(
      `Restored ${files.length} saved music track${files.length===1?"":"s"}.`,
      "success"
    );
  }
}

async function clearSavedPlaylist(){
  try{
    const db=
      await openNovaPlaylistDatabase();

    const tx=
      db.transaction(
        NOVA_PLAYLIST_STORE,
        "readwrite"
      );

    tx.objectStore(
      NOVA_PLAYLIST_STORE
    ).clear();

    await new Promise(
      (resolve,reject)=>{
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      }
    );

    db.close();

    musicLibrary.forEach(
      item=>{
        try{
          URL.revokeObjectURL(
            item.url
          );
        }catch(e){}
      }
    );

    musicLibrary=[];
    musicIndex=-1;

    localStorage.removeItem(
      NOVA_PLAYLIST_ORDER_KEY
    );

    const audio=
      document.getElementById(
        "audioPlayer"
      );

    if(audio){
      audio.pause();
      audio.removeAttribute(
        "src"
      );
      audio.load();
    }

    renderMusicList();

    const count=
      document.getElementById(
        "musicCount"
      );

    if(count){
      count.textContent=
        "0 tracks";
    }

    setNovaMusicAlive(false);
    updateSavedPlaylistStatus();

    log(
      "Saved music playlist cleared.",
      "system"
    );

  }catch(error){
    console.warn(
      "NOVA playlist clear failed:",
      error
    );

    log(
      "Could not clear the saved playlist.",
      "error"
    );
  }
}

function isSupportedAudioFile(file){
  if(!file) return false;

  if(
    file.type &&
    file.type.toLowerCase().startsWith("audio/")
  ){
    return true;
  }

  return /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|weba|webm)$/i.test(
    file.name || ""
  );
}


function openMusicFilePicker(){
  const input =
    document.getElementById(
      "musicFiles"
    );

  if(input){
    input.value = "";
    input.click();
  }
}


function addMusicFiles(files, replaceLibrary = false, persistPlaylist = true){

  const incoming =
    Array.from(files || [])
      .filter(isSupportedAudioFile);

  if(persistPlaylist && incoming.length){
    saveFilesToPersistentPlaylist(incoming,replaceLibrary);
  }

  if(!incoming.length){
    log(
      "No supported audio files were found.",
      "warning"
    );
    return;
  }

  if(replaceLibrary){
    musicLibrary.forEach(item => {
      try{
        URL.revokeObjectURL(item.url);
      }catch(e){}
    });

    musicLibrary = [];
    musicIndex = -1;
  }

  const existingKeys =
    new Set(
      musicLibrary.map(item =>
        `${item.file.name}|${item.file.size}|${item.file.lastModified}`
      )
    );

  incoming.forEach(file => {
    const key =
      `${file.name}|${file.size}|${file.lastModified}`;

    if(existingKeys.has(key)){
      return;
    }

    existingKeys.add(key);

    musicLibrary.push({
      file,
      url:URL.createObjectURL(file)
    });
  });

  renderMusicList();

  saveCurrentPlaylistOrder();

  document.getElementById(
    "musicCount"
  ).textContent =
    `${musicLibrary.length} track${
      musicLibrary.length === 1 ? "" : "s"
    }`;

  if(musicLibrary.length){
    showMediaTab("music");

    log(
      `${musicLibrary.length} music track${
        musicLibrary.length === 1 ? "" : "s"
      } loaded.`,
      "success"
    );
  }
}


function handleMusicFiles(event){

  const files =
    event &&
    event.target &&
    event.target.files
      ? event.target.files
      : [];

  console.log(
    "NOVA MUSIC SELECTED:",
    files.length
  );

  addMusicFiles(
    files,
    false
  );
}


async function collectAudioFilesFromDirectory(directoryHandle){

  const files = [];

  async function walk(handle){

    for await(
      const entry of handle.values()
    ){

      if(entry.kind === "file"){
        const file =
          await entry.getFile();

        if(isSupportedAudioFile(file)){
          files.push(file);
        }

      }else if(entry.kind === "directory"){
        await walk(entry);
      }

    }

  }

  await walk(directoryHandle);

  return files;
}


function openMusicLibraryDatabase(){

  return new Promise(
    (resolve,reject) => {

      const request =
        indexedDB.open(
          "NOVA_MEDIA_LIBRARY",
          1
        );

      request.onupgradeneeded =
        () => {
          const db =
            request.result;

          if(
            !db.objectStoreNames.contains(
              "handles"
            )
          ){
            db.createObjectStore(
              "handles"
            );
          }
        };

      request.onsuccess =
        () => resolve(
          request.result
        );

      request.onerror =
        () => reject(
          request.error
        );

    }
  );
}


async function saveMusicDirectoryHandle(handle){

  try{

    const db =
      await openMusicLibraryDatabase();

    await new Promise(
      (resolve,reject) => {

        const transaction =
          db.transaction(
            "handles",
            "readwrite"
          );

        transaction
          .objectStore("handles")
          .put(
            handle,
            "musicDirectory"
          );

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () => reject(
            transaction.error
          );

      }
    );

    db.close();

  }catch(error){
    console.warn(
      "Could not save music folder handle:",
      error
    );
  }
}


async function restoreMusicDirectoryHandle(){

  if(!("indexedDB" in window)){
    return;
  }

  try{

    const db =
      await openMusicLibraryDatabase();

    const handle =
      await new Promise(
        (resolve,reject) => {

          const transaction =
            db.transaction(
              "handles",
              "readonly"
            );

          const request =
            transaction
              .objectStore("handles")
              .get(
                "musicDirectory"
              );

          request.onsuccess =
            () => resolve(
              request.result || null
            );

          request.onerror =
            () => reject(
              request.error
            );

        }
      );

    db.close();

    if(handle){

      linkedMusicDirectoryHandle =
        handle;

      updateMusicFolderStatus(
        handle.name,
        true,
        "CLICK REFRESH FOLDER TO RECONNECT"
      );

    }

  }catch(error){
    console.warn(
      "Could not restore music folder:",
      error
    );
  }
}


function updateMusicFolderStatus(
  name,
  linked,
  message = ""
){

  const status =
    document.getElementById(
      "musicFolderStatus"
    );

  const refresh =
    document.getElementById(
      "refreshMusicFolderButton"
    );

  if(status){

    status.textContent =
      linked
        ? `MUSIC FOLDER: ${name}${
            message
              ? ` • ${message}`
              : ""
          }`
        : "NO MUSIC FOLDER LINKED";

    status.classList.toggle(
      "linked",
      !!linked
    );

  }

  if(refresh){
    refresh.style.display =
      linked
        ? ""
        : "none";
  }
}


async function linkMusicFolder(){

  if(
    !("showDirectoryPicker" in window)
  ){

    const fallback =
      document.getElementById(
        "musicFolderFallback"
      );

    if(fallback){
      fallback.value = "";
      fallback.click();
    }else{
      speak(
        "Folder linking is not supported in this browser. You can still drag and drop your music folder."
      );
    }

    return;
  }

  try{

    const handle =
      await window.showDirectoryPicker({
        mode:"read"
      });

    linkedMusicDirectoryHandle =
      handle;

    await saveMusicDirectoryHandle(
      handle
    );

    updateMusicFolderStatus(
      handle.name,
      true,
      "LINKED"
    );

    const files =
      await collectAudioFilesFromDirectory(
        handle
      );

    addMusicFiles(
      files,
      true
    );

    speak(
      `${files.length} music ${
        files.length === 1
          ? "track"
          : "tracks"
      } loaded from ${handle.name}.`
    );

  }catch(error){

    if(
      error &&
      error.name !== "AbortError"
    ){
      console.error(
        "Music folder error:",
        error
      );

      log(
        "Could not open the music folder.",
        "error"
      );
    }

  }
}


async function refreshLinkedMusicFolder(){

  if(!linkedMusicDirectoryHandle){
    await restoreMusicDirectoryHandle();
  }

  const handle =
    linkedMusicDirectoryHandle;

  if(!handle){
    linkMusicFolder();
    return;
  }

  try{

    let permission =
      await handle.queryPermission({
        mode:"read"
      });

    if(permission !== "granted"){
      permission =
        await handle.requestPermission({
          mode:"read"
        });
    }

    if(permission !== "granted"){
      log(
        "Music folder permission was not granted.",
        "warning"
      );
      return;
    }

    const files =
      await collectAudioFilesFromDirectory(
        handle
      );

    addMusicFiles(
      files,
      true
    );

    updateMusicFolderStatus(
      handle.name,
      true,
      "CONNECTED"
    );

    speak(
      `Music library refreshed. ${files.length} ${
        files.length === 1
          ? "track"
          : "tracks"
      } loaded.`
    );

  }catch(error){

    console.error(
      "Music folder refresh error:",
      error
    );

    log(
      "Could not refresh the linked music folder.",
      "error"
    );

  }
}


function readDroppedEntry(entry){

  return new Promise(
    resolve => {

      if(!entry){
        resolve([]);
        return;
      }

      if(entry.isFile){

        entry.file(
          file => resolve(
            isSupportedAudioFile(file)
              ? [file]
              : []
          ),
          () => resolve([])
        );

        return;
      }

      if(entry.isDirectory){

        const reader =
          entry.createReader();

        const allEntries = [];

        const readBatch =
          () => {
            reader.readEntries(
              async entries => {

                if(!entries.length){

                  const nested =
                    await Promise.all(
                      allEntries.map(
                        readDroppedEntry
                      )
                    );

                  resolve(
                    nested.flat()
                  );

                  return;
                }

                allEntries.push(
                  ...entries
                );

                readBatch();

              },
              () => resolve([])
            );
          };

        readBatch();
        return;
      }

      resolve([]);

    }
  );
}


async function handleMusicDrop(event){

  event.preventDefault();

  const zone =
    document.getElementById(
      "musicDropZone"
    );

  if(zone){
    zone.classList.remove(
      "dragOver"
    );
  }

  const items =
    Array.from(
      event.dataTransfer.items || []
    );

  const entries =
    items
      .map(item =>
        item.webkitGetAsEntry
          ? item.webkitGetAsEntry()
          : null
      )
      .filter(Boolean);

  let files = [];

  if(entries.length){

    const groups =
      await Promise.all(
        entries.map(
          readDroppedEntry
        )
      );

    files =
      groups.flat();

  }else{

    files =
      Array.from(
        event.dataTransfer.files || []
      );

  }

  addMusicFiles(
    files,
    false
  );
}


function initializeMusicDropZone(){

  const zone =
    document.getElementById(
      "musicDropZone"
    );

  if(!zone){
    return;
  }

  ["dragenter","dragover"]
    .forEach(eventName => {
      zone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          zone.classList.add(
            "dragOver"
          );
        }
      );
    });

  ["dragleave","drop"]
    .forEach(eventName => {
      zone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          zone.classList.remove(
            "dragOver"
          );
        }
      );
    });

  zone.addEventListener(
    "drop",
    handleMusicDrop
  );
}


function renderMusicList(){

  const list=
    document.getElementById(
      "musicList"
    );

  list.innerHTML="";

  musicLibrary.forEach(
    (item,index)=>{

      const div=
        document.createElement(
          "div"
        );

      div.className=
        "mediaItem"+
        (
          index===musicIndex
            ? " selected"
            : ""
        );

      div.textContent=
        item.file.name;

      div.draggable=true;
      div.dataset.musicIndex=
        String(index);

      div.onclick=
        ()=>playMusic(index);

      div.addEventListener(
        "dragstart",
        event=>{
          div.classList.add(
            "musicDragging"
          );

          event.dataTransfer.effectAllowed=
            "move";

          event.dataTransfer.setData(
            "text/plain",
            String(index)
          );
        }
      );

      div.addEventListener(
        "dragend",
        ()=>{
          div.classList.remove(
            "musicDragging"
          );

          list
            .querySelectorAll(
              ".musicDropTarget"
            )
            .forEach(
              element=>
                element.classList.remove(
                  "musicDropTarget"
                )
            );
        }
      );

      div.addEventListener(
        "dragover",
        event=>{
          event.preventDefault();
          event.dataTransfer.dropEffect=
            "move";

          div.classList.add(
            "musicDropTarget"
          );
        }
      );

      div.addEventListener(
        "dragleave",
        ()=>{
          div.classList.remove(
            "musicDropTarget"
          );
        }
      );

      div.addEventListener(
        "drop",
        event=>{
          event.preventDefault();
          event.stopPropagation();

          div.classList.remove(
            "musicDropTarget"
          );

          const fromIndex=
            Number(
              event.dataTransfer.getData(
                "text/plain"
              )
            );

          const toIndex=index;

          if(
            !Number.isInteger(fromIndex) ||
            fromIndex<0 ||
            fromIndex>=musicLibrary.length ||
            fromIndex===toIndex
          ){
            return;
          }

          const currentItem=
            musicIndex>=0
              ? musicLibrary[musicIndex]
              : null;

          const moved=
            musicLibrary.splice(
              fromIndex,
              1
            )[0];

          musicLibrary.splice(
            toIndex,
            0,
            moved
          );

          musicIndex=
            currentItem
              ? musicLibrary.indexOf(
                  currentItem
                )
              : -1;

          saveCurrentPlaylistOrder();
          renderMusicList();

          log(
            "Music playlist order updated.",
            "success"
          );
        }
      );

      list.appendChild(div);

    }
  );

}

function playMusic(index){

  if(!musicLibrary.length){

    showMediaTab("music");

    speak(
      "No music is loaded. Select music files first."
    );

    return;
  }

  if(
    typeof index !== "number"
  ){

    if(musicIndex < 0){
      musicIndex = 0;
    }

  }else{

    musicIndex = index;

  }

  const item =
    musicLibrary[musicIndex];

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  audio.src =
    item.url;

  audio.play()
    .catch(error => {
      console.error(
        "NOVA music playback could not start:",
        error
      );

      log(
        `NOVA could not play ${item.file.name}: ${error.name || "PLAYBACK ERROR"} ${error.message || ""}`,
        "error"
      );

      speak(
        `I could not play ${item.file.name}. Check the media player for the playback error.`
      );
    });

  renderMusicList();

  log(
    `Playing music: ${item.file.name}`,
    "success"
  );

}


function pauseMusic(){

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  if(
    !audio.src
  ){

    speak(
      "No music is loaded."
    );

    return;
  }

  audio.pause();

  log(
    "Music paused.",
    "system"
  );

}


function toggleMusic(){

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  if(audio.paused){

    if(!audio.src){

      playMusic();

    }else{

      audio.play()
        .catch(() => {});

    }

  }else{

    audio.pause();

  }

}


function stopMusic(){

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  audio.pause();

  audio.currentTime = 0;
  const videoNow=document.getElementById("videoPlayer");
  if(!videoNow||videoNow.paused)clearIrisMediaMode();

  log(
    "Music stopped.",
    "system"
  );

}


function nextMusic(){

  if(!musicLibrary.length){

    speak(
      "No music is loaded."
    );

    return;
  }

  if(musicShuffle){

    let next;

    do{

      next =
        Math.floor(
          Math.random() *
          musicLibrary.length
        );

    }while(
      musicLibrary.length > 1 &&
      next === musicIndex
    );

    musicIndex = next;

  }else{

    musicIndex++;

    if(
      musicIndex >=
      musicLibrary.length
    ){

      musicIndex = 0;

    }

  }

  playMusic(musicIndex);

}


function previousMusic(){

  if(!musicLibrary.length){

    speak(
      "No music is loaded."
    );

    return;
  }

  musicIndex--;

  if(musicIndex < 0){

    musicIndex =
      musicLibrary.length - 1;

  }

  playMusic(musicIndex);

}


function toggleShuffle(){

  musicShuffle =
    !musicShuffle;

  document.getElementById(
    "shuffleText"
  ).textContent =
    musicShuffle
      ? "ON"
      : "OFF";

  speak(
    `Shuffle ${musicShuffle ? "on" : "off"}.`
  );

}


function toggleRepeat(){

  musicRepeat =
    !musicRepeat;

  document.getElementById(
    "repeatText"
  ).textContent =
    musicRepeat
      ? "ON"
      : "OFF";

  speak(
    `Repeat ${musicRepeat ? "on" : "off"}.`
  );

}


/* ============================================================
   VIDEO
   ============================================================ */

function handleVideoFiles(event){

  const files =
    Array.from(
      event.target.files || []
    );

  videoLibrary.forEach(
    item => {

      try{
        URL.revokeObjectURL(
          item.url
        );
      }catch(e){}

    }
  );

  videoLibrary =
    files.map(file => ({
      file,
      url:URL.createObjectURL(file)
    }));

  videoIndex = -1;

  renderVideoList();

  document.getElementById(
    "videoCount"
  ).textContent =
    `${videoLibrary.length} video${
      videoLibrary.length === 1 ? "" : "s"
    }`;

  if(videoLibrary.length){

    showMediaTab("video");

    speak(
      `${videoLibrary.length} video ${
        videoLibrary.length === 1
          ? "is"
          : "are"
      } loaded.`
    );

  }

}


function renderVideoList(){

  const list =
    document.getElementById(
      "videoList"
    );

  list.innerHTML = "";

  videoLibrary.forEach(
    (item,index) => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "mediaItem" +
        (
          index === videoIndex
            ? " selected"
            : ""
        );

      div.textContent =
        item.file.name;

      div.onclick =
        () => playVideo(index);

      list.appendChild(div);

    }
  );

}


function playVideo(index){

  if(!videoLibrary.length){

    showMediaTab("video");

    speak(
      "No videos are loaded. Select video files first."
    );

    return;
  }

  if(
    typeof index !== "number"
  ){

    if(videoIndex < 0){
      videoIndex = 0;
    }

  }else{

    videoIndex = index;

  }

  const item =
    videoLibrary[videoIndex];

  const video =
    document.getElementById(
      "videoPlayer"
    );

  video.src =
    item.url;

  video.play()
    .catch(() => {});

  renderVideoList();

  log(
    `Playing video: ${item.file.name}`,
    "success"
  );

}


function pauseVideo(){

  const video =
    document.getElementById(
      "videoPlayer"
    );

  video.pause();

}


function toggleVideo(){

  const video =
    document.getElementById(
      "videoPlayer"
    );

  if(video.paused){

    if(!video.src){

      playVideo();

    }else{

      video.play()
        .catch(() => {});

    }

  }else{

    video.pause();

  }

}


function stopVideo(){

  const video =
    document.getElementById(
      "videoPlayer"
    );

  video.pause();

  video.currentTime = 0;
  const audioNow=document.getElementById("audioPlayer");
  if(!audioNow||audioNow.paused)clearIrisMediaMode();

}


function nextVideo(){

  if(!videoLibrary.length){

    speak(
      "No videos are loaded."
    );

    return;
  }

  videoIndex++;

  if(
    videoIndex >=
    videoLibrary.length
  ){

    videoIndex = 0;

  }

  playVideo(videoIndex);

}


function previousVideo(){

  if(!videoLibrary.length){

    speak(
      "No videos are loaded."
    );

    return;
  }

  videoIndex--;

  if(videoIndex < 0){

    videoIndex =
      videoLibrary.length - 1;

  }

  playVideo(videoIndex);

}


/* ============================================================
   YOUTUBE
   ============================================================ */

function extractYouTubeId(value){

  value =
    String(value).trim();

  if(
    /^[a-zA-Z0-9_-]{11}$/.test(value)
  ){

    return value;

  }

  const patterns = [

    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/

  ];

  for(
    const pattern of patterns
  ){

    const match =
      value.match(pattern);

    if(match){
      return match[1];
    }

  }

  return null;

}


function loadYouTube(){

  const input =
    document.getElementById(
      "youtubeInput"
    );

  const id =
    extractYouTubeId(
      input.value
    );

  if(!id){

    speak(
      "I couldn't find a valid YouTube video ID."
    );

    return;
  }

  youtubeVideoId = id;

  const frame =
    document.getElementById(
      "youtubeFrame"
    );

  frame.src =
    `https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;

  showMediaTab("youtube");

  log(
    `YouTube video loaded: ${id}`,
    "success"
  );

}


function youtubeCommand(command){

  const frame =
    document.getElementById(
      "youtubeFrame"
    );

  if(
    !youtubeVideoId ||
    !frame.src
  ){

    speak(
      "No YouTube video is loaded."
    );

    return;
  }

  frame.contentWindow.postMessage(
    JSON.stringify({
      event:"command",
      func:command,
      args:[]
    }),
    "*"
  );

}


/* ============================================================
   STAGE 6C - NOVA MUSIC LIFE HOOKS
   ============================================================ */

let novaLifeAudioContext = null;
let novaLifeAnalyser = null;
let novaLifeSource = null;
let novaLifeData = null;
let novaLifeFrame = 0;

function setNovaMusicAlive(alive){

  document.body.classList.toggle(
    "novaMusicAlive",
    !!alive
  );

  if(!alive){

    const orb =
      document.getElementById(
        "novaOrb"
      );

    if(orb){
      orb.style.filter = "";
    }

    const pulse =
      document.getElementById(
        "novaMusicPulseRing"
      );

    if(pulse){
      pulse.style.boxShadow = "";
      pulse.style.transform = "";
      pulse.style.opacity = "";
    }

    [".novaOuterRing",".novaInnerRing",".novaIris",".novaWaveform",".novaParticles"]
      .forEach(selector=>{
        const element=document.querySelector(selector);
        if(element){
          element.style.transform="";
          element.style.filter="";
          element.style.opacity="";
          element.style.clipPath="";
        }
      });

  }
}

async function startNovaAudioLife(audio){

  setNovaMusicAlive(true);

  if(
    !(
      window.AudioContext ||
      window.webkitAudioContext
    )
  ){
    return;
  }

  try{

    if(!novaLifeAudioContext){

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      novaLifeAudioContext =
        new AudioContextClass();

      novaLifeAnalyser =
        novaLifeAudioContext
          .createAnalyser();

      novaLifeAnalyser.fftSize =
        256;

      novaLifeAnalyser
        .smoothingTimeConstant =
        .78;

      novaLifeData =
        new Uint8Array(
          novaLifeAnalyser
            .frequencyBinCount
        );

      novaLifeSource =
        novaLifeAudioContext
          .createMediaElementSource(
            audio
          );

      novaLifeSource.connect(
        novaLifeAnalyser
      );

      novaLifeAnalyser.connect(
        novaLifeAudioContext.destination
      );

    }

    if(
      novaLifeAudioContext.state ===
      "suspended"
    ){
      await novaLifeAudioContext.resume();
    }

    if(!novaLifeFrame){

      const animate =
        () => {

          novaLifeFrame =
            requestAnimationFrame(
              animate
            );

          if(
            audio.paused ||
            !novaLifeAnalyser ||
            !novaLifeData
          ){
            return;
          }

          novaLifeAnalyser
            .getByteFrequencyData(
              novaLifeData
            );

          const length=novaLifeData.length;
          const bassEnd=Math.max(2,Math.floor(length*.16));
          const midEnd=Math.max(bassEnd+1,Math.floor(length*.55));

          let bassTotal=0;
          let midTotal=0;
          let highTotal=0;

          for(let i=0;i<bassEnd;i++)bassTotal+=novaLifeData[i];
          for(let i=bassEnd;i<midEnd;i++)midTotal+=novaLifeData[i];
          for(let i=midEnd;i<length;i++)highTotal+=novaLifeData[i];

          const bass=(bassTotal/bassEnd)/255;
          const mids=(midTotal/(midEnd-bassEnd))/255;
          const highs=(highTotal/(length-midEnd))/255;
          const energy=Math.min(1,bass*.48+mids*.34+highs*.18);

          const orb=document.getElementById("novaOrb");
          const outer=document.querySelector(".novaOuterRing");
          const inner=document.querySelector(".novaInnerRing");
          const iris=document.querySelector(".novaIris");
          const wave=document.querySelector(".novaWaveform");
          const particles=document.querySelector(".novaParticles");
          const pulse=document.getElementById("novaMusicPulseRing");

          if(orb){
            orb.style.filter=`brightness(${1+energy*1.25}) drop-shadow(0 0 ${8+bass*32}px rgba(0,229,255,.85))`;
          }
          if(outer){
            outer.style.transform=`scale(${1+bass*.16})`;
          }
          if(inner){
            inner.style.transform=`scale(${1+mids*.17}) rotate(${(mids-.5)*8}deg)`;
          }
          if(iris){
            iris.style.transform=`scaleX(${.94+mids*.18}) scaleY(${.88+bass*.28})`;
            iris.style.filter=`brightness(${1.05+energy*1.8}) saturate(${1+mids})`;
            iris.style.clipPath=`ellipse(${48+mids*18}% ${40+bass*20}% at 50% 50%)`;
          }
          if(wave){
            wave.style.transform=`scale(${.94+highs*.34})`;
            wave.style.opacity=String(.35+highs*.65);
          }
          if(particles){
            particles.style.filter=`brightness(${1+highs*2})`;
            particles.style.opacity=String(.35+energy*.6);
          }
          if(pulse){
            pulse.style.transform=`scale(${.96+bass*.28})`;
            pulse.style.opacity=String(.25+energy*.75);
            pulse.style.boxShadow=`0 0 ${18+bass*55}px rgba(0,229,255,.95), inset 0 0 ${8+mids*32}px rgba(255,0,255,.5)`;
          }

        };

      animate();

    }

  }catch(error){

    console.warn(
      "NOVA audio analyser unavailable; visual life mode remains active.",
      error
    );

  }
}

function initializeNovaMusicLife(){

  const audio =
    document.getElementById(
      "audioPlayer"
    );

  if(!audio){
    return;
  }

  audio.addEventListener(
    "play",
    () => startNovaAudioLife(audio)
  );

  audio.addEventListener(
    "pause",
    () => setNovaMusicAlive(false)
  );

  audio.addEventListener(
    "ended",
    () => setNovaMusicAlive(false)
  );

  /* Make dropping anywhere on Media Center feed the existing
     Stage 5 drop handler, while keeping the dedicated drop zone. */
  const mediaPanel =
    document.querySelector(
      ".mediaPanel"
    );

  if(mediaPanel){

    mediaPanel.addEventListener(
      "dragover",
      event => {
        if(
          event.dataTransfer &&
          Array.from(
            event.dataTransfer.types || []
          ).includes("Files")
        ){
          event.preventDefault();
          mediaPanel.classList.add(
            "musicDragActive"
          );
        }
      }
    );

    mediaPanel.addEventListener(
      "dragleave",
      event => {
        if(
          !mediaPanel.contains(
            event.relatedTarget
          )
        ){
          mediaPanel.classList.remove(
            "musicDragActive"
          );
        }
      }
    );

    mediaPanel.addEventListener(
      "drop",
      async event => {

        event.preventDefault();

        mediaPanel.classList.remove(
          "musicDragActive"
        );

        if(
          typeof handleMusicDrop ===
          "function"
        ){
          await handleMusicDrop(
            event
          );
        }

      }
    );

  }

}

if(document.readyState === "loading"){
  document.addEventListener(
    "DOMContentLoaded",
    initializeNovaMusicLife
  );
}else{
  initializeNovaMusicLife();
}


/* ============================================================
   NOVA FUTURE VISUAL ENGINE
   Uses the existing audio analyser if available.
   Never creates a second audio path and never changes playback.
   ============================================================ */
let novaFutureVisualFrame=null;

function initializeNovaFutureVisuals(){
  const spectrum=document.getElementById("novaMusicSpectrum");
  if(!spectrum)return;

  if(!spectrum.children.length){
    for(let i=0;i<42;i++){
      const bar=document.createElement("span");
      bar.className="novaSpectrumBar";
      spectrum.appendChild(bar);
    }
  }

  if(!novaFutureVisualFrame){
    novaFutureVisualLoop();
  }
}

function novaFutureVisualLoop(){
  novaFutureVisualFrame=requestAnimationFrame(novaFutureVisualLoop);

  const spectrum=document.getElementById("novaMusicSpectrum");
  if(!spectrum)return;

  const bars=spectrum.children;
  const playing=document.body.classList.contains("irisMediaPlaying");

  /*
    Read the analyser already used by NOVA when it is available.
    The variable names are discovered safely at runtime so this visual
    layer cannot break music if the analyser implementation changes.
  */
  let analyserRef=null;
  let dataRef=null;

  try{
    if(typeof novaAnalyser!=="undefined")analyserRef=novaAnalyser;
  }catch(e){}
  try{
    if(typeof analyser!=="undefined" && !analyserRef)analyserRef=analyser;
  }catch(e){}

  if(playing && analyserRef && analyserRef.frequencyBinCount){
    if(
      !window.__novaFutureFreqData ||
      window.__novaFutureFreqData.length!==analyserRef.frequencyBinCount
    ){
      window.__novaFutureFreqData=
        new Uint8Array(analyserRef.frequencyBinCount);
    }

    dataRef=window.__novaFutureFreqData;

    try{
      analyserRef.getByteFrequencyData(dataRef);
    }catch(e){
      dataRef=null;
    }
  }

  let energy=0;
  let bass=0;
  let mids=0;
  let highs=0;

  if(playing && dataRef && dataRef.length){
    const usable=Math.min(dataRef.length,128);

    for(let i=0;i<bars.length;i++){
      const index=Math.min(
        usable-1,
        Math.floor((i/bars.length)*usable)
      );

      const value=dataRef[index]/255;
      const shaped=Math.pow(value,.78);

      bars[i].style.height=
        `${Math.max(3,shaped*100)}%`;

      bars[i].style.opacity=
        `${.28+(shaped*.72)}`;
    }

    const avg=(a,b)=>{
      let sum=0,count=0;
      for(let i=a;i<b && i<usable;i++){
        sum+=dataRef[i];
        count++;
      }
      return count ? (sum/count)/255 : 0;
    };

    bass=avg(0,10);
    mids=avg(10,45);
    highs=avg(45,usable);
    energy=(bass*.45)+(mids*.35)+(highs*.20);
  }else{
    for(let i=0;i<bars.length;i++){
      const idle=3+((i%7)*.35);
      bars[i].style.height=`${idle}%`;
      bars[i].style.opacity=".22";
    }
  }

  const root=document.documentElement;
  root.style.setProperty("--nova-bass",bass.toFixed(3));
  root.style.setProperty("--nova-mids",mids.toFixed(3));
  root.style.setProperty("--nova-highs",highs.toFixed(3));
  root.style.setProperty("--nova-energy",energy.toFixed(3));
}

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    initializeNovaFutureVisuals,
    {once:true}
  );
}else{
  initializeNovaFutureVisuals();
}


/* ============================================================
   NOVA INTEGRATED MEDIA CONTROLS
   Thin UI bridge to the existing working music player.
   ============================================================ */
function initializeNovaIntegratedMedia(){
  const audio=document.getElementById("audioPlayer");
  const play=document.getElementById("novaMediaPlayPause");
  const prev=document.getElementById("novaMediaPrev");
  const next=document.getElementById("novaMediaNext");
  const progress=document.getElementById("novaMediaProgressWrap");
  const fill=document.getElementById("novaMediaProgressFill");
  const library=document.getElementById("novaMediaLibraryButton");

  if(!audio || !play || !prev || !next || !progress || !fill)return;

  const sync=()=>{
    const hasTrack=
      musicIndex>=0 &&
      !!musicLibrary[musicIndex];

    document.body.classList.toggle("novaMediaLoaded",hasTrack);

    play.textContent=
      !audio.paused && hasTrack
        ? "❚❚"
        : "▶";

    if(
      Number.isFinite(audio.duration) &&
      audio.duration>0
    ){
      fill.style.width=
        `${Math.max(0,Math.min(100,(audio.currentTime/audio.duration)*100))}%`;
    }else{
      fill.style.width="0%";
    }
  };

  play.addEventListener("click",()=>{
    if(musicIndex<0 || !musicLibrary[musicIndex]){
      if(musicLibrary.length){
        playMusic(0);
      }
      return;
    }

    if(audio.paused){
      audio.play().catch(()=>{});
    }else{
      audio.pause();
    }
  });

  prev.addEventListener("click",()=>{
    if(!musicLibrary.length)return;

    const target=
      musicIndex<=0
        ? musicLibrary.length-1
        : musicIndex-1;

    playMusic(target);
  });

  next.addEventListener("click",()=>{
    if(!musicLibrary.length)return;

    const target=
      musicIndex<0
        ? 0
        : (musicIndex+1)%musicLibrary.length;

    playMusic(target);
  });

  progress.addEventListener("click",event=>{
    if(
      !Number.isFinite(audio.duration) ||
      audio.duration<=0
    ){
      return;
    }

    const rect=progress.getBoundingClientRect();
    const ratio=Math.max(
      0,
      Math.min(
        1,
        (event.clientX-rect.left)/Math.max(1,rect.width)
      )
    );

    audio.currentTime=audio.duration*ratio;
  });

  if(library){
    library.addEventListener("click",()=>{
      /*
        Reuse the existing media/library interface rather than
        creating a second music system.
      */
      const candidates=[
        "openMusicLibrary",
        "openMediaLibrary",
        "openNovaMusicScreen",
        "openNovaMediaScreen"
      ];

      for(const name of candidates){
        try{
          if(typeof window[name]==="function"){
            window[name]();
            return;
          }
        }catch(e){}
      }

      const input=
        document.getElementById("musicFolderInput") ||
        document.getElementById("musicFileInput");

      if(input){
        input.click();
      }
    });
  }

  ["play","pause","timeupdate","loadedmetadata","ended","volumechange"]
    .forEach(eventName=>{
      audio.addEventListener(eventName,sync);
    });

  sync();
}

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    initializeNovaIntegratedMedia,
    {once:true}
  );
}else{
  initializeNovaIntegratedMedia();
}


/* ============================================================
   NOVA MEDIA LIBRARY V2
   Renders the existing musicLibrary inside NOVA.
   Existing loading, persistence, playback and auto-next remain authoritative.
   ============================================================ */
function novaCleanIntegratedTrackName(item){
  if(!item)return"UNTITLED TRACK";
  const raw=
    item.file && item.file.name
      ? item.file.name
      : (item.name || "UNTITLED TRACK");

  try{
    return cleanMediaName(raw);
  }catch(e){
    return String(raw).replace(/\.[^.]+$/,"").replace(/_/g," ");
  }
}

function renderNovaIntegratedMediaLibrary(){
  const list=document.getElementById("novaMediaLibraryList");
  const now=document.getElementById("novaMediaLibraryNowTitle");
  const count=document.getElementById("novaMediaLibraryCount");

  if(!list || !now || !count)return;

  const tracks=
    Array.isArray(musicLibrary)
      ? musicLibrary
      : [];

  count.textContent=
    `${tracks.length} ${tracks.length===1 ? "TRACK" : "TRACKS"}`;

  if(
    musicIndex>=0 &&
    tracks[musicIndex]
  ){
    now.textContent=
      `NOW PLAYING • ${novaCleanIntegratedTrackName(tracks[musicIndex])}`;
  }else{
    now.textContent="NO TRACK SELECTED";
  }

  list.innerHTML="";

  if(!tracks.length){
    const empty=document.createElement("div");
    empty.className="novaMediaLibraryEmpty";
    empty.textContent="ADD MUSIC OR A FOLDER TO BUILD NOVA'S MEDIA LIBRARY";
    list.appendChild(empty);
    return;
  }

  tracks.forEach((item,index)=>{
    const row=document.createElement("button");
    row.type="button";
    row.className=
      `novaLibraryTrack${index===musicIndex ? " active" : ""}`;

    const number=document.createElement("span");
    number.className="novaLibraryTrackNumber";
    number.textContent=String(index+1).padStart(2,"0");

    const name=document.createElement("span");
    name.className="novaLibraryTrackName";
    name.textContent=novaCleanIntegratedTrackName(item);

    const state=document.createElement("span");
    state.className="novaLibraryTrackState";
    state.textContent=
      index===musicIndex
        ? "ACTIVE"
        : "";

    row.append(number,name,state);

    row.addEventListener("click",()=>{
      playMusic(index);
      renderNovaIntegratedMediaLibrary();
    });

    list.appendChild(row);
  });
}

function openNovaIntegratedMediaLibrary(){
  const panel=document.getElementById("novaIntegratedMediaLibrary");
  if(!panel)return;

  renderNovaIntegratedMediaLibrary();
  panel.classList.add("active");
}

function closeNovaIntegratedMediaLibrary(){
  const panel=document.getElementById("novaIntegratedMediaLibrary");
  if(panel)panel.classList.remove("active");
}

function novaClickFirstExistingInput(ids){
  for(const id of ids){
    const el=document.getElementById(id);
    if(el){
      el.click();
      return true;
    }
  }
  return false;
}

function initializeNovaIntegratedLibrary(){
  const mediaButton=document.getElementById("novaMediaLibraryButton");
  const close=document.getElementById("novaMediaLibraryClose");
  const addMusic=document.getElementById("novaMediaAddMusic");
  const addFolder=document.getElementById("novaMediaAddFolder");
  const audio=document.getElementById("audioPlayer");

  if(mediaButton){
    /*
      Make NOVA's integrated library the single MEDIA-button destination.
      Cloning removes the earlier V1 fallback click listener while preserving
      the same element ID, styling and location.
    */
    const cleanMediaButton=mediaButton.cloneNode(true);
    mediaButton.replaceWith(cleanMediaButton);

    cleanMediaButton.addEventListener("click",event=>{
      event.preventDefault();
      openNovaIntegratedMediaLibrary();
    });
  }

  if(close){
    close.addEventListener("click",closeNovaIntegratedMediaLibrary);
  }

  if(addMusic){
    addMusic.addEventListener("click",()=>{
      novaClickFirstExistingInput([
        "musicFileInput",
        "musicFiles",
        "audioFileInput",
        "mediaFileInput"
      ]);
    });
  }

  if(addFolder){
    addFolder.addEventListener("click",()=>{
      novaClickFirstExistingInput([
        "musicFolderInput",
        "musicFolder",
        "audioFolderInput"
      ]);
    });
  }

  if(audio){
    ["play","pause","ended","loadedmetadata"]
      .forEach(name=>{
        audio.addEventListener(
          name,
          renderNovaIntegratedMediaLibrary
        );
      });
  }

  /*
    Existing library loading may be async. Refresh the NOVA view after
    file/folder changes without replacing the persistence implementation.
  */
  document.addEventListener("change",event=>{
    const target=event.target;
    if(
      target &&
      target.tagName==="INPUT" &&
      target.type==="file"
    ){
      setTimeout(renderNovaIntegratedMediaLibrary,100);
      setTimeout(renderNovaIntegratedMediaLibrary,700);
      setTimeout(renderNovaIntegratedMediaLibrary,1600);
    }
  });

  renderNovaIntegratedMediaLibrary();
}

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    initializeNovaIntegratedLibrary,
    {once:true}
  );
}else{
  initializeNovaIntegratedLibrary();
}


/* NOVA MEDIA FINAL INTEGRATION */
function novaEnsureIntegratedMediaVisible(){
  const controls=document.getElementById("novaIntegratedMediaControls");
  if(controls){
    controls.style.display="block";
    controls.style.visibility="visible";
  }

  try{
    renderNovaIntegratedMediaLibrary();
  }catch(e){}
}

document.addEventListener("DOMContentLoaded",()=>{
  novaEnsureIntegratedMediaVisible();

  const media=document.getElementById("novaMediaLibraryButton");
  if(media){
    const clean=media.cloneNode(true);
    media.replaceWith(clean);
    clean.addEventListener("click",()=>{
      novaEnsureIntegratedMediaVisible();
      openNovaIntegratedMediaLibrary();
    });
  }
},{once:true});


function novaPinMediaPlayer(){
 const controls=document.getElementById("novaIntegratedMediaControls");
 if(!controls)return;
 controls.style.setProperty("display","block","important");
 controls.style.setProperty("visibility","visible","important");
 controls.style.setProperty("opacity","1","important");
}
if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",novaPinMediaPlayer,{once:true});
}else{novaPinMediaPlayer();}
window.addEventListener("load",novaPinMediaPlayer,{once:true});


/* ============================================================
   NOVA FULL MEDIA HUB — VIDEO + YOUTUBE RESTORED
   ============================================================ */

function novaOpenMediaPage(page){
  const shell=document.getElementById("novaIntegratedMediaLibrary");
  const videoPage=document.getElementById("novaIntegratedVideoLibrary");
  const youtubePage=document.getElementById("novaIntegratedYouTube");
  const list=document.getElementById("novaMediaLibraryList");
  if(!shell)return;

  shell.classList.add("active");
  shell.classList.toggle("novaMediaPageMode",page!=="music");
  if(videoPage)videoPage.classList.toggle("active",page==="video");
  if(youtubePage)youtubePage.classList.toggle("active",page==="youtube");
  if(list)list.style.display=page==="music"?"":"none";

  const title=shell.querySelector(".novaMediaLibraryTitle");
  if(title){
    title.textContent=page==="video"?"VIDEO LIBRARY":page==="youtube"?"YOUTUBE":"MEDIA LIBRARY";
  }
  if(page==="music"){
    try{renderNovaIntegratedMediaLibrary();}catch(e){}
  }
  if(page==="video")novaRenderVideoList();
}

function novaRenderVideoList(){
  const list=document.getElementById("videoList");
  const count=document.getElementById("novaVideoCount");
  if(!list)return;
  if(count)count.textContent=`${videoLibrary.length} ${videoLibrary.length===1?"VIDEO":"VIDEOS"}`;
  list.innerHTML="";
  videoLibrary.forEach((item,index)=>{
    const row=document.createElement("button");
    row.type="button";
    row.className=`novaVideoTrack${index===videoIndex?" active":""}`;
    const name=item.file&&item.file.name?item.file.name:`Video ${index+1}`;
    row.innerHTML=`<span>${String(index+1).padStart(2,"0")}</span><span></span><span>${index===videoIndex?"ACTIVE":""}</span>`;
    row.children[1].textContent=name;
    row.addEventListener("click",()=>playVideo(index));
    list.appendChild(row);
  });
}

function novaHandleVideoFiles(event){
  const files=Array.from(event.target.files||[]).filter(file=>file.type.startsWith("video/"));
  for(const file of files){
    videoLibrary.push({file,url:URL.createObjectURL(file)});
  }
  novaRenderVideoList();
  if(files.length && videoIndex<0)videoIndex=0;
}

function playVideo(index){
  if(!videoLibrary.length){try{speak("No videos are loaded.");}catch(e){} return;}
  if(typeof index==="number")videoIndex=index;
  if(videoIndex<0)videoIndex=0;
  const item=videoLibrary[videoIndex];
  const video=document.getElementById("videoPlayer");
  if(!video||!item)return;
  video.src=item.url;
  video.play().catch(()=>{});
  novaRenderVideoList();
  try{log(`Playing video: ${item.file.name}`,"success");}catch(e){}
}
function pauseVideo(){const v=document.getElementById("videoPlayer");if(v)v.pause();}
function toggleVideo(){
  const v=document.getElementById("videoPlayer");if(!v)return;
  if(v.paused){if(!v.src)playVideo();else v.play().catch(()=>{});}else v.pause();
}
function stopVideo(){const v=document.getElementById("videoPlayer");if(v){v.pause();v.currentTime=0;}}
function nextVideo(){
  if(!videoLibrary.length){try{speak("No videos are loaded.");}catch(e){} return;}
  videoIndex=(videoIndex+1)%videoLibrary.length;playVideo(videoIndex);
}
function previousVideo(){
  if(!videoLibrary.length){try{speak("No videos are loaded.");}catch(e){} return;}
  videoIndex=(videoIndex-1+videoLibrary.length)%videoLibrary.length;playVideo(videoIndex);
}

function extractYouTubeId(value){
  value=String(value||"").trim();
  if(/^[a-zA-Z0-9_-]{11}$/.test(value))return value;
  const patterns=[
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  for(const pattern of patterns){const match=value.match(pattern);if(match)return match[1];}
  return null;
}
function loadYouTube(){
  const input=document.getElementById("youtubeInput");
  const id=extractYouTubeId(input?input.value:"");
  if(!id){try{speak("I couldn't find a valid YouTube video ID.");}catch(e){} return;}
  youtubeVideoId=id;
  const frame=document.getElementById("youtubeFrame");
  if(frame)frame.src=`https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  novaOpenMediaPage("youtube");
  try{log(`YouTube video loaded: ${id}`,"success");}catch(e){}
}
function youtubeCommand(command){
  const frame=document.getElementById("youtubeFrame");
  if(!youtubeVideoId||!frame||!frame.src){try{speak("No YouTube video is loaded.");}catch(e){} return;}
  frame.contentWindow.postMessage(JSON.stringify({event:"command",func:command,args:[]}),"*");
}

function initializeNovaFullMediaHub(){
  const videoButton=document.getElementById("novaVideoLibraryButton");
  const youtubeButton=document.getElementById("novaYouTubeButton");
  const mediaButton=document.getElementById("novaMediaLibraryButton");
  const addVideos=document.getElementById("novaAddVideosButton");
  const videoFiles=document.getElementById("videoFiles");
  const video=document.getElementById("videoPlayer");
  const videoVolume=document.getElementById("videoVolume");

  if(videoButton)videoButton.addEventListener("click",()=>novaOpenMediaPage("video"));
  if(youtubeButton)youtubeButton.addEventListener("click",()=>novaOpenMediaPage("youtube"));
  if(mediaButton)mediaButton.addEventListener("click",()=>novaOpenMediaPage("music"));
  if(addVideos)addVideos.addEventListener("click",()=>videoFiles&&videoFiles.click());
  if(videoFiles)videoFiles.addEventListener("change",novaHandleVideoFiles);
  if(videoVolume&&video){
    video.volume=Number(videoVolume.value||.8);
    videoVolume.addEventListener("input",e=>video.volume=Number(e.target.value));
  }
  if(video)video.addEventListener("ended",nextVideo);
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initializeNovaFullMediaHub,{once:true});
}else initializeNovaFullMediaHub();


/* NOVA MEDIA HUB FIX: visible music list, fixed YouTube, movable popup, saved video/YouTube lists */
const NOVA_VIDEO_DB2="novaVideoPlaylistV2", NOVA_VIDEO_STORE2="videos";
const NOVA_YT_KEY2="novaYouTubePlaylistV2";
let novaYtSaved=[];

function novaSetHubPage(page){
 const shell=document.getElementById("novaIntegratedMediaLibrary");
 const music=document.getElementById("novaMediaLibraryList");
 const video=document.getElementById("novaIntegratedVideoLibrary");
 const yt=document.getElementById("novaIntegratedYouTube");
 if(!shell)return;
 shell.classList.add("active");
 shell.classList.toggle("novaMediaPageMode",page!=="music");
 if(music)music.style.setProperty("display",page==="music"?"block":"none","important");
 if(video)video.classList.toggle("active",page==="video");
 if(yt)yt.classList.toggle("active",page==="youtube");
 ["Music","Video","YouTube"].forEach(n=>document.getElementById("novaHub"+n+"Tab")?.classList.toggle("active",page===n.toLowerCase()));
 const title=shell.querySelector(".novaMediaLibraryTitle");
 if(title)title.textContent=page==="music"?"MUSIC PLAYLIST":page==="video"?"VIDEO PLAYLIST":"YOUTUBE PLAYLIST";
 if(page==="music")try{renderNovaIntegratedMediaLibrary()}catch(e){}
 if(page==="video")try{novaRenderVideoList()}catch(e){}
 if(page==="youtube")novaRenderYtSaved();
}
novaOpenMediaPage=novaSetHubPage;

function novaLoadYouTubeV2(){
 const input=document.getElementById("youtubeInput"), id=extractYouTubeId(input?.value||"");
 if(!id){try{speak("I couldn't find a valid YouTube video ID.")}catch(e){} return}
 youtubeVideoId=id;
 const frame=document.getElementById("youtubeFrame");
 if(!frame)return;
 let url=`https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1`;
 if(location.protocol==="http:"||location.protocol==="https:")url+=`&origin=${encodeURIComponent(location.origin)}`;
 frame.src=url;
 novaSetHubPage("youtube");
}
loadYouTube=novaLoadYouTubeV2;

function novaRenderYtSaved(){
 const box=document.getElementById("novaYouTubeSavedList");if(!box)return;box.innerHTML="";
 novaYtSaved.forEach((x,i)=>{
  const row=document.createElement("div");row.className="novaYtRow";
  const name=document.createElement("span");name.textContent=x.url;
  const play=document.createElement("button");play.textContent="PLAY";play.onclick=()=>{document.getElementById("youtubeInput").value=x.url;loadYouTube()};
  const del=document.createElement("button");del.textContent="REMOVE";del.onclick=()=>{novaYtSaved.splice(i,1);novaSaveYt();novaRenderYtSaved()};
  row.append(name,play,del);box.appendChild(row);
 });
}
function novaSaveYt(){localStorage.setItem(NOVA_YT_KEY2,JSON.stringify(novaYtSaved))}
function novaAddCurrentYt(){
 const raw=document.getElementById("youtubeInput")?.value.trim()||"",id=extractYouTubeId(raw);
 if(!id)return;const url=`https://www.youtube.com/watch?v=${id}`;
 if(!novaYtSaved.some(x=>x.id===id)){novaYtSaved.push({id,url});novaSaveYt();novaRenderYtSaved()}
}

function novaVideoDB(){
 return new Promise((ok,no)=>{const q=indexedDB.open(NOVA_VIDEO_DB2,1);
 q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(NOVA_VIDEO_STORE2))q.result.createObjectStore(NOVA_VIDEO_STORE2,{keyPath:"key"})};
 q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});
}
async function novaPersistVideo(file){
 try{const db=await novaVideoDB(),tx=db.transaction(NOVA_VIDEO_STORE2,"readwrite");
 tx.objectStore(NOVA_VIDEO_STORE2).put({key:`${file.name}|${file.size}|${file.lastModified}`,file});db.close()}catch(e){}
}
async function novaRestoreVideos(){
 try{const db=await novaVideoDB(),q=db.transaction(NOVA_VIDEO_STORE2).objectStore(NOVA_VIDEO_STORE2).getAll();
 q.onsuccess=()=>{if(q.result.length){videoLibrary.length=0;q.result.forEach(x=>videoLibrary.push({file:x.file,url:URL.createObjectURL(x.file)}));novaRenderVideoList()}db.close()}}catch(e){}
}
async function novaClearVideos(){
 videoLibrary.forEach(x=>{try{URL.revokeObjectURL(x.url)}catch(e){}});videoLibrary.length=0;videoIndex=-1;novaRenderVideoList();
 try{const db=await novaVideoDB();db.transaction(NOVA_VIDEO_STORE2,"readwrite").objectStore(NOVA_VIDEO_STORE2).clear();db.close()}catch(e){}
}

function novaMakeMediaMovable(){
 const shell=document.getElementById("novaIntegratedMediaLibrary"),head=shell?.querySelector(".novaMediaLibraryHeader");if(!shell||!head)return;
 let drag=false,dx=0,dy=0;
 head.addEventListener("pointerdown",e=>{if(e.target.closest("button,input"))return;const r=shell.getBoundingClientRect();shell.classList.add("novaDragged");shell.style.left=r.left+"px";shell.style.top=r.top+"px";dx=e.clientX-r.left;dy=e.clientY-r.top;drag=true;head.setPointerCapture?.(e.pointerId)});
 head.addEventListener("pointermove",e=>{if(!drag)return;shell.style.left=Math.max(0,Math.min(innerWidth-shell.offsetWidth,e.clientX-dx))+"px";shell.style.top=Math.max(0,Math.min(innerHeight-shell.offsetHeight,e.clientY-dy))+"px"});
 head.addEventListener("pointerup",()=>drag=false);head.addEventListener("pointercancel",()=>drag=false);
}

function novaHubV2Init(){
 document.getElementById("novaHubMusicTab")?.addEventListener("click",()=>novaSetHubPage("music"));
 document.getElementById("novaHubVideoTab")?.addEventListener("click",()=>novaSetHubPage("video"));
 document.getElementById("novaHubYouTubeTab")?.addEventListener("click",()=>novaSetHubPage("youtube"));
 document.getElementById("novaSaveYouTubeButton")?.addEventListener("click",novaAddCurrentYt);
 document.getElementById("novaClearYouTubeButton")?.addEventListener("click",()=>{novaYtSaved=[];novaSaveYt();novaRenderYtSaved()});
 document.getElementById("novaClearVideosButton")?.addEventListener("click",novaClearVideos);
 const vf=document.getElementById("videoFiles");
 vf?.addEventListener("change",e=>Array.from(e.target.files||[]).filter(f=>f.type.startsWith("video/")).forEach(novaPersistVideo));
 try{novaYtSaved=JSON.parse(localStorage.getItem(NOVA_YT_KEY2)||"[]")}catch(e){novaYtSaved=[]}
 novaRenderYtSaved();novaRestoreVideos();novaMakeMediaMovable();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",novaHubV2Init,{once:true});else novaHubV2Init();


/* ============================================================
   NOVA MEDIA — TRUE SECOND-MONITOR POP-OUT
   ============================================================ */
let novaMediaPopoutWindow=null;

function openNovaMediaPopout(){
 if(novaMediaPopoutWindow&&!novaMediaPopoutWindow.closed){
   novaMediaPopoutWindow.focus();
   return;
 }

 novaMediaPopoutWindow=window.open(
   "",
   "NOVA_MEDIA_CENTER",
   "popup=yes,width=980,height=760,resizable=yes,scrollbars=yes"
 );

 if(!novaMediaPopoutWindow){
   try{log("Media window blocked. Allow pop-ups for NOVA.","warn")}catch(e){}
   return;
 }

 const w=novaMediaPopoutWindow;
 w.document.open();
 w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>NOVA MEDIA</title>
<style>
html,body{margin:0;min-height:100%;background:#020a10;color:#d9f8ff;font-family:Inter,Segoe UI,Arial,sans-serif}
*{box-sizing:border-box}
header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#07121b;border-bottom:1px solid rgba(54,217,255,.22)}
header strong{margin-right:auto;color:#36d9ff;letter-spacing:2px}
button,.fileButton{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(54,217,255,.28);border-radius:10px;background:#06121b;color:#36d9ff;padding:8px 12px;font-weight:700;cursor:pointer;font-size:12px}
button:hover,.fileButton:hover,.active{color:#39ff88;border-color:rgba(57,255,136,.5)}
main{padding:14px}
.tabs{display:flex;gap:8px;margin-bottom:12px}
.page{display:none}.page.active{display:block}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:9px 0}
input[type=file]{display:none}
input[type=text]{flex:1;min-width:300px;background:#02080d;color:white;border:1px solid rgba(54,217,255,.25);border-radius:8px;padding:10px}
#stage{width:100%;aspect-ratio:16/9;max-height:56vh;background:#000;border:1px solid rgba(54,217,255,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;color:rgba(54,217,255,.4)}
#stage video,#stage iframe{width:100%;height:100%;border:0;border-radius:10px;background:#000}
.list{max-height:45vh;overflow:auto;margin-top:10px}
.item{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:8px;width:100%;align-items:center;text-align:left;margin:3px 0}
.item span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#musicSeek{width:100%}
.muted{font-size:9px;color:rgba(54,217,255,.6);letter-spacing:1px}
</style>
</head>
<body>
<header>
 <strong>NOVA MEDIA</strong>
 <button id="closeBtn">CLOSE</button>
</header>
<main>
 <div class="tabs">
  <button id="musicTab" class="active">MUSIC</button>
  <button id="watchTab">VIDEOS + YOUTUBE</button>
 </div>

 <div id="music" class="page active">
  <div class="row">
   <label class="fileButton">ADD MUSIC
    <input id="popupMusicFiles" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.webm" multiple>
   </label>
   <label class="fileButton">ADD FOLDER
    <input id="popupMusicFolder" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.webm" multiple webkitdirectory directory>
   </label>
   <button id="restoreMusicBtn">RESTORE PLAYLIST</button>
   <button id="clearMusicBtn">CLEAR PLAYLIST</button>
   <span id="musicCount" class="muted">0 TRACKS</span>
  </div>

  <input id="musicSeek" type="range" min="0" max="100" value="0">

  <div class="row">
   <button id="musicPrev">PREVIOUS</button>
   <button id="musicToggle">PLAY / PAUSE</button>
   <button id="musicStop">STOP</button>
   <button id="musicNext">NEXT</button>
  </div>

  <div id="musicList" class="list"></div>
 </div>

 <div id="watch" class="page">
  <div class="row">
   <label class="fileButton">ADD VIDEO FILES
    <input id="popupVideoFiles" type="file" accept="video/*" multiple>
   </label>
   <input id="link" type="text" placeholder="Paste a YouTube link">
   <button id="loadLinkBtn">LOAD LINK</button>
   <button id="saveLinkBtn">SAVE LINK</button>
   <button id="clearWatchBtn">CLEAR PLAYLIST</button>
  </div>

  <div id="stage">LOAD A VIDEO FILE OR YOUTUBE LINK</div>

  <div class="row">
   <button id="watchPrev">PREVIOUS</button>
   <button id="watchToggle">PLAY / PAUSE</button>
   <button id="watchStop">STOP</button>
   <button id="watchNext">NEXT</button>
  </div>

  <div id="watchList" class="list"></div>
 </div>
</main>

<script>
const main=window.opener;
let watchIndex=-1;
let currentType="";

function el(id){return document.getElementById(id)}

function showPage(name){
 el("music").classList.toggle("active",name==="music");
 el("watch").classList.toggle("active",name==="watch");
 el("musicTab").classList.toggle("active",name==="music");
 el("watchTab").classList.toggle("active",name==="watch");
 refresh();
}

function musicLib(){return main&&main.musicLibrary?main.musicLibrary:[]}
function videoLib(){return main&&main.videoLibrary?main.videoLibrary:[]}
function ytLib(){return main&&main.novaYtSaved?main.novaYtSaved:[]}

function receiveMusic(files,replace){
 const selected=Array.from(files||[]);
 if(!selected.length)return;
 if(typeof main.addMusicFiles==="function"){
   main.addMusicFiles(selected,!!replace,true);
 }
 setTimeout(refresh,150);
}

function receiveVideos(files){
 const selected=Array.from(files||[]).filter(f=>f.type.startsWith("video/"));
 if(!selected.length)return;

 if(typeof main.novaHandleVideoFiles==="function"){
   main.novaHandleVideoFiles({target:{files:selected}});
 }else if(main.videoLibrary){
   selected.forEach(file=>main.videoLibrary.push({file,url:main.URL.createObjectURL(file)}));
 }

 if(typeof main.novaPersistVideo==="function"){
   selected.forEach(file=>main.novaPersistVideo(file));
 }

 setTimeout(refresh,150);
}

function restoreMusic(){
 if(typeof main.restoreSavedPlaylist==="function"){
   main.restoreSavedPlaylist(true);
 }
 setTimeout(refresh,250);
}

function clearMusic(){
 if(typeof main.clearSavedPlaylist==="function"){
   main.clearSavedPlaylist();
 }else{
   const audio=main.document.getElementById("audioPlayer");
   if(audio){audio.pause();audio.removeAttribute("src");audio.load()}
   if(main.musicLibrary)main.musicLibrary.length=0;
   main.musicIndex=-1;
 }
 setTimeout(refresh,250);
}

function prevMusic(){
 const a=musicLib();
 if(!a.length)return;
 main.playMusic(main.musicIndex<=0?a.length-1:main.musicIndex-1);
}

function nextMusic(){
 const a=musicLib();
 if(!a.length)return;
 main.playMusic(main.musicIndex<0?0:(main.musicIndex+1)%a.length);
}

function toggleMusic(){
 const audio=main.document.getElementById("audioPlayer");
 if(!audio)return;
 if(main.musicIndex<0){
   if(musicLib().length)main.playMusic(0);
 }else if(audio.paused){
   audio.play().catch(()=>{});
 }else{
   audio.pause();
 }
}

function stopMusic(){
 const audio=main.document.getElementById("audioPlayer");
 if(audio){audio.pause();audio.currentTime=0}
}

function seekMusic(){
 const audio=main.document.getElementById("audioPlayer");
 if(audio&&Number.isFinite(audio.duration)&&audio.duration>0){
   audio.currentTime=audio.duration*(Number(el("musicSeek").value)/100);
 }
}

function parseYT(value){
 value=String(value||"").trim();
 try{
   const u=new URL(value);
   let id="";
   if(u.hostname.includes("youtu.be")){
     id=u.pathname.split("/").filter(Boolean)[0]||"";
   }else if(u.hostname.includes("youtube.com")){
     id=u.searchParams.get("v")||
       (u.pathname.startsWith("/shorts/")?u.pathname.split("/")[2]:"")||
       (u.pathname.startsWith("/embed/")?u.pathname.split("/")[2]:"");
   }

   let raw=u.searchParams.get("t")||u.searchParams.get("start")||"0";
   let start=Number(raw)||0;

   if(!start&&/[hms]/i.test(raw)){
     const h=Number((raw.match(/(\d+)h/i)||[])[1]||0);
     const m=Number((raw.match(/(\d+)m/i)||[])[1]||0);
     const s=Number((raw.match(/(\d+)s/i)||[])[1]||0);
     start=h*3600+m*60+s;
   }

   return id?{id,start}:null;
 }catch(e){}

 return /^[A-Za-z0-9_-]{11}$/.test(value)?{id:value,start:0}:null;
}

function showLocal(sourceIndex){
 const item=videoLib()[sourceIndex];
 if(!item)return;

 currentType="local";
 const stage=el("stage");
 stage.innerHTML="";

 const video=document.createElement("video");
 video.id="watchVideo";
 video.controls=true;
 video.autoplay=true;
 video.src=item.url;
 video.addEventListener("ended",nextWatch);
 stage.appendChild(video);
}

function showYT(url){
 const parsed=parseYT(url);
 if(!parsed)return;

 currentType="youtube";
 const stage=el("stage");
 stage.innerHTML="";

 const frame=document.createElement("iframe");
 frame.id="watchYT";
 frame.allow="autoplay; encrypted-media; picture-in-picture";
 frame.allowFullscreen=true;
 frame.src="https://www.youtube.com/embed/"+encodeURIComponent(parsed.id)+
   "?enablejsapi=1&playsinline=1"+(parsed.start?"&start="+parsed.start:"");

 stage.appendChild(frame);
}

function loadLink(){
 const raw=el("link").value;
 if(parseYT(raw))showYT(raw);
}

function saveLink(){
 const raw=el("link").value;
 const parsed=parseYT(raw);
 if(!parsed)return;

 const url="https://www.youtube.com/watch?v="+parsed.id;

 if(main.novaYtSaved&&!main.novaYtSaved.some(x=>x.id===parsed.id)){
   main.novaYtSaved.push({id:parsed.id,url});
   if(typeof main.novaSaveYt==="function")main.novaSaveYt();
 }

 refresh();
}

function watchItems(){
 return [
   ...videoLib().map((x,i)=>({
     type:"local",
     sourceIndex:i,
     name:x.file&&x.file.name?x.file.name:"Video"
   })),
   ...ytLib().map((x,i)=>({
     type:"youtube",
     sourceIndex:i,
     name:x.url,
     url:x.url
   }))
 ];
}

function playWatch(index){
 const items=watchItems();
 if(!items.length)return;

 watchIndex=(index+items.length)%items.length;
 const item=items[watchIndex];

 if(item.type==="local")showLocal(item.sourceIndex);
 else showYT(item.url);

 refresh();
}

function prevWatch(){
 const items=watchItems();
 if(!items.length)return;
 playWatch(watchIndex<=0?items.length-1:watchIndex-1);
}

function nextWatch(){
 const items=watchItems();
 if(!items.length)return;
 playWatch(watchIndex<0?0:watchIndex+1);
}

function toggleWatch(){
 if(currentType==="local"){
   const video=el("watchVideo");
   if(!video)return;
   if(video.paused)video.play().catch(()=>{});
   else video.pause();
 }else if(currentType==="youtube"){
   const frame=el("watchYT");
   if(frame&&frame.contentWindow){
     frame.contentWindow.postMessage(
       JSON.stringify({event:"command",func:"playVideo",args:[]}),
       "*"
     );
   }
 }
}

function stopWatch(){
 if(currentType==="local"){
   const video=el("watchVideo");
   if(video){video.pause();video.currentTime=0}
 }else if(currentType==="youtube"){
   const frame=el("watchYT");
   if(frame&&frame.contentWindow){
     frame.contentWindow.postMessage(
       JSON.stringify({event:"command",func:"stopVideo",args:[]}),
       "*"
     );
   }
 }
}

function clearWatch(){
 if(typeof main.novaClearVideos==="function")main.novaClearVideos();

 if(main.novaYtSaved){
   main.novaYtSaved.length=0;
   if(typeof main.novaSaveYt==="function")main.novaSaveYt();
 }

 watchIndex=-1;
 currentType="";
 el("stage").textContent="LOAD A VIDEO FILE OR YOUTUBE LINK";
 setTimeout(refresh,200);
}

function refresh(){
 if(!main||main.closed)return;

 const music=musicLib();
 const ml=el("musicList");
 ml.innerHTML="";
 el("musicCount").textContent=music.length+" TRACK"+(music.length===1?"":"S");

 music.forEach((item,index)=>{
   const b=document.createElement("button");
   b.className="item";
   b.innerHTML="<span>"+String(index+1).padStart(2,"0")+
     "</span><span></span><span>"+(index===main.musicIndex?"PLAYING":"PLAY")+"</span>";
   b.children[1].textContent=item.file&&item.file.name?item.file.name:"Track";
   b.addEventListener("click",()=>main.playMusic(index));
   ml.appendChild(b);
 });

 const audio=main.document.getElementById("audioPlayer");
 if(audio&&Number.isFinite(audio.duration)&&audio.duration>0){
   el("musicSeek").value=(audio.currentTime/audio.duration)*100;
 }

 const wl=el("watchList");
 wl.innerHTML="";

 watchItems().forEach((item,index)=>{
   const b=document.createElement("button");
   b.className="item";
   b.innerHTML="<span>"+String(index+1).padStart(2,"0")+
     "</span><span></span><span>PLAY</span>";
   b.children[1].textContent=(item.type==="youtube"?"YOUTUBE • ":"VIDEO • ")+item.name;
   b.addEventListener("click",()=>playWatch(index));
   wl.appendChild(b);
 });
}

el("closeBtn").addEventListener("click",()=>window.close());
el("musicTab").addEventListener("click",()=>showPage("music"));
el("watchTab").addEventListener("click",()=>showPage("watch"));

el("popupMusicFiles").addEventListener("change",e=>{
 receiveMusic(e.target.files,false);
 e.target.value="";
});

el("popupMusicFolder").addEventListener("change",e=>{
 receiveMusic(e.target.files,true);
 e.target.value="";
});

el("popupVideoFiles").addEventListener("change",e=>{
 receiveVideos(e.target.files);
 e.target.value="";
});

el("restoreMusicBtn").addEventListener("click",restoreMusic);
el("clearMusicBtn").addEventListener("click",clearMusic);
el("musicPrev").addEventListener("click",prevMusic);
el("musicToggle").addEventListener("click",toggleMusic);
el("musicStop").addEventListener("click",stopMusic);
el("musicNext").addEventListener("click",nextMusic);
el("musicSeek").addEventListener("input",seekMusic);

el("loadLinkBtn").addEventListener("click",loadLink);
el("saveLinkBtn").addEventListener("click",saveLink);
el("clearWatchBtn").addEventListener("click",clearWatch);
el("watchPrev").addEventListener("click",prevWatch);
el("watchToggle").addEventListener("click",toggleWatch);
el("watchStop").addEventListener("click",stopWatch);
el("watchNext").addEventListener("click",nextWatch);

setInterval(refresh,1000);
refresh();
<\/script>
</body>
</html>`);
 w.document.close();
}

function initializeNovaMediaPopout(){
  document.getElementById("novaMediaPopoutButton")?.addEventListener("click",openNovaMediaPopout);
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initializeNovaMediaPopout,{once:true});
}else initializeNovaMediaPopout();
