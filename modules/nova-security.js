/* NOVA Google owner access: never store relay secrets or Google client secrets in this file. */
(function(){
  'use strict';
  const API='https://amomii-server.onrender.com';
  const CLIENT_ID='1077780634697-chorl2489hp955pq3ubf48l3o0hiostr.apps.googleusercontent.com';
  let idToken=''; let owner=false; let expiresAt=0;
  function isOwner(){return owner && !!idToken && Date.now()<expiresAt;}
  function expire(){idToken='';owner=false;expiresAt=0; render();}
  function requireOwner(){render(); const el=document.getElementById('novaOwnerAccess'); if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});}
  async function request(path,opts={}){
    if(!isOwner()) throw new Error('Owner sign-in required');
    const headers=new Headers(opts.headers||{});
    headers.set('Authorization','Bearer '+idToken);
    return fetch(API+path,{...opts,headers,cache:'no-store'});
  }
  function render(){
    const state=document.getElementById('novaOwnerState');
    if(state) state.textContent=isOwner()?'OWNER VERIFIED — HARDWARE ENABLED':'VISITOR MODE — HARDWARE LOCKED';
    const out=document.getElementById('novaOwnerSignOut');
    if(out) out.hidden=!isOwner();
  }
  async function credential(response){
    try{
      const token=response.credential;
      const check=await fetch(API+'/auth/me',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!check.ok) throw new Error('Google account not authorized ('+check.status+')');
      const body=await check.json();
      if(!body.owner) throw new Error('Account does not have NOVA owner permission');
      // Browser decode is only for token expiration; server verifies signature and claims.
      const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      idToken=token; expiresAt=payload.exp*1000-30000; owner=true;render();
    }catch(err){expire();alert('NOVA access denied: '+err.message);}
  }
  function init(){
    const host=document.createElement('div'); host.id='novaOwnerAccess';
    host.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:10px 16px;background:#10212d;color:#fff;border:1px solid #3b6b80;border-radius:10px;margin:8px 12px;font:14px system-ui';
    host.innerHTML='<strong>🔐 NOVA ACCESS</strong><span id="novaOwnerState">VISITOR MODE — HARDWARE LOCKED</span><div id="novaGoogleButton"></div><button type="button" id="novaOwnerSignOut" hidden style="padding:7px 12px">Sign out</button>';
    const header=document.querySelector('.app > header')||document.querySelector('header');
    if(header) header.insertAdjacentElement('afterend',host); else document.body.prepend(host);
    document.getElementById('novaOwnerSignOut').onclick=()=>{expire();if(window.google?.accounts?.id) google.accounts.id.disableAutoSelect();};
    const start=()=>{if(window.google?.accounts?.id){
      google.accounts.id.initialize({client_id:CLIENT_ID,callback:credential,auto_select:false});
      google.accounts.id.renderButton(document.getElementById('novaGoogleButton'),{theme:'outline',size:'medium',text:'signin_with'});
    }else setTimeout(start,400);};
    start();render();
  }
  window.NovaSecurity={isOwner,expire,requireOwner,request};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
