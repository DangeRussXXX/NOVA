/* ============================================================
   NOVA HARDWARE CORE
   Shared connection, command, response, console and transport code.
   ============================================================ */

function toggleSystemPanel(header){
  if(!header) return;
  const body = header.nextElementSibling;
  if(!body || !body.classList.contains("systemCollapseBody")) return;
  const isCollapsed = body.classList.toggle("collapsed");
  header.classList.toggle("expanded", !isCollapsed);
}

async function disconnectSerial(){

  keepReading = false;

  try{

    if(reader){

      try{
        await reader.cancel();
      }catch(e){}

      reader.releaseLock();
      reader = null;
    }

    if(writer){

      writer.releaseLock();
      writer = null;
    }

    if(port){

      await port.close();
      port = null;
    }

  }catch(error){

    log(
      `Disconnect error: ${error.message}`,
      "error"
    );

  }

  updateConnectionUI(false);

  log(
    "Disconnected.",
    "warning"
  );

}


function updateConnectionUI(connected){

  amomiiConnected = !!connected;

  const connectionButton =
    document.getElementById("connectionButton");

  if(connectionButton){
    connectionButton.textContent = connected ? "DISCONNECT" : "CONNECT";
    connectionButton.classList.toggle("danger", connected);
    connectionButton.classList.toggle("primary", !connected);
  }

  const dot =
    document.getElementById("connectionDot");

  const text =
    document.getElementById("connectionText");

  const status =
    document.getElementById("statusConnection");

  if(connected){

    dot.className = "dot green";
    text.textContent = "CONNECTED";
    status.textContent = "ONLINE";

  }else{

    dot.className = "dot red";
    text.textContent = "DISCONNECTED";
    status.textContent = "OFFLINE";

  }

}

function toggleConsole(){

  const header =
    document.querySelector(".consoleHeader");

  const body =
    header.parentElement.querySelector(".consoleBody");

  if(!body) return;

  body.classList.toggle("collapsed");

}



  // ============================================================
  // NOVA COMMAND CONSOLE EXPAND / COLLAPSE
  // ============================================================

  function toggleConsole(){

    const header =
      document.querySelector(".consoleHeader");

    const body =
      header.parentElement.querySelector(".consoleBody");

    if(!body) return;

    body.classList.toggle("collapsed");

  }


  // ============================================================
  // MORSE CONVERTER
  // ============================================================

  const morseCode = {

    "A": ".-",
    "B": "-...",
    "C": "-.-.",
    "D": "-..",
    "E": ".",
    "F": "..-.",
    "G": "--.",
    "H": "....",
    "I": "..",
    "J": ".---",
    "K": "-.-",
    "L": ".-..",
    "M": "--",
    "N": "-.",
    "O": "---",
    "P": ".--.",
    "Q": "--.-",
    "R": ".-.",
    "S": "...",
    "T": "-",
    "U": "..-",
    "V": "...-",
    "W": ".--",
    "X": "-..-",
    "Y": "-.--",
    "Z": "--..",

    "0": "-----",
    "1": ".----",
    "2": "..---",
    "3": "...--",
    "4": "....-",
    "5": ".....",
    "6": "-....",
    "7": "--...",
    "8": "---..",
    "9": "----.",

    ".": ".-.-.-",
    ",": "--..--",
    "?": "..--..",
    "!": "-.-.--",
    "/": "-..-.",
    "(": "-.--.",
    ")": "-.--.-",
    "&": ".-...",
    ":": "---...",
    ";": "-.-.-.",
    "=": "-...-",
    "+": ".-.-.",
    "-": "-....-",
    "_": "..--.-",
    "\"": ".-..-.",
    "$": "...-..-",
    "@": ".--.-."
  };

  function morseToText(value){
    const reverseMorse = {};
    Object.keys(morseCode).forEach(letter => { reverseMorse[morseCode[letter]] = letter; });
    return String(value).trim().split(" / ").map(word => word.trim().split(/\s+/).map(code => reverseMorse[code] || "?").join("")).join(" ");
  }

  function textToMorse(value){
    return String(value).toUpperCase().split("").map(char => char === " " ? "/" : (morseCode[char] || char)).join(" ");
  }

  function showNovaResponse(text){
  novaPersistentTickerPush(text);

    const value=String(text || "").trim();

    if(lastHeardEl){
      lastHeardEl.textContent=value;
    }

    novaQueueResponse(value);
  }


  function showMorseResponse(value){
    value = String(value || "").trim();
    if(!value) return;
    if(/^[.\-\/\s]+$/.test(value)){
      showNovaResponse(`${morseToText(value)}\n${value}`);
    }else{
      const plainText = value.toUpperCase();
      showNovaResponse(`${plainText}\n${textToMorse(plainText)}`);
    }
  }



/* ============================================================
   SERIAL READ
   ============================================================ */

async function readSerial(){

  if(!port || !port.readable){
    return;
  }

  reader =
    port.readable.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  try{

    while(keepReading){

      const {
        value,
        done
      } = await reader.read();

      if(done){
        break;
      }

      if(value){

        buffer +=
          decoder.decode(
            value,
            {stream:true}
          );

        const lines =
          buffer.split(/\r?\n/);

        buffer =
          lines.pop();

        for(const line of lines){

          if(line.trim()){
            processSerialLine(line.trim());
          }

        }

      }

    }

  }catch(error){

    if(keepReading){

      log(
        `Serial read error: ${error.message}`,
        "error"
      );

    }

  }finally{

    try{
      reader.releaseLock();
    }catch(e){}

    reader = null;
  }

}


/* ============================================================
   CLOUD RESPONSE READ
   ============================================================ */

async function pollCloudResponses(){

  try{

    const response =
      await fetch(
        "https://amomii-server.onrender.com/response"
      );

    const text =
      (await response.text()).trim();

    if(text){

  console.log("CLOUD RESPONSE:", text);

  processSerialLine(text);

}

  }catch(error){

    console.error(
      "Cloud response error:",
      error
    );

  }

}

setInterval(
  pollCloudResponses,
  250
);

/* ============================================================
   CLOUD COMMAND SEND
   ============================================================ */

function sendCloudCommand(command) {

  command = String(command).trim();
  if (!command) return;

  commandCount++;
  document.getElementById("statusCommands").textContent = commandCount;

  addHistory(command);

  log(`> ${command}`, "command");

  fetch("https://amomii-server.onrender.com/command", {
    method: "POST",
    body: command
  })
  .then(() => {
    log(`Sent to AMOMII Cloud Relay: ${command}`, "success");
  })
  .catch(error => {
    log(`Cloud send error: ${error.message}`, "error");
  });
}


/* ============================================================
   MANUAL COMMAND SEND
   ============================================================ */

function sendManualCommand() {

  const input = document.getElementById("commandInput");

  if (!input) return;

  const command = input.value.trim();

  if (!command) return;

  const morseMatch = command.match(/^morse(?:\s+)(.+)$/i);
  if(morseMatch){ showMorseResponse(morseMatch[1]); }

  sendCloudCommand(command);

  input.value = "";
}


document.getElementById("commandInput").addEventListener("keydown", function(event) {

  if (event.key === "Enter") {
    event.preventDefault();
    sendManualCommand();
  }

});


/* ============================================================
   SERIAL LINE PARSER
   ============================================================ */

function processSerialLine(line){

  showNovaResponse(line);
  log(line);

  parseSystemTestLine(line);
  parseBoardStatus(line);
  parseLedState(line);
  parseTrainerLedState(line);
  parseRSRSwitchState(line);
  parseTrainerSystemLine(line);

  if(
    /^flash complete\.?$/i.test(line)
  ){

    log(
      "System test LED flash complete.",
      "success"
    );

  }


}
