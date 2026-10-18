/* NOVA NATIVE CHROME WINDOWS — live DOM portals, no custom window chrome.
   Existing NOVA controllers remain in the dashboard JS realm; live nodes move
   between same-origin windows and return when their Chrome window closes. */
(function(){
'use strict';
const records=new Map();
const originalGet=document.getElementById.bind(document);
const originalQuery=document.querySelector.bind(document);
const originalQueryAll=document.querySelectorAll.bind(document);
function find(id){for(const rec of records.values())if(rec.win&&!rec.win.closed){const el=rec.win.document.getElementById(id);if(el)return el;}return null;}
document.getElementById=function(id){return originalGet(id)||find(id);};
document.querySelector=function(selector){const result=originalQuery(selector);if(result)return result;for(const rec of records.values())if(rec.win&&!rec.win.closed){try{const found=rec.win.document.querySelector(selector);if(found)return found;}catch(_){}}return null;};
document.querySelectorAll=function(selector){const original=originalQueryAll(selector);if(original.length)return original;for(const rec of records.values())if(rec.win&&!rec.win.closed){try{const found=rec.win.document.querySelectorAll(selector);if(found.length)return found;}catch(_){}}return original;};
function makeWindow(key,title){
 const old=records.get(key);if(old?.win&&!old.win.closed){old.win.focus();return old;}
 let geometry={};try{geometry=JSON.parse(localStorage.getItem('novaNativeGeometry_'+key)||'{}');}catch(_){}
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
 const width=clamp(geometry.width,720,screen.availWidth||1920),height=clamp(geometry.height,520,screen.availHeight||1080);
 const left=clamp(geometry.left,0,Math.max(0,(screen.availWidth||1920)-width));
 const top=clamp(geometry.top,0,Math.max(0,(screen.availHeight||1080)-height));
 const w=window.open('','nova_native_'+key,`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
 if(!w){console.warn('[NOVA] Chrome blocked '+title+' window. Allow pop-ups for NOVA.');return null;}
 w.document.open();w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</title></head><body class="novaNativePopup" style="margin:0;background:#070d16;color:#d9edf8"><main id="novaNativeHost"></main></body></html>');w.document.close();
 // Reuse the exact active dashboard styles, including inline layout updates.
 document.querySelectorAll('link[rel="stylesheet"],style').forEach(node=>{
   const copy=node.cloneNode(true);
   if(copy.tagName==='LINK')copy.href=node.href;
   w.document.head.appendChild(copy);
 });
 const style=w.document.createElement('style');style.textContent=`
 html,body{width:100%;height:100%;min-height:0;margin:0!important;overflow:auto!important}
 body.novaNativePopup{background:#070d16!important;padding:0!important}
 #novaNativeHost{width:100%;min-height:100%;height:100%;display:flex;flex-direction:column}
 #novaNativeHost > .nova-float-window,#novaNativeHost > .novaFloatPanel{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;transform:none!important;display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;resize:none!important;overflow:auto!important;border-radius:0!important;box-shadow:none!important}
 #novaNativeHost > #rsrLab,#novaNativeHost > #amomiiTwin{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;margin:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;border:0!important;border-radius:0!important}
 #novaNativeHost > #amomiiTwin > .am-shell{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important}
 #novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{flex:1 1 auto!important;min-height:0!important;display:grid!important;grid-template-columns:minmax(270px,35%) minmax(0,1fr)!important}
 #novaNativeHost #rsrLab .rsr-lab__columns{grid-template-columns:minmax(270px,38%) minmax(0,1fr)!important}
 #novaNativeHost #amomiiTwin .am-hardware,#novaNativeHost #amomiiTwin .am-simulator,#novaNativeHost #rsrLab .rsr-lab__controls,#novaNativeHost #rsrLab .rsr-lab__simulator{min-width:0!important;min-height:0!important;overflow:auto!important}
 #novaNativeHost .nova-column-grip{display:none!important}
 #novaNativeHost .nova-float-actions,#novaNativeHost .nova-window-buttons,#novaNativeHost .nova-window-resize,#novaNativeHost .novaFloatClose,#novaNativeHost #amTwinClose,#novaNativeHost #rsrLabClose{display:none!important}
 #novaNativeHost .am-header,#novaNativeHost .rsr-lab__header{cursor:default!important}
 #novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{width:100%!important;max-width:none!important;box-sizing:border-box!important;overflow:hidden!important}
 #novaNativeHost #amomiiTwin .am-simulator,#novaNativeHost #rsrLab .rsr-lab__simulator{display:block!important;width:auto!important;max-width:none!important;min-width:0!important;overflow:auto!important}
 #novaNativeHost #amomiiTwin .am-hardware,#novaNativeHost #rsrLab .rsr-lab__controls{width:auto!important;max-width:none!important;min-width:0!important;overflow:auto!important}
 #novaNativeHost #rsrLab .rsr-lab__accordion-toolbar{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:8px!important}
 #novaNativeHost #rsrLab .nova-native-schematics{margin-left:0!important;position:static!important;transform:none!important;max-width:100%!important}
 #novaNativeHost #rsrLab .nova-native-schematics button{max-width:100%!important}
 #novaNativeHost .novaFloatPanel[data-nova-panel="library"]{position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:100%!important;height:100%!important;max-height:none!important;overflow:auto!important}
 #novaNativeHost .novaFloatPanel[data-nova-panel="library"] .novaMediaCenterToolbar{padding-right:18px!important}
 #novaNativeHost .novaFloatPanel .novaRightPanel{display:flex!important;width:100%!important;min-height:0!important}
 #novaNativeHost .novaUniversalPanelsToggle{margin-left:auto!important;flex-shrink:0!important;padding:9px 12px!important;border:1px solid var(--nova-electric,#23506a)!important;border-radius:7px!important;background:transparent!important;color:inherit!important;font:600 12px inherit!important;cursor:pointer!important}
 #novaNativeHost .am-header,#novaNativeHost .rsr-lab__header{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:10px!important;padding:12px 16px!important}
 #novaNativeHost #rsrLab .rsr-lab__controls>.rsr-lab__accordion-toolbar,#novaNativeHost #amomiiTwin .am-panel-controls{display:none!important}
 #novaNativeHost #rsrSchematicSection{margin-top:9px!important}
 #novaNativeHost #rsrSchematicLaunchHost button{width:100%!important;min-height:38px!important}
 #novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{grid-template-columns:minmax(290px,37%) minmax(0,1fr)!important}
 #novaNativeHost #amomiiTwin .am-hardware,#novaNativeHost #rsrLab .rsr-lab__controls{scrollbar-width:thin!important}
 @media(max-width:780px){#novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{grid-template-columns:minmax(0,1fr)!important;overflow:auto!important;align-content:start!important}#novaNativeHost #amomiiTwin .am-simulator,#novaNativeHost #rsrLab .rsr-lab__simulator{min-height:400px!important}}
 @media(max-width:650px){#novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{grid-template-columns:minmax(0,1fr)!important;overflow:auto!important;align-content:start!important}#novaNativeHost #amomiiTwin .am-simulator,#novaNativeHost #rsrLab .rsr-lab__simulator{min-height:340px!important}#novaNativeHost .nova-column-grip{display:none!important}}
 `;w.document.head.appendChild(style);
 const rec={win:w,key,items:[],closing:false};records.set(key,rec);
 const saveGeometry=()=>{try{localStorage.setItem('novaNativeGeometry_'+key,JSON.stringify({width:w.outerWidth,height:w.outerHeight,left:w.screenX,top:w.screenY}));}catch(_){}};
 w.addEventListener('pagehide',saveGeometry);w.addEventListener('beforeunload',saveGeometry);
 // Copy active mode and CSS variables into already-open Chrome windows.
 const syncTheme=()=>{if(w.closed)return;w.document.body.dataset.novaTheme=document.body.dataset.novaTheme||'nova';w.document.body.className='novaNativePopup '+[...document.body.classList].filter(c=>c.startsWith('novaElectric')).join(' ');w.document.body.style.cssText=document.body.style.cssText;w.document.body.style.margin='0';w.document.body.style.backgroundColor='#070d16';w.document.documentElement.style.cssText=document.documentElement.style.cssText;
  // Mirror computed accent so popup stylesheets can always resolve the active mode.
  const sourceStyle=getComputedStyle(document.body);
  for(const prop of ['--nova-electric','--nova-electric-rgb']){
   const val=sourceStyle.getPropertyValue(prop).trim();
   if(val)w.document.body.style.setProperty(prop,val);
  }
 };
 syncTheme();const themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','style','data-nova-theme']});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});
 w.addEventListener('pagehide',()=>themeObserver.disconnect(),{once:true});
 const cleanup=()=>{if(rec.closing)return;rec.closing=true;for(const item of rec.items.slice().reverse()){try{const anchor=item.next&&item.next.parentNode===item.parent?item.next:null;item.parent.insertBefore(item.node,anchor);item.node.hidden=true;}catch(err){console.warn('NOVA popup restore',err);}}rec.items=[];records.delete(key);if(key==='rsr'){try{window.novaRSRLab?.close?.();}catch(_){}}};
 w.addEventListener('pagehide',cleanup);w.addEventListener('beforeunload',cleanup);
 const check=setInterval(()=>{if(w.closed){clearInterval(check);cleanup();}},1000);
 w.focus();return rec;
}
function standardizeHardware(rec){
 if(rec.key!=='rsr'&&rec.key!=='amomii')return;
 const doc=rec.win.document;
 const root=doc.getElementById(rec.key==='rsr'?'rsrLab':'amomiiTwin');if(!root)return;
 const header=root.querySelector(rec.key==='rsr'?'.rsr-lab__header':'.am-header');if(!header)return;
 const oldControls=root.querySelectorAll('#rsrLabShowAll,#rsrLabHideAll,#amShowPanels,#amHidePanels');oldControls.forEach(b=>b.style.display='none');
 let toggle=header.querySelector('.novaUniversalPanelsToggle');
 const sections=()=>[...root.querySelectorAll('details.rsr-lab__section,details.am-section')];
 const storageKey='novaNativePanels_'+rec.key;
 if(!toggle){
  toggle=doc.createElement('button');toggle.type='button';toggle.className='novaUniversalPanelsToggle';header.appendChild(toggle);
  let stored=null;try{stored=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(_){}
  if(Array.isArray(stored))sections().forEach((section,i)=>{if(i<stored.length)section.open=!!stored[i];});
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(sections().map(s=>s.open)));}catch(_){}};
  const update=()=>{toggle.textContent=sections().length&&sections().every(s=>s.open)?'HIDE ALL PANELS':'SHOW ALL PANELS';};
  toggle.addEventListener('click',()=>{const open=!sections().every(s=>s.open);sections().forEach(s=>s.open=open);save();update();});
  sections().forEach(s=>s.addEventListener('toggle',()=>{save();update();}));update();
 }
 if(rec.key==='rsr'){
  positionRSRSchematics(rec);
  if(!rec.schematicObserver){rec.schematicObserver=new MutationObserver(()=>positionRSRSchematics(rec));rec.schematicObserver.observe(root,{childList:true,subtree:true});rec.win.addEventListener('pagehide',()=>rec.schematicObserver.disconnect(),{once:true});}
 }
}
function positionRSRSchematics(rec){
 if(rec.key!=='rsr')return;
 const doc=rec.win.document,lab=doc.getElementById('rsrLab');if(!lab)return;
 const controls=lab.querySelector('.rsr-lab__controls');if(!controls)return;
 let section=controls.querySelector('#rsrSchematicSection');
 if(!section){section=doc.createElement('details');section.id='rsrSchematicSection';section.className='rsr-lab__section';section.innerHTML='<summary>SCHEMATICS</summary><div class="rsr-lab__section-body"><div id="rsrSchematicLaunchHost"></div></div>';controls.appendChild(section);}
 const launch=lab.querySelector('#novaRSRSchematicButton,.nova-rsr-schem-launch')||[...lab.querySelectorAll('.rsr-lab__header button')].find(b=>/SCHEMATICS/i.test(b.textContent));
 if(launch&&launch.parentElement?.id!=='rsrSchematicLaunchHost'){
  launch.textContent='📐 OPEN SCHEMATICS';section.querySelector('#rsrSchematicLaunchHost').appendChild(launch);
 }
}

// Inline onclick attributes execute in the adopted node's NEW window realm.
// Bridge only the RSR command functions back to the dashboard realm, where
// the cloud relay, command state, and existing hardware controllers live.
function bridgeRSRCommands(rec,node){
 if(rec.key!=='rsr'||!node)return;
 const popup=rec.win;
 const names=new Set();
 for(const el of [node,...node.querySelectorAll('[onclick]')]){
  const code=el.getAttribute('onclick')||'';
  const matches=code.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g);
  for(const match of matches)names.add(match[1]);
 }
 // Include commands in controls mounted after initial adoption.
 const known=['toggleTrainerLed','toggleTrainerAll','trainerBlink','trainerSOS',
  'trainerMorse','startTrainerPatternUI','stopTrainerSystem',
  'requestTrainerStatus','runTrainerTest'];
 for(const name of known)names.add(name);
 for(const name of names){
  if(name==='eval'||name==='Function'||name==='setTimeout'||name==='setInterval')continue;
  if(typeof window[name]!=='function')continue;
  // Keep native popup APIs intact; only proxy app-specific functions.
  if(typeof popup[name]==='function' && !known.includes(name))continue;
  popup[name]=function(...args){
   if(window.closed) return;
   const command=window[name];
   if(typeof command!=='function'){
    console.warn('[NOVA] RSR command unavailable:',name);
    return;
   }
   return command.apply(window,args);
  };
 }
 // Rebind the ORIGINAL controller buttons after cross-document adoption.
 // Inline onclick attributes can retain an inert handler realm when DOM nodes
 // are adopted into another Chrome window. Explicit listeners avoid that issue.
 // Keep the attribute text so RSR's existing visual-preview listener can read it.
 const commands={
  toggleTrainerLed:button=>{const n=Number((button.getAttribute('onclick')||'').match(/toggleTrainerLed\(\s*([0-7])/)?.[1]);return window.toggleTrainerLed(n);},
  toggleTrainerAll:()=>window.toggleTrainerAll(),
  trainerBlink:()=>window.trainerBlink(),
  trainerSOS:()=>window.trainerSOS(),
  trainerMorse:()=>window.trainerMorse(),
  startTrainerPatternUI:button=>{
   const code=button.getAttribute('onclick')||'';
   const args=code.match(/startTrainerPatternUI\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
   if(!args)return;
   return window.startTrainerPatternUI(args[1],args[2],button);
  },
  stopTrainerSystem:()=>window.stopTrainerSystem(),
  requestTrainerStatus:()=>window.requestTrainerStatus(),
  runTrainerTest:()=>window.runTrainerTest()
 };
 node.querySelectorAll('.rsrTrainerController button[onclick]').forEach(button=>{
  if(button.dataset.novaNativeCommandBound==='yes')return;
  const source=button.getAttribute('onclick')||'';
  const name=source.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/)?.[1];
  if(!name||!Object.prototype.hasOwnProperty.call(commands,name))return;
  // Setting the handler property to null disables the old inline callback;
  // its attribute stays intact for RSR's visualization/preview code.
  button.onclick=null;
  button.addEventListener('click',event=>{
   if(event.defaultPrevented)return;
   try{Promise.resolve(commands[name](button)).catch(err=>console.error('[NOVA] RSR command failed:',name,err));}
   catch(err){console.error('[NOVA] RSR command failed:',name,err);}
  });
  button.dataset.novaNativeCommandBound='yes';
 });
 // Useful for diagnostic console tests, not required by the buttons.
 popup.novaRSRCommandBridgeReady=true;
}

function move(rec,node){if(!rec||!node)return false;if(node.ownerDocument===rec.win.document){rec.win.focus();return true;}rec.items.push({node,parent:node.parentNode,next:node.nextSibling});rec.win.document.getElementById('novaNativeHost').appendChild(node);node.hidden=false;bridgeRSRCommands(rec,node);standardizeHardware(rec);rec.win.focus();return true;}
function openPanel(key,title,selector){const rec=makeWindow(key,title);if(!rec)return false;const node=originalQuery(selector)||document.querySelector(selector);if(!node)return false;return move(rec,node);}
window.novaNativeWindow={openPanel,makeWindow,move,records};
// Hardware: open the Chrome window directly from the click, before async fetch.
function onHardwareClick(event){const b=event.target.closest('button');if(!b)return;const label=(b.textContent||'').trim().toUpperCase();if(label!=='AMOMII'&&label!=='RSR TRAINER')return;if(!b.classList.contains('novaGroupButton'))return;
 const am=label==='AMOMII';const key=am?'amomii':'rsr';const rec=makeWindow(key,am?'NOVA — AMOMII ONE':'NOVA — RSR TRAINER');if(!rec)return;
 document.body.dataset.novaTheme='hardware';
 event.preventDefault();event.stopImmediatePropagation();
 const fn=am?window.novaOpenAMOMII:window.novaOpenRSR;
 Promise.resolve().then(()=>typeof fn==='function'?fn():null).then(()=>{
  const el=document.getElementById(am?'amomiiTwin':'rsrLab');if(!el)throw Error('Hardware panel not initialized');
  move(rec,el);
  if(!am){try{window.novaRSRLab?.refresh?.();}catch(_){}}
  else{try{window.novaAMOMIIPinmap?.render?.();window.novaAMOMIISyncHardware?.();}catch(_){}}
 }).catch(err=>{console.error('[NOVA] Native hardware popup:',err);try{rec.win.close();}catch(_){}});
}
// Media and secondary dashboard panels retain their original live DOM/event handlers.
function onPanelClick(event){const b=event.target.closest('button.novaGroupButton');if(!b)return;const label=(b.textContent||'').trim().toUpperCase();
 const specs={'NOVA BROWSER':['browser','NOVA — BROWSER'],'PORTABLE TRAINER':['portable','NOVA — PORTABLE TRAINER'],'MEDIA':['library','NOVA — MEDIA CENTER']};const spec=specs[label];if(!spec)return;
 const [key,title]=spec;const selector='.novaFloatPanel[data-nova-panel="'+key+'"]';
 const node=originalQuery(selector)||document.querySelector(selector);if(!node)return;
 document.body.dataset.novaTheme=key==='library'?'media':'nova';
 event.preventDefault();event.stopImmediatePropagation();const rec=makeWindow(key,title);if(rec){move(rec,node);b.setAttribute('aria-pressed','true');}
}
document.addEventListener('click',onHardwareClick,true);
document.addEventListener('click',onPanelClick,true);
})();
