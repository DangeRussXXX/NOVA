/* NOVA RSR PIN MAP v2 — photo calibration + clickable main-board holes.
   Replaces only rsr-pinmap-view.js. Keeps original RSR LED controls/animations intact.
   Calibration is local to this browser; never asserts electrical continuity.
*/
(function(){
 'use strict';
 if(window.novaRSRPinmapV2) return;
 const $=id=>document.getElementById(id);
 const URL='hardware/rsr-trainer/rsr-pinmap.json';
 const STORE='nova.rsr.pinmap.calibration.v2';
 let records=[], panel=null, overlay=null, mode='view', selectedBoard='BB1', selectedPin=null;
 let calibrating=null, cornerIndex=0, coords={};
 const corners=['A1','A63','J1','J63'];
 try {coords=JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){coords={};}
 function image(){return $('rsrLabPhoto');}
 function board(){return $('rsrLabBoard');}
 function save(){try{localStorage.setItem(STORE,JSON.stringify(coords));}catch(e){console.warn('Pin calibration not saved',e);}}
 function xy(event){const r=image().getBoundingClientRect();return {x:100*(event.clientX-r.left)/r.width,y:100*(event.clientY-r.top)/r.height};}
 function interpolate(boardName,row,col){
  const c=coords[boardName];if(!c||corners.some(k=>!c[k]))return null;
  const t=(col-1)/62, u=(row.charCodeAt(0)-65)/9;
  const p=c.A1,q=c.A63,r=c.J1,s=c.J63;
  return {x:(1-u)*((1-t)*p.x+t*q.x)+u*((1-t)*r.x+t*s.x),
          y:(1-u)*((1-t)*p.y+t*q.y)+u*((1-t)*r.y+t*s.y)};
 }
 function setStatus(message){const e=$('rsrMapStatus');if(e)e.textContent=message;}
 function ensure(){
  const viewport=$('rsrLabBoardViewport'), b=board();if(!viewport||!b||!image())return false;
  if(!panel||!panel.isConnected){
   panel=document.createElement('section');panel.id='rsrPinmapBrowser';panel.hidden=true;
   panel.setAttribute('aria-label','Interactive RSR breadboard pin map');
   Object.assign(panel.style,{position:'relative',top:'auto',left:'auto',right:'auto',zIndex:'65',background:'rgba(7,23,35,.96)',color:'#e5faff',padding:'10px',border:'1px solid #26b8d6',borderRadius:'8px',font:'12px Arial,sans-serif',boxSizing:'border-box',maxHeight:'43%',overflow:'auto'});
   panel.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:7px"><strong style="color:#16d7f5">RSR PIN MAP · PHOTO CALIBRATION v2</strong><select id="rsrMapBoard" aria-label="Breadboard"><option value="BB1">BB1 — UPPER</option><option value="BB2">BB2 — LOWER</option></select><button type="button" id="rsrMapCal">CALIBRATE 4 CORNERS</button><button type="button" id="rsrMapReset">RESET THIS BOARD</button><label><input type="checkbox" id="rsrMapDots" checked> SHOW HOLES</label></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="rsrMapSearch" placeholder="Find BB1-A1 or BB2-J63" aria-label="Find pin" style="flex:1;min-width:180px;padding:6px;background:#fff;color:#111"><button type="button" id="rsrMapFind">FIND PIN</button><span id="rsrMapSelection">No hole selected</span></div>
   <div id="rsrMapStatus" role="status" style="margin-top:7px;color:#9dd9e8">Select a board, then calibrate its four corners.</div>
   <div style="margin-top:5px;color:#adc4cd">1,260 main holes; 400 rail records remain unpositioned. Calibration is approximate until checked against the photograph. Electrical nets unverified.</div>`;
   if(getComputedStyle(viewport).position==='static')viewport.style.position='relative';
   viewport.parentNode.insertBefore(panel,viewport);
   const controlStyle='background:#07364b;color:#eaffff;border:1px solid #269bc0;border-radius:5px;padding:6px;cursor:pointer';
   panel.querySelectorAll('button').forEach(x=>x.style.cssText=controlStyle);
   $('rsrMapBoard').style.cssText=controlStyle;
   $('rsrMapBoard').value=selectedBoard;
   $('rsrMapBoard').addEventListener('change',e=>{selectedBoard=e.target.value;calibrating=null;render();});
   $('rsrMapCal').addEventListener('click',()=>{calibrating=selectedBoard;cornerIndex=0;coords[calibrating]={};render();setStatus(`CALIBRATING ${calibrating}: click the CENTER of hole ${corners[cornerIndex]} in the PHOTO. Start with row A, column 1.`);});
   $('rsrMapReset').addEventListener('click',()=>{delete coords[selectedBoard];save();calibrating=null;render();});
   $('rsrMapDots').addEventListener('change',render);
   $('rsrMapFind').addEventListener('click',find);
   $('rsrMapSearch').addEventListener('keydown',e=>{if(e.key==='Enter')find();});
  }
  if(!overlay||!overlay.isConnected){
   overlay=document.createElement('div');overlay.id='rsrPinmapHoleLayer';
   Object.assign(overlay.style,{position:'absolute',inset:'0',zIndex:'45',pointerEvents:'none'});
   b.appendChild(overlay);
  }
  if(!image().dataset.rsrPinmapBound){
   image().dataset.rsrPinmapBound='1';
   image().addEventListener('click',e=>{
    if(!calibrating||panel.hidden)return;
    const pt=xy(e);if(pt.x<0||pt.x>100||pt.y<0||pt.y>100)return;
    coords[calibrating][corners[cornerIndex]]=pt;cornerIndex++;
    if(cornerIndex===4){const finished=calibrating;calibrating=null;save();render();setStatus(`${finished} calibrated. Click any highlighted hole to inspect its address. Check alignment visually; RESET if needed.`);}
    else setStatus(`Saved ${corners[cornerIndex-1]}. Now click ${calibrating}-${corners[cornerIndex]} in the photograph (${cornerIndex+1} of 4).`);
   });
  }
  return true;
 }
 function render(){
  if(!ensure())return;
  overlay.replaceChildren();
  const img=image(), b=board();
  const imgRect=img.getBoundingClientRect(), boardRect=b.getBoundingClientRect();
  const boardWidth=boardRect.width||1, boardHeight=boardRect.height||1;
  const visible=!!$('rsrMapDots')?.checked;
  if(visible&&coords[selectedBoard]&&corners.every(k=>coords[selectedBoard][k])){
   const frag=document.createDocumentFragment();
   records.filter(p=>p.board===selectedBoard&&p.section==='MAIN'&&/^[A-J]$/.test(p.row)&&Number.isInteger(p.column)).forEach(p=>{
    const point=interpolate(selectedBoard,p.row,p.column);if(!point)return;
    const dot=document.createElement('button');dot.type='button';dot.title=p.id+' — electrical net unverified';dot.setAttribute('aria-label',p.id);
    dot.dataset.pin=p.id;
    const left=(imgRect.left-boardRect.left+imgRect.width*point.x/100)/boardWidth*100;
    const top=(imgRect.top-boardRect.top+imgRect.height*point.y/100)/boardHeight*100;
    Object.assign(dot.style,{position:'absolute',left:left+'%',top:top+'%',transform:'translate(-50%,-50%)',width:'7px',height:'7px',padding:'0',border:'1px solid #00e7ff',borderRadius:'50%',background:p.id===selectedPin?'#fff300':'rgba(0,221,245,.55)',boxShadow:p.id===selectedPin?'0 0 9px #fff300':'none',cursor:'pointer',pointerEvents:'auto'});
    dot.addEventListener('click',e=>{e.stopPropagation();select(p.id);});
    frag.appendChild(dot);
   });overlay.appendChild(frag);
  }
  if(!calibrating)setStatus(coords[selectedBoard]&&corners.every(k=>coords[selectedBoard][k])?`${selectedBoard}: ${overlay.children.length} main holes plotted. Click a dot or find an address.`:`${selectedBoard} not calibrated. Click CALIBRATE 4 CORNERS, then click A1, A63, J1, J63 on the photograph.`);
 }
 function select(id){const p=records.find(p=>p.id===id);if(!p){setStatus(`Pin ${id} not in the database.`);return;}
  selectedPin=id;const selection=$('rsrMapSelection');if(selection)selection.textContent=`${id} · ${p.section} · NET UNVERIFIED`;
  if(p.section==='MAIN'&&p.board!==selectedBoard){selectedBoard=p.board;$('rsrMapBoard').value=selectedBoard;}
  render();if(p.section!=='MAIN')setStatus(`${id}: rail record exists; physical location not calibrated.`);
 }
 function find(){const id=($('rsrMapSearch')?.value||'').trim().toUpperCase();if(!id)return;select(id);}
 function show(){if(!ensure())return;panel.hidden=false;mode='pins';render();}
 function hide(){mode='view';calibrating=null;if(panel)panel.hidden=true;if(overlay)overlay.replaceChildren();}
 document.addEventListener('click',e=>{const btn=e.target.closest?.('button');if(!btn)return;
  if(btn.id==='rsrLabViewPins'){
   Promise.resolve().then(()=>{if(!records.length){fetch(URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{if(!Array.isArray(data.pins))throw Error('Missing pins array');records=data.pins;show();}).catch(err=>{show();setStatus('Could not load pin map: '+err.message);});}else show();});
  }else if(['rsrLabViewBoard','rsrLabViewWiring','rsrLabClose'].includes(btn.id))hide();
 });
 window.addEventListener('resize',()=>{if(panel&&!panel.hidden)render();});
 window.novaRSRPinmapV2={show,hide,render,getCalibration:()=>JSON.parse(JSON.stringify(coords))};
})();
