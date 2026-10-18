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
 const w=window.open('','nova_native_'+key,'width=1080,height=780,resizable=yes,scrollbars=yes');
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
 @media(max-width:650px){#novaNativeHost #amomiiTwin .am-workspace,#novaNativeHost #rsrLab .rsr-lab__columns{grid-template-columns:minmax(0,1fr)!important;overflow:auto!important;align-content:start!important}#novaNativeHost #amomiiTwin .am-simulator,#novaNativeHost #rsrLab .rsr-lab__simulator{min-height:340px!important}#novaNativeHost .nova-column-grip{display:none!important}}
 `;w.document.head.appendChild(style);
 const rec={win:w,key,items:[],closing:false};records.set(key,rec);
 const cleanup=()=>{if(rec.closing)return;rec.closing=true;for(const item of rec.items.slice().reverse()){try{const anchor=item.next&&item.next.parentNode===item.parent?item.next:null;item.parent.insertBefore(item.node,anchor);item.node.hidden=true;}catch(err){console.warn('NOVA popup restore',err);}}rec.items=[];records.delete(key);if(key==='rsr'){try{window.novaRSRLab?.close?.();}catch(_){}}};
 w.addEventListener('pagehide',cleanup);w.addEventListener('beforeunload',cleanup);
 const check=setInterval(()=>{if(w.closed){clearInterval(check);cleanup();}},1000);
 w.focus();return rec;
}
function positionRSRSchematics(rec){
 if(rec.key!=='rsr')return;
 const doc=rec.win.document;
 const place=()=>{
  const lab=doc.getElementById('rsrLab');
  const toolbar=lab?.querySelector('.rsr-lab__accordion-toolbar');
  const header=lab?.querySelector('.rsr-lab__header');
  if(!toolbar||!header)return;
  const controls=[...header.querySelectorAll('button,a')].filter(el=>/SCHEMATICS/i.test(el.textContent||el.getAttribute('title')||''));
  for(const control of controls){
   const wrapper=control.closest('.rsr-schematic-header-action,.rsr-schematics-header,.rsr-schematic-button')||control;
   wrapper.classList.add('nova-native-schematics');
   toolbar.appendChild(wrapper);
  }
 };
 place();
 // Other schematic modules can add their header button after RSR finishes opening.
 const lab=doc.getElementById('rsrLab');
 if(lab){const observer=new MutationObserver(()=>place());observer.observe(lab,{childList:true,subtree:true});rec.win.addEventListener('pagehide',()=>observer.disconnect(),{once:true});}
}
function move(rec,node){if(!rec||!node)return false;if(node.ownerDocument===rec.win.document){rec.win.focus();return true;}rec.items.push({node,parent:node.parentNode,next:node.nextSibling});rec.win.document.getElementById('novaNativeHost').appendChild(node);node.hidden=false;positionRSRSchematics(rec);rec.win.focus();return true;}
function openPanel(key,title,selector){const rec=makeWindow(key,title);if(!rec)return false;const node=originalQuery(selector)||document.querySelector(selector);if(!node)return false;return move(rec,node);}
window.novaNativeWindow={openPanel,makeWindow,move,records};
// Hardware: open the Chrome window directly from the click, before async fetch.
function onHardwareClick(event){const b=event.target.closest('button');if(!b)return;const label=(b.textContent||'').trim().toUpperCase();if(label!=='AMOMII'&&label!=='RSR TRAINER')return;if(!b.classList.contains('novaGroupButton'))return;
 const am=label==='AMOMII';const key=am?'amomii':'rsr';const rec=makeWindow(key,am?'NOVA — AMOMII ONE':'NOVA — RSR TRAINER');if(!rec)return;
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
 event.preventDefault();event.stopImmediatePropagation();const rec=makeWindow(key,title);if(rec){move(rec,node);b.setAttribute('aria-pressed','true');}
}
document.addEventListener('click',onHardwareClick,true);
document.addEventListener('click',onPanelClick,true);
})();
