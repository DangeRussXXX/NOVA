/* NOVA Mail & Calendar voice commands: read-only actions and draft preparation.
   Never sends or deletes messages automatically. */
(function(){
"use strict";
const doc=()=>typeof novaCalendarDocument==="function"?novaCalendarDocument():document;
const el=id=>doc().getElementById(id);
function say(text){
 const message=String(text||"");
 const status=el("novaVoiceMailStatus");if(status)status.textContent=message;
 try{if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.rate=1;speechSynthesis.speak(u);}}catch(e){}
}
function perform(raw){
 const command=String(raw||"").trim();
 if(!command){say("Enter a command first.");return;}
 const clean=command.replace(/^(hey\s+)?nova[,\s:]*/i,"").trim();
 const text=clean.toLowerCase();
 const open=(tab)=>{if(typeof window.novaMailShow==="function"){window.novaMailShow(tab);say("Opening "+tab+".");}else say("Mail panel is not ready.");};
 if(/\b(inbox|incoming (mail|email)|new (mail|email)s?)\b/.test(text)){open("inbox");return;}
 if(/\b(sent (mail|email|messages)|sent folder)\b/.test(text)){open("sent");return;}
 if(/\b(drafts?|saved messages?)\b/.test(text)&&!/\b(create|write|compose|draft (an? )?email)\b/.test(text)){open("drafts");return;}
 if(/\b(calendar|schedule|appointments?)\b/.test(text)){open("calendar");return;}
 if(/\b(refresh|sync|check)\b/.test(text)&&/\b(mail|email|inbox)\b/.test(text)){
  if(typeof window.novaMailRefresh==="function"){window.novaMailShow("inbox");say("Checking your inbox.");}return;
 }
 if(/\b(compose|write|draft|create)\b/.test(text)&&/\b(email|mail|message)\b/.test(text)){
  open("compose");
  const address=clean.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  if(address&&el("novaMailTo"))el("novaMailTo").value=address[0];
  const subject=clean.match(/\bsubject\s+(.+?)(?:\s+message\s+|$)/i);
  if(subject&&el("novaMailSubject"))el("novaMailSubject").value=subject[1].trim();
  say("Draft opened. Review the recipient and message before sending.");
  return;
 }
 if(/\b(read|summarize|tell me about)\b/.test(text)&&/\b(mail|email|inbox)\b/.test(text)){
  open("inbox");say("Inbox opened. Select a message to read it. NOVA will not send anything automatically.");return;
 }
 if(/\b(today'?s? events|events today|today'?s? schedule)\b/.test(text)){
  open("calendar");
  if(typeof window.speakTodaysEvents==="function")window.speakTodaysEvents();
  else say("Calendar opened. Select today to see your events.");
  return;
 }
 if(/\b(send|delete|remove|archive)\b/.test(text)){
  say("For safety, please use the confirmation buttons in NOVA Mail to "+(text.match(/\b(send|delete|remove|archive)\b/)||["complete that action"])[0]+".");
  return;
 }
 say("Try: show inbox, show calendar, show drafts, check email, or compose email to an address.");
}
function execute(){perform(el("novaVoiceMailInput")?.value||"");}
function listen(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){say("Speech recognition is not available in this browser. Use the text command box.");return;}
 const button=el("novaVoiceMailButton");
 try{
  const recognition=new Recognition();recognition.lang="en-US";recognition.interimResults=false;recognition.maxAlternatives=1;
  if(button)button.disabled=true;
  const status=el("novaVoiceMailStatus");if(status)status.textContent="Listening...";
  recognition.onresult=e=>{const transcript=e.results[0][0].transcript;if(el("novaVoiceMailInput"))el("novaVoiceMailInput").value=transcript;perform(transcript);};
  recognition.onerror=e=>{const s=el("novaVoiceMailStatus");if(s)s.textContent="Microphone: "+e.error;};
  recognition.onend=()=>{if(button)button.disabled=false;};
  recognition.start();
 }catch(e){if(button)button.disabled=false;say("Unable to start microphone: "+e.message);}
}
window.novaVoiceMailListen=listen;
window.novaVoiceMailExecute=execute;
document.addEventListener("keydown",e=>{
 if(e.key==="Enter"&&e.target?.id==="novaVoiceMailInput"){e.preventDefault();execute();}
});
})();
