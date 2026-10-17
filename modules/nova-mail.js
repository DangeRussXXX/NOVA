/* NOVA MAIL • Phase 1: inbox, sent, drafts, compose; same Outlook accounts as calendar. */
(function(){
"use strict";
let view="calendar", selected=null, messages=[], selectedFolder="", activeDraftId=null, replyTarget=null;
const doc=()=>typeof novaCalendarDocument==="function"?novaCalendarDocument():document;
const el=id=>doc().getElementById(id);
function status(message){const node=el("novaMailStatus");if(node)node.textContent=message;}
function accountKind(){return el("novaMailAccount")?.value||"personal";}
function currentAccount(){return window.novaOutlookAccounts?.[accountKind()] || (typeof novaOutlookAccounts!=="undefined"?novaOutlookAccounts[accountKind()]:null);}
async function token(){
 const account=currentAccount();
 if(!account)throw new Error("Connect this Outlook account using the Calendar buttons first.");
 const client=await novaMsalGet();
 const req={account,scopes:["Mail.ReadWrite","Mail.Send"]};
 try{return (await client.acquireTokenSilent(req)).accessToken;}
 catch(e){return (await client.acquireTokenPopup(req)).accessToken;}
}
async function graph(path,method="GET",body=null){
 const access=await token();
 const response=await fetch("https://graph.microsoft.com/v1.0"+path,{
  method,headers:{Authorization:"Bearer "+access,...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 if(!response.ok){
  let details="";try{const j=await response.json();details=j.error?.message||"";}catch(e){}
  throw new Error("Microsoft Graph "+response.status+(details?": "+details:""));
 }
 if(response.status===202 || response.status===204 || response.status===205)return null;
 const raw=await response.text();
 return raw.trim()?JSON.parse(raw):null;
}
function report(error){console.error("NOVA Mail",error);status(error.message||String(error));}
function show(next){
 view=next;
 const calendar=el("novaCalendarContent"), mail=el("novaMailContent");
 if(calendar)calendar.hidden=next!=="calendar";
 if(mail)mail.hidden=next==="calendar";
 ["calendar","inbox","compose","sent","drafts"].forEach(t=>{
  const b=el("novaMailTab"+t[0].toUpperCase()+t.slice(1));
  if(b)b.classList.toggle("primary",t===next);
 });
 if(el("novaMailReader"))el("novaMailReader").hidden=true;
 if(el("novaMailComposer"))el("novaMailComposer").hidden=next!=="compose";
 if(next==="compose" && view!=="drafts") updateDraftButton();
 if(el("novaMailList"))el("novaMailList").hidden=next==="compose";
 if(["inbox","sent","drafts"].includes(next))refresh();
}
async function refresh(){
 if(!["inbox","sent","drafts"].includes(view))return;
 status("Loading "+view+"...");
 try{
  const folder={inbox:"inbox",sent:"sentitems",drafts:"drafts"}[view];
  const json=await graph("/me/mailFolders/"+folder+"/messages?"+new URLSearchParams({
   "$top":"40","$orderby":"receivedDateTime desc",
   "$select":"id,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,isRead"
  }));
  messages=json.value||[];
  selectedFolder=view;
  selected=null;
  if(el("novaMailReader"))el("novaMailReader").hidden=true;
  const list=el("novaMailList");if(!list)return;
  list.replaceChildren();
  if(!messages.length){const p=doc().createElement("p");p.textContent="No messages in "+view+".";list.appendChild(p);}
  messages.forEach((m,i)=>{
   const button=doc().createElement("button");button.type="button";button.className="novaMailItem";
   const from=doc().createElement("small");from.textContent=(view==="drafts"?"DRAFT → "+(m.toRecipients?.map(x=>x.emailAddress?.address).join(", ")||"No recipient"):(m.from?.emailAddress?.name||m.from?.emailAddress?.address||"Outlook"))+" • "+new Date(m.receivedDateTime||m.sentDateTime||Date.now()).toLocaleString();
   const subject=doc().createElement("strong");subject.textContent=m.subject||"(No subject)";
   const preview=doc().createElement("span");preview.textContent=m.bodyPreview||"";
   button.append(from,subject,preview);button.onclick=()=>openMessage(i);
   list.appendChild(button);
  });
  status(messages.length+" messages • "+accountKind().toUpperCase());
 }catch(e){report(e);}
}
async function openMessage(index){
 const message=messages[index];if(!message)return;
 selected=message;
 status("Loading message...");
 try{
  const full=await graph("/me/messages/"+encodeURIComponent(message.id)+"?$select=id,subject,from,body,receivedDateTime");
  if(selectedFolder==="drafts"){
   activeDraftId=full.id;replyTarget=null;
   el("novaMailTo").value=(message.toRecipients||[]).map(x=>x.emailAddress?.address).join(", ");
   el("novaMailSubject").value=full.subject||"";
   el("novaMailBody").value=full.body?.contentType?.toLowerCase()==="html"?htmlToText(full.body.content):full.body?.content||"";
   show("compose");updateDraftButton();status("Editing saved draft.");return;
  }
  el("novaMailReaderSubject").textContent=full.subject||"(No subject)";
  el("novaMailReaderMeta").textContent=(full.from?.emailAddress?.address||"")+" • "+new Date(full.receivedDateTime||Date.now()).toLocaleString();
  // Plain text rendering prevents HTML email from executing in NOVA.
  const body=full.body?.content||"";
  if(full.body?.contentType?.toLowerCase()==="html"){
   el("novaMailReaderBody").textContent=htmlToText(body);
  }else el("novaMailReaderBody").textContent=body;
  el("novaMailReader").hidden=false;
  status("Message opened.");
 }catch(e){report(e);}
}
function htmlToText(html){
 const parser=new DOMParser().parseFromString(html||"","text/html");
 parser.querySelectorAll("script,style,iframe,object,embed").forEach(n=>n.remove());
 return parser.body.textContent||"";
}
function updateDraftButton(){const button=el("novaMailDiscardDraft");if(button)button.hidden=!activeDraftId;}
function clearCompose(){activeDraftId=null;replyTarget=null;
 el("novaMailTo").value="";el("novaMailSubject").value="";el("novaMailBody").value="";updateDraftButton();}
function reply(){
 if(!selected)return;
 el("novaMailTo").value=selected.from?.emailAddress?.address||"";
 el("novaMailSubject").value=/^re:/i.test(selected.subject||"")?selected.subject:"Re: "+(selected.subject||"");
 el("novaMailBody").value="";
 activeDraftId=null;replyTarget={id:selected.id,kind:"reply"};updateDraftButton();
 show("compose");
}
function forward(){
 if(!selected)return;
 el("novaMailTo").value="";
 el("novaMailSubject").value=/^fwd?:/i.test(selected.subject||"")?selected.subject:"Fwd: "+(selected.subject||"");
 el("novaMailBody").value="";
 activeDraftId=null;replyTarget={id:selected.id,kind:"forward"};updateDraftButton();
 show("compose");
}
function draftData(){
 const to=el("novaMailTo").value.trim(),subject=el("novaMailSubject").value.trim(),body=el("novaMailBody").value;
 if(!to||!el("novaMailTo").checkValidity())throw new Error("Enter one valid recipient email address.");
 return {subject,body:{contentType:"Text",content:body},toRecipients:[{emailAddress:{address:to}}]};
}
async function saveDraft(){
 try{
  const payload=draftData();status("Saving draft...");
  if(activeDraftId){await graph("/me/messages/"+encodeURIComponent(activeDraftId),"PATCH",payload);}
  else{const draft=await graph("/me/messages","POST",payload);activeDraftId=draft.id;}
  updateDraftButton();status("Draft saved in "+accountKind().toUpperCase()+" Outlook.");
 }catch(e){report(e);}
}
async function send(){
 try{
  const payload=draftData();const name=accountKind().toUpperCase();
  if(!doc().defaultView.confirm("Send email from "+name+" Outlook to "+payload.toRecipients[0].emailAddress.address+"?\n\nSubject: "+(payload.subject||"(No subject)")))return;
  status("Sending email...");
  if(activeDraftId){
   await graph("/me/messages/"+encodeURIComponent(activeDraftId),"PATCH",payload);
   await graph("/me/messages/"+encodeURIComponent(activeDraftId)+"/send","POST");
  }else if(replyTarget){
   // Graph reply/forward endpoints retain the original message's conversation context.
   const path="/me/messages/"+encodeURIComponent(replyTarget.id)+"/"+(replyTarget.kind==="reply"?"reply":"forward");
   const body=replyTarget.kind==="reply"?{comment:payload.body.content}:{comment:payload.body.content,toRecipients:payload.toRecipients};
   await graph(path,"POST",body);
  }else await graph("/me/sendMail","POST",{message:payload,saveToSentItems:true});
  clearCompose();status("Email accepted by Microsoft for sending.");
 }catch(e){report(e);}
}
async function moveMessage(destination){
 if(!selected)return;
 const name=selected.subject||"(No subject)";
 if(!doc().defaultView.confirm((destination==="deleteditems"?"Delete":"Archive")+" this email?\n\n"+name))return;
 try{
  status(destination==="deleteditems"?"Deleting email...":"Archiving email...");
  await graph("/me/messages/"+encodeURIComponent(selected.id)+"/move","POST",{destinationId:destination});
  selected=null;if(el("novaMailReader"))el("novaMailReader").hidden=true;
  await refresh();status(destination==="deleteditems"?"Moved to Deleted Items.":"Moved to Archive.");
 }catch(e){report(e);}
}
async function discardDraft(){
 if(!activeDraftId)return;
 if(!doc().defaultView.confirm("Discard this saved Outlook draft?"))return;
 try{status("Discarding draft...");await graph("/me/messages/"+encodeURIComponent(activeDraftId),"DELETE");clearCompose();status("Draft discarded.");}
 catch(e){report(e);}
}
window.novaMailShow=show;window.novaMailRefresh=refresh;window.novaMailReply=reply;
window.novaMailSaveDraft=saveDraft;window.novaMailSend=send;
window.novaMailForward=forward;window.novaMailArchive=()=>moveMessage("archive");
window.novaMailDelete=()=>moveMessage("deleteditems");window.novaMailDiscardDraft=discardDraft;
})();
