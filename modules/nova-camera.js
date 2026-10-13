/* ============================================================

   NOVA CAMERA

   Extracted from index.html during Step 3 modularization.

   ============================================================ */

/* ============================================================

   Local USB / built-in cameras via browser MediaDevices API.

   ============================================================ */

let novaCameraPopupWindow = null;

function novaCameraDocument(){

  try{

    if(novaCameraPopupWindow && !novaCameraPopupWindow.closed){

      return novaCameraPopupWindow.document;

    }

  }catch(e){}

  return document;

}

let desktopCameraStream = null;

let desktopCameraRecorder = null;

let desktopCameraRecordedChunks = [];

let desktopCameraPopup = null;

function setDesktopCameraStatus(online, text){

  const dot = novaCameraDocument().getElementById("cameraStatusDot");

  const label = novaCameraDocument().getElementById("cameraStatusText");

  const placeholder = novaCameraDocument().getElementById("cameraPlaceholder");

  if(dot){ dot.classList.toggle("green", !!online); dot.classList.toggle("red", !online); }

  if(label){ label.textContent = text || (online ? "CAMERA ONLINE" : "CAMERA OFFLINE"); }

  if(placeholder){ placeholder.style.display = online ? "none" : "flex"; }

}

async function refreshDesktopCameraList(){

  if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

  const select = novaCameraDocument().getElementById("desktopCameraSelect");

  if(!select) return;

  const previous = select.value;

  const devices = await navigator.mediaDevices.enumerateDevices();

  const cameras = devices.filter(device => device.kind === "videoinput");

  select.innerHTML = "";

  cameras.forEach((camera, index) => {

    const option = novaCameraDocument().createElement("option");

    option.value = camera.deviceId;

    option.textContent = camera.label || `CAMERA ${index + 1}`;

    select.appendChild(option);

  });

  if(!cameras.length){

    const option = novaCameraDocument().createElement("option");

    option.value = "";

    option.textContent = "NO CAMERA FOUND";

    select.appendChild(option);

  } else if(previous && cameras.some(camera => camera.deviceId === previous)){

    select.value = previous;

  }

}

async function startDesktopCamera(){

  const video = novaCameraDocument().getElementById("desktopCameraVideo");

  const select = novaCameraDocument().getElementById("desktopCameraSelect");

  if(!video) return;

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){

    setDesktopCameraStatus(false, "CAMERA NOT SUPPORTED");

    if(typeof log === "function") log("Browser camera access is not supported.", "error");

    return;

  }

  try{

    if(desktopCameraStream){ desktopCameraStream.getTracks().forEach(track => track.stop()); }

    const deviceId = select && select.value ? select.value : null;

    const constraints = { video: deviceId ? {deviceId:{exact:deviceId}} : true, audio:false };

    desktopCameraStream = await navigator.mediaDevices.getUserMedia(constraints);

    video.srcObject = desktopCameraStream;

    await video.play();

    setDesktopCameraStatus(true, "CAMERA ONLINE");

    await refreshDesktopCameraList();

    if(select && deviceId) select.value = deviceId;

    if(typeof log === "function") log("Desktop camera connected.", "success");

  }catch(error){

    desktopCameraStream = null;

    setDesktopCameraStatus(false, "CAMERA ACCESS FAILED");

    if(typeof log === "function") log(`Camera error: ${error.message}`, "error");

  }

}

function stopDesktopCamera(){

  const video = novaCameraDocument().getElementById("desktopCameraVideo");

  if(

    desktopCameraRecorder &&

    desktopCameraRecorder.state==="recording"

  ){

    desktopCameraRecorder.stop();

  }

  if(desktopCameraStream){ desktopCameraStream.getTracks().forEach(track => track.stop()); desktopCameraStream = null; }

  if(video) video.srcObject = null;

  setDesktopCameraStatus(false, "CAMERA OFFLINE");

  if(typeof log === "function") log("Desktop camera stopped.", "system");

}

async function changeDesktopCamera(){

  if(desktopCameraStream) await startDesktopCamera();

}

function fullscreenDesktopCamera(){

  if(

    !desktopCameraStream ||

    !desktopCameraStream.active

  ){

    log(

      "Start the camera before opening the full screen window.",

      "warning"

    );

    return;

  }

  desktopCameraPopup=

    window.open(

      "",

      "novaCameraWindow",

      "width=1100,height=700,resizable=yes,scrollbars=no"

    );

  if(!desktopCameraPopup){

    log(

      "Camera window was blocked. Allow pop-ups for NOVA.",

      "warning"

    );

    return;

  }

  desktopCameraPopup.document.open();

  desktopCameraPopup.document.write(

    `<!DOCTYPE html>

    <html>

    <head>

      <title>NOVA Camera Monitor</title>

      <style>

        html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}

        video{width:100%;height:100%;object-fit:contain;background:#000}

      </style>

    </head>

    <body>

      <video id="novaPopupCamera" autoplay playsinline muted></video>

    </body>

    </html>`

  );

  desktopCameraPopup.document.close();

  const popupVideo=

    desktopCameraPopup.document.getElementById(

      "novaPopupCamera"

    );

  if(popupVideo){

    popupVideo.srcObject=

      desktopCameraStream;

    popupVideo.play()

      .catch(()=>{});

  }

  desktopCameraPopup.focus();

  log(

    "Camera monitor opened in a separate window.",

    "success"

  );

}

function toggleDesktopCameraRecording(){

  const button=

    novaCameraDocument().getElementById(

      "cameraRecordButton"

    );

  if(

    desktopCameraRecorder &&

    desktopCameraRecorder.state==="recording"

  ){

    desktopCameraRecorder.stop();

    return;

  }

  if(

    !desktopCameraStream ||

    !desktopCameraStream.active

  ){

    log(

      "Start the camera before recording.",

      "warning"

    );

    return;

  }

  if(typeof MediaRecorder==="undefined"){

    log(

      "Camera recording is not supported by this browser.",

      "error"

    );

    return;

  }

  desktopCameraRecordedChunks=[];

  let options={};

  if(

    MediaRecorder.isTypeSupported(

      "video/webm;codecs=vp9"

    )

  ){

    options.mimeType=

      "video/webm;codecs=vp9";

  }else if(

    MediaRecorder.isTypeSupported(

      "video/webm;codecs=vp8"

    )

  ){

    options.mimeType=

      "video/webm;codecs=vp8";

  }

  try{

    desktopCameraRecorder=

      new MediaRecorder(

        desktopCameraStream,

        options

      );

  }catch(error){

    log(

      `Camera recorder error: ${error.message}`,

      "error"

    );

    return;

  }

  desktopCameraRecorder.addEventListener(

    "dataavailable",

    event=>{

      if(

        event.data &&

        event.data.size>0

      ){

        desktopCameraRecordedChunks.push(

          event.data

        );

      }

    }

  );

  desktopCameraRecorder.addEventListener(

    "stop",

    ()=>{

      const type=

        desktopCameraRecorder.mimeType ||

        "video/webm";

      const blob=

        new Blob(

          desktopCameraRecordedChunks,

          {type}

        );

      const url=

        URL.createObjectURL(

          blob

        );

      const link=

        novaCameraDocument().createElement(

          "a"

        );

      link.href=url;

      link.download=

        `nova-camera-${new Date().toISOString().replace(/[:.]/g,"-")}.webm`;

      novaCameraDocument().body.appendChild(

        link

      );

      link.click();

      link.remove();

      setTimeout(

        ()=>URL.revokeObjectURL(url),

        2000

      );

      if(button){

        button.textContent="RECORD";

        button.classList.remove(

          "rsrPatternActive"

        );

      }

      log(

        "Camera recording saved.",

        "success"

      );

    }

  );

  desktopCameraRecorder.start(

    1000

  );

  if(button){

    button.textContent=

      "STOP RECORDING";

    button.classList.add(

      "rsrPatternActive"

    );

  }

  log(

    "Camera recording started.",

    "success"

  );

}

function snapshotDesktopCamera(){

  const video = novaCameraDocument().getElementById("desktopCameraVideo");

  const canvas = novaCameraDocument().getElementById("desktopCameraSnapshot");

  if(!video || !canvas || !desktopCameraStream || !video.videoWidth){

    if(typeof log === "function") log("Start the camera before taking a snapshot.", "warning");

    return;

  }

  canvas.width = video.videoWidth; canvas.height = video.videoHeight;

  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  const link = novaCameraDocument().createElement("a");

  link.download = `nova-camera-${new Date().toISOString().replace(/[:.]/g,"-")}.png`;

  link.href = canvas.toDataURL("image/png");

  link.click();

  if(typeof log === "function") log("Camera snapshot captured.", "success");

}

novaCameraDocument().addEventListener("DOMContentLoaded", () => {

  const select = novaCameraDocument().getElementById("desktopCameraSelect");

  if(select) select.addEventListener("change", changeDesktopCamera);

  if(navigator.mediaDevices && navigator.mediaDevices.addEventListener){

    navigator.mediaDevices.addEventListener("devicechange", refreshDesktopCameraList);

  }

  refreshDesktopCameraList().catch(() => {});

});

function openNovaCameraScreen(){
  const panel=document.getElementById("novaCameraPanelSource");
  if(!panel)return;

  // Reuse the camera window instead of moving the panel a second time.
  if(novaCameraPopupWindow && !novaCameraPopupWindow.closed){
    novaCameraPopupWindow.focus();
    return;
  }

  // Compact, calendar-like opening dimensions. Full screen remains available.
  const w=window.open("","nova_camera_screen","width=980,height=690,resizable=yes,scrollbars=yes");
  if(!w){
    if(typeof log==="function") log("NOVA Camera screen was blocked. Allow pop-ups for this page.","warning");
    return;
  }
  novaCameraPopupWindow=w;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>NOVA DESKTOP CAMERA</title></head><body style="margin:0;background:#070a0f;color:#d9e4ef"><div id="cameraHost"></div></body></html>`);
  w.document.close();

  const novaCssLink=w.document.createElement("link");
  novaCssLink.rel="stylesheet";
  novaCssLink.href=new URL("nova.css",window.location.href).href;
  w.document.head.appendChild(novaCssLink);

  const cameraPopupStyle=w.document.createElement("style");
  cameraPopupStyle.textContent=`
    html,body{height:100%;min-height:0;margin:0;overflow:hidden;}
    body{box-sizing:border-box;padding:12px;}
    #cameraHost{height:100%;min-height:0;}
    #novaCameraPanelSource{display:flex!important;flex-direction:column!important;
      visibility:visible!important;width:100%!important;max-width:none!important;
      height:100%!important;min-height:0!important;box-sizing:border-box!important;margin:0!important;}
    #novaCameraPanelSource .panelHeader{flex:0 0 auto!important;padding:8px 12px!important;}
    #novaCameraPanelSource .panelBody{display:flex!important;flex-direction:column!important;
      gap:8px!important;flex:1 1 auto!important;min-height:0!important;
      max-height:none!important;overflow:hidden!important;padding:10px!important;}
    #novaCameraPanelSource .cameraControls{display:flex!important;flex-wrap:wrap!important;
      gap:6px!important;flex:0 0 auto!important;order:0!important;}
    #novaCameraPanelSource .cameraControls button{flex:1 1 auto!important;
      min-width:110px!important;width:auto!important;padding:7px 9px!important;}
    #novaCameraPanelSource .cameraControls button[onclick*="fullscreenDesktopCamera"]{flex:1 1 100%!important;}
    #novaCameraPanelSource .cameraViewport{flex:1 1 auto!important;min-height:0!important;
      height:auto!important;max-height:none!important;overflow:hidden!important;order:1!important;
      display:flex!important;align-items:center!important;justify-content:center!important;}
    #novaCameraPanelSource #desktopCameraVideo{display:block!important;width:100%!important;
      height:100%!important;min-height:0!important;max-height:100%!important;object-fit:contain!important;}
    #novaCameraPanelSource #desktopCameraSelect{flex:0 0 auto!important;order:2!important;}
    #novaCameraPanelSource .cameraStatusRow{flex:0 0 auto!important;order:3!important;}
    #novaCameraPanelSource #desktopCameraSnapshot{display:none!important;}
    @media(max-height:480px){#novaCameraPanelSource .panelBody{gap:4px!important;padding:5px!important;}}
  `;
  w.document.head.appendChild(cameraPopupStyle);

  ["startDesktopCamera","stopDesktopCamera","snapshotDesktopCamera","toggleDesktopCameraRecording","fullscreenDesktopCamera","changeDesktopCamera","refreshDesktopCameraList"].forEach(name=>{
    if(typeof window[name]==="function")w[name]=window[name];
  });

  panel.classList.remove("collapsed");
  panel.style.setProperty("display","flex","important");
  w.document.getElementById("cameraHost").appendChild(w.document.adoptNode(panel));
  const popupBody=panel.querySelector(".panelBody");
  if(popupBody){popupBody.classList.remove("collapsed");popupBody.style.setProperty("display","flex","important");}

  // Put the controls at the top, above the camera preview.
  const cameraControls=panel.querySelector(".cameraControls");
  if(popupBody && cameraControls)popupBody.insertBefore(cameraControls,popupBody.firstChild);

  w.addEventListener("beforeunload",()=>{
    novaCameraPopupWindow=null;
    const stack=document.querySelector(".novaPanelStack");
    if(stack){
      document.adoptNode(panel);
      panel.style.display="none";
      panel.style.removeProperty("height");
      stack.appendChild(panel);
    }
  },{once:true});
  try{w.focus()}catch(e){}
}

/* Camera defaults expanded when its existing screen is opened. */

function novaDefaultCameraExpanded(){

  const source=document.getElementById("novaCameraPanelSource");

  if(source){

    source.classList.remove("collapsed");

    source.setAttribute("data-default-expanded","true");

  }

}

if(document.readyState==="loading"){

  document.addEventListener("DOMContentLoaded",novaDefaultCameraExpanded,{once:true});

}else novaDefaultCameraExpanded();
