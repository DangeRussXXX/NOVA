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

  desktopCameraPopup.novaCameraDocument().open();
  desktopCameraPopup.novaCameraDocument().write(
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
  desktopCameraPopup.novaCameraDocument().close();

  const popupVideo=
    desktopCameraPopup.novaCameraDocument().getElementById(
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
  link.download = `amomii-camera-${new Date().toISOString().replace(/[:.]/g,"-")}.png`;
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
  const w=window.open("","nova_camera_screen","width=1180,height=820,resizable=yes,scrollbars=yes");
  if(!w){log("NOVA Camera screen was blocked. Allow pop-ups for this page.","warning");return;}
  novaCameraPopupWindow=w;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>NOVA DESKTOP CAMERA</title></head><body style="margin:0;padding:16px;background:#070a0f;color:#d9e4ef"><div style="text-align:right;margin-bottom:10px"><button onclick="window.close()">CLOSE CAMERA</button></div><div id="cameraHost"></div></body></html>`);
  w.document.close();
  const novaCssLink=w.document.createElement("link");
  novaCssLink.rel="stylesheet";
  novaCssLink.href=new URL("nova.css",window.location.href).href;
  w.document.head.appendChild(novaCssLink);
  ["startDesktopCamera","stopDesktopCamera","snapshotDesktopCamera","toggleDesktopCameraRecording","fullscreenDesktopCamera","changeDesktopCamera","refreshDesktopCameraList"].forEach(name=>{if(typeof window[name]==="function")w[name]=window[name];});
  panel.style.display="block";
  w.document.getElementById("cameraHost").appendChild(w.document.adoptNode(panel));

  /* Keep camera controls at the top of the camera popup for quick access. */
  const cameraBody=panel.querySelector(".panelBody");
  const cameraControls=panel.querySelector(".cameraControls");
  if(cameraBody && cameraControls){
    cameraBody.insertBefore(cameraControls,cameraBody.firstChild);
  }

  w.addEventListener("beforeunload",()=>{
    novaCameraPopupWindow=null;
    const stack=document.querySelector(".novaPanelStack");
    if(stack){document.adoptNode(panel);panel.style.display="none";stack.appendChild(panel);}
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
