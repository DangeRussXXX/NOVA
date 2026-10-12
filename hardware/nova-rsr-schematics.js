
/* RSR schematic integration — additive only, no hardware/voice/media modifications. */
(()=>{'use strict';
 const WINDOW_ID='novaRsrSchematicsWindow', BUTTON_ID='novaRsrSchematicButton';
 let z=120000;
 const css=(el,styles)=>Object.assign(el.style,styles);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function open(){const panel=ensureWindow();panel.hidden=false;panel.style.zIndex=String(++z);}
 function ensureWindow(){let win=document.getElementById(WINDOW_ID);if(win)return win;
  win=document.createElement('section');win.id=WINDOW_ID;win.setAttribute('aria-label','RSR Schematic Reference');
  win.innerHTML='<div class="nova-rsr-schem-header"><strong>◈ RSR TRAINER · SCHEMATICS</strong><div class="nova-rsr-schem-actions"><button type="button" data-action="min" title="Minimize">—</button><button type="button" data-action="max" title="Maximize">□</button><button type="button" data-action="close" title="Close">×</button></div></div><iframe title="RSR schematic images and zoom controls" loading="lazy" src="hardware/rsr-schematics/index.html"></iframe><div class="nova-rsr-schem-resize" title="Resize schematic window"></div>';
  document.body.appendChild(win);win.hidden=true;
  const header=win.querySelector('.nova-rsr-schem-header');let drag=null, resize=null, saved=null;
  header.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button')||win.classList.contains('nova-rsr-schem-max'))return;const r=win.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};header.setPointerCapture(e.pointerId)});
  header.addEventListener('pointermove',e=>{if(!drag)return;win.style.left=clamp(drag.left+e.clientX-drag.x,0,Math.max(0,innerWidth-100))+'px';win.style.top=clamp(drag.top+e.clientY-drag.y,0,Math.max(0,innerHeight-50))+'px'});
  for(const name of ['pointerup','pointercancel'])header.addEventListener(name,()=>drag=null);
  win.querySelector('.nova-rsr-schem-resize').addEventListener('pointerdown',function(e){if(e.button!==0)return;e.preventDefault();const r=win.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,w:r.width,h:r.height};this.setPointerCapture(e.pointerId)});
  const grip=win.querySelector('.nova-rsr-schem-resize');grip.addEventListener('pointermove',e=>{if(!resize)return;win.style.width=clamp(resize.w+e.clientX-resize.x,420,innerWidth)+'px';win.style.height=clamp(resize.h+e.clientY-resize.y,320,innerHeight)+'px'});
  for(const name of ['pointerup','pointercancel'])grip.addEventListener(name,()=>resize=null);
  win.querySelector('[data-action="close"]').onclick=()=>{win.hidden=true};
  win.querySelector('[data-action="min"]').onclick=()=>{win.hidden=true;const b=document.getElementById(BUTTON_ID);if(b)b.textContent='↗ SCHEMATICS'};
  win.querySelector('[data-action="max"]').onclick=()=>{const b=win.querySelector('[data-action="max"]');if(win.classList.contains('nova-rsr-schem-max')){win.classList.remove('nova-rsr-schem-max');if(saved)css(win,saved);b.textContent='□'}else{saved={left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height};win.classList.add('nova-rsr-schem-max');b.textContent='❐'}};
  win.addEventListener('pointerdown',()=>win.style.zIndex=String(++z));return win;
 }
 function attach(){const lab=document.getElementById('rsrLab');const header=lab&&lab.querySelector('.rsr-lab__header');if(!header||document.getElementById(BUTTON_ID))return;
 const b=document.createElement('button');b.id=BUTTON_ID;b.type='button';b.className='nova-rsr-schem-launch';b.textContent='▤ SCHEMATICS';b.title='Open RSR schematic reference in a separate floating window';b.onclick=()=>{b.textContent='▤ SCHEMATICS';open()};header.appendChild(b);
 }
 attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
 window.novaOpenRSRSchematics=open;
})();
