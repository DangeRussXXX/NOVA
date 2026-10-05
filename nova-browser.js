/* ============================================================
   NOVA REAL BROWSER LAUNCHER
   ============================================================ */

let novaBrowserWindow=null;
const NOVA_BOOKMARKS_KEY="novaBrowserBookmarksV1";

function normalizeNovaBrowserTarget(value){
  const clean=String(value||"").trim();

  if(!clean){
    return "https://www.google.com/";
  }

  if(/^https?:\/\//i.test(clean)){
    return clean;
  }

  if(
    /^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(clean) &&
    !/\s/.test(clean)
  ){
    return "https://"+clean;
  }

  return "https://www.google.com/search?q="+
    encodeURIComponent(clean);
}

function openNovaBrowserPage(target){
  const url=normalizeNovaBrowserTarget(target);

  novaBrowserWindow=window.open(
    url,
    "novaRealBrowserWindow"
  );

  if(!novaBrowserWindow){
    log(
      "NOVA browser window was blocked. Allow pop-ups for this page.",
      "warning"
    );
    return false;
  }

  try{
    novaBrowserWindow.focus();
  }catch(e){}

  return true;
}

function novaBrowserGo(){
  const input=document.getElementById("novaGoogleSearch");
  if(!input)return;

  const value=input.value.trim();
  if(!value)return;

  if(openNovaBrowserPage(value)){
    log(
      `NOVA Browser: ${value}`,
      "success"
    );
  }
}

function searchGoogle(query){
  const clean=String(query||"").trim();
  if(!clean)return;

  const input=document.getElementById("novaGoogleSearch");
  if(input)input.value=clean;

  openNovaBrowserPage(
    "https://www.google.com/search?q="+
    encodeURIComponent(clean)
  );

  log(
    `Google search: ${clean}`,
    "success"
  );
}

function searchGoogleFromBrowser(){
  novaBrowserGo();
}

function startNovaBrowserVoiceSearch(){
  const Recognition=
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if(!Recognition){
    log(
      "Browser voice search is not supported by this browser.",
      "error"
    );
    return;
  }

  const recognition=new Recognition();
  recognition.lang="en-US";
  recognition.interimResults=false;
  recognition.maxAlternatives=1;

  recognition.onresult=event=>{
    const query=
      event.results[0][0].transcript.trim();

    const input=
      document.getElementById("novaGoogleSearch");

    if(input){
      input.value=query;
    }

    searchGoogle(query);
  };

  recognition.onerror=event=>{
    log(
      `Browser voice search error: ${event.error}`,
      "error"
    );
  };

  recognition.start();
}

function getNovaBookmarks(){
  try{
    const value=JSON.parse(
      localStorage.getItem(NOVA_BOOKMARKS_KEY) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  }catch(error){
    return [];
  }
}

function saveNovaBookmarks(bookmarks){
  localStorage.setItem(
    NOVA_BOOKMARKS_KEY,
    JSON.stringify(bookmarks)
  );

  renderNovaBookmarks();
}

function addNovaBookmark(){
  const input=document.getElementById("novaGoogleSearch");

  const raw=
    input && input.value.trim()
      ? input.value.trim()
      : "";

  if(!raw){
    log(
      "Enter a website or search in the NOVA Browser field first.",
      "warning"
    );
    return;
  }

  const url=normalizeNovaBrowserTarget(raw);
  const bookmarks=getNovaBookmarks();

  if(bookmarks.some(item=>item.url===url)){
    log(
      "That NOVA bookmark already exists.",
      "warning"
    );
    return;
  }

  bookmarks.push({
    title:raw,
    url
  });

  saveNovaBookmarks(bookmarks);

  log(
    `NOVA bookmark saved: ${raw}`,
    "success"
  );
}

function removeNovaBookmark(index){
  const bookmarks=getNovaBookmarks();

  if(index<0 || index>=bookmarks.length){
    return;
  }

  bookmarks.splice(index,1);
  saveNovaBookmarks(bookmarks);
}

function renderNovaBookmarks(){
  const list=document.getElementById("novaBookmarkList");
  if(!list)return;

  const bookmarks=getNovaBookmarks();
  list.innerHTML="";

  if(!bookmarks.length){
    const empty=document.createElement("div");
    empty.className="browserHint";
    empty.textContent="NO NOVA BOOKMARKS SAVED";
    list.appendChild(empty);
    return;
  }

  bookmarks.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="novaBookmarkItem";

    const open=document.createElement("button");
    open.className="control";
    open.type="button";
    open.textContent=item.title;
    open.onclick=()=>openNovaBrowserPage(item.url);

    const remove=document.createElement("button");
    remove.className="control danger";
    remove.type="button";
    remove.textContent="×";
    remove.title="Remove bookmark";
    remove.onclick=()=>removeNovaBookmark(index);

    row.appendChild(open);
    row.appendChild(remove);
    list.appendChild(row);
  });
}

document.addEventListener(
  "DOMContentLoaded",
  ()=>{
    const input=document.getElementById("novaGoogleSearch");

    if(input){
      input.addEventListener(
        "keydown",
        event=>{
          if(event.key==="Enter"){
            event.preventDefault();
            novaBrowserGo();
          }
        }
      );
    }

    renderNovaBookmarks();
  }
);
