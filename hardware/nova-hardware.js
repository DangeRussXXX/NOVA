let amomiiConnected = false;

let boardLedOn = false;



function toggleConnection(){

  if(amomiiConnected){

    disconnectSerial();

  }else{

    connectSerial();

  }

}



function connectSerial() {

  log("Connected to NOVA Cloud Relay.", "success");

  updateConnectionUI(true);

  speak("NOVA Cloud Relay is connected.");

}



function toggleBoardLed(){

  const nextState = !boardLedOn;

  setBoardLedUI(nextState);

  sendCloudCommand(nextState ? "led on" : "led off");

}



function setBoardLedUI(isOn){

  boardLedOn = !!isOn;

  const button = document.getElementById("boardLedButton");

  if(button){

    button.classList.toggle("electricGreen", boardLedOn);

    button.setAttribute("aria-pressed", boardLedOn ? "true" : "false");

  }

}



const trainerLedStates = Array(8).fill(false);



function toggleTrainerLed(ledNumber){

  if(!Number.isInteger(ledNumber) || ledNumber < 0 || ledNumber > 7) return;



  const nextState = !trainerLedStates[ledNumber];

  setTrainerLedUI(ledNumber, nextState);

  sendCloudCommand(`trainer led ${ledNumber} ${nextState ? "on" : "off"}`);

}



function setTrainerLedUI(ledNumber, isOn){

  if(!Number.isInteger(ledNumber) || ledNumber < 0 || ledNumber > 7) return;



  trainerLedStates[ledNumber] = !!isOn;



  const button = document.getElementById(`trainerLedButton${ledNumber}`);

  if(button){

    button.classList.toggle("electricGreen", trainerLedStates[ledNumber]);

    button.setAttribute("aria-pressed", trainerLedStates[ledNumber] ? "true" : "false");

  }



  updateTrainerAllButton();

}





function updateTrainerAllButton(){



  const button =

    document.getElementById(

      "trainerAllButton"

    );



  if(!button){

    return;

  }



  const allOn =

    trainerLedStates.every(

      state => state

    );



  button.textContent =

    allOn

      ? "ALL OFF"

      : "ALL ON";



  button.classList.toggle(

    "electricGreen",

    allOn

  );



  button.setAttribute(

    "aria-pressed",

    allOn

      ? "true"

      : "false"

  );



}





function toggleTrainerAll(){



  const allOn =

    trainerLedStates.every(

      state => state

    );



  const nextState =

    !allOn;



  sendCloudCommand(

    nextState

      ? "trainer all on"

      : "trainer all off"

  );



  trainerLedStates.forEach(

    (_, index) =>

      setTrainerLedUI(

        index,

        nextState

      )

  );



  updateTrainerAllButton();



}





function trainerBlink(){



  sendCloudCommand(

    "trainer blink 5"

  );



  log(

    "RSR Trainer blink 5.",

    "success"

  );



}





function trainerSOS(){



  sendCloudCommand(

    "trainer sos"

  );



  log(

    "RSR Trainer SOS.",

    "success"

  );



}





function trainerMorse(){



  sendCloudCommand(

    "trainer morse sos"

  );



  log(

    "RSR Trainer Morse SOS.",

    "success"

  );



}



function parseTrainerLedState(line){

  const match = String(line).match(/\btrainer\s+led\s+([0-7])\s*(?::|=)?\s*(on|off)\b/i);

  if(!match) return;



  setTrainerLedUI(Number(match[1]), match[2].toLowerCase() === "on");

}



function setRSRSwitchUI(switchNumber, isHigh){

  if(switchNumber !== 0) return;



  const indicator = document.getElementById(`rsrSwitchIndicator${switchNumber}`);

  const state = document.getElementById(`rsrSwitchState${switchNumber}`);



  if(state){

    state.textContent = isHigh ? "HI" : "LO";

  }



  if(indicator){

    indicator.classList.toggle("active", isHigh);

  }

}



function parseRSRSwitchState(line){

  const match = String(line).match(/^\s*RSR\s+SWITCH\s+([0-7])\s*:\s*(HI|LO)\s*$/i);

  if(!match) return;



  const switchNumber = Number(match[1]);

  const isHigh = match[2].toUpperCase() === "HI";



  setRSRSwitchUI(switchNumber, isHigh);

}



function setTrainerPatternButton(name){

  document.querySelectorAll(".trainerPatternButton").forEach(button => {

    button.classList.toggle(

      "rsrPatternActive",

      String(button.dataset.pattern || "").toUpperCase() === String(name || "").toUpperCase()

    );

  });

}



function startTrainerPatternUI(commandName, displayName){

  sendCloudCommand(`trainer pattern ${commandName}`);

  document.getElementById("rsrPatternName").textContent = displayName;

  document.getElementById("rsrPatternState").textContent = "RUNNING";

  document.getElementById("rsrStatus").textContent = "RUNNING";

  setTrainerPatternButton(displayName);

}



function stopTrainerSystem(){

  sendCloudCommand("trainer stop");

  document.getElementById("rsrPatternName").textContent = "NONE";

  document.getElementById("rsrPatternState").textContent = "STOPPED";

  document.getElementById("rsrStatus").textContent = "READY";

  setTrainerPatternButton("");

  trainerLedStates.forEach((_, index) => setTrainerLedUI(index, false));

}



function requestTrainerStatus(){

  document.getElementById("rsrStatus").textContent = "CHECKING";

  sendCloudCommand("trainer status");

}



function runTrainerTest(){

  document.getElementById("rsrTestResult").textContent = "RUNNING";

  document.getElementById("rsrStatus").textContent = "TESTING";

  setTrainerPatternButton("");

  sendCloudCommand("trainer test");

}



function parseTrainerSystemLine(line){

  let match;



  if(/^Trainer:\s*ONLINE\s*$/i.test(line)){

    document.getElementById("rsrStatus").textContent = "ONLINE";

  }



  match = String(line).match(/^TRAINER PATTERN:\s*(.+)$/i);

  if(match){

    const name = match[1].trim().toUpperCase();

    document.getElementById("rsrPatternName").textContent = name;

    setTrainerPatternButton(name === "NONE" ? "" : name);

  }



  match = String(line).match(/^TRAINER PATTERN STATE:\s*(RUNNING|STOPPED)$/i);

  if(match){

    document.getElementById("rsrPatternState").textContent = match[1].toUpperCase();

    document.getElementById("rsrStatus").textContent =

      match[1].toUpperCase() === "RUNNING" ? "RUNNING" : "READY";

  }



  match = String(line).match(/^TRAINER PATTERN SPEED:\s*(.+)$/i);

  if(match){

    document.getElementById("rsrPatternSpeed").textContent = match[1].trim();

  }



  if(/^RSR TRAINER TEST:\s*PASS$/i.test(line)){

    document.getElementById("rsrTestResult").textContent = "PASS";

    document.getElementById("rsrStatus").textContent = "READY";

    trainerLedStates.forEach((_, index) => setTrainerLedUI(index, false));

  }



  if(/^RSR TRAINER TEST:\s*FAIL$/i.test(line)){

    document.getElementById("rsrTestResult").textContent = "FAIL";

    document.getElementById("rsrStatus").textContent = "ERROR";

  }



  if(/^TRAINER STOPPED$/i.test(line)){

    document.getElementById("rsrPatternName").textContent = "NONE";

    document.getElementById("rsrPatternState").textContent = "STOPPED";

    document.getElementById("rsrStatus").textContent = "READY";

    setTrainerPatternButton("");

  }

}



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

    if(/^[.\-/\s]+$/.test(value)){

      showNovaResponse(`${morseToText(value)}\n${value}`);

    }else{

      const plainText = value.toUpperCase();

      showNovaResponse(`${plainText}\n${textToMorse(plainText)}`);

    }

  }





// ============================================================

// AMOMII CONTROLLER EXPAND / COLLAPSE

// ============================================================



function toggleController(){



  const header =

    document.querySelector(".controllerHeader");



  const body =

    header.parentElement.querySelector(".panelBody");



  if(!body) return;



  body.classList.toggle("collapsed");



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

    log(`Sent to NOVA Cloud Relay: ${command}`, "success");

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





/* ============================================================

   BOARD STATUS

   ============================================================ */



function parseBoardStatus(line){



  const led =

    line.match(

      /\bLED\s*:\s*(ON|OFF|TESTING)\b/i

    );



  if(led){



    document.getElementById(

      "statusLed"

    ).textContent =

      led[1].toUpperCase();



    if(led[1].toUpperCase() === "ON") setBoardLedUI(true);

    if(led[1].toUpperCase() === "OFF") setBoardLedUI(false);



  }



  const blinking =

    line.match(

      /\bBlink(?:ing)?\s*:\s*(YES|NO|ON|OFF)\b/i

    );



  if(blinking){



    document.getElementById(

      "statusBlinking"

    ).textContent =

      blinking[1].toUpperCase();



  }



  const speed =

    line.match(

      /\b(?:Blink speed|Speed)\s*:\s*([^\r\n]+)/i

    );



  if(speed){



    document.getElementById(

      "statusBlinkSpeed"

    ).textContent =

      speed[1].trim();



  }



}





function parseLedState(line){



  if(

    /\bLED\s+(ON|ENABLED)\b/i.test(line)

  ){



    document.getElementById(

      "statusLed"

    ).textContent = "ON";

    setBoardLedUI(true);



  }



  if(

    /\bLED\s+(OFF|DISABLED)\b/i.test(line)

  ){



    document.getElementById(

      "statusLed"

    ).textContent = "OFF";

    setBoardLedUI(false);



  }



}





/* ============================================================

   SYSTEM TEST

   ============================================================ */



function resetSystemTest(){



  systemTestState = {

    active:false,

    serial:null,

    led:null,

    timing:null,

    memory:null,

    commands:null,

    system:null

  };



  [

    "Serial",

    "Led",

    "Timing",

    "Memory",

    "Commands",

    "System"

  ].forEach(key => {



    const el =

      document.getElementById(

        `test${key}`

      );



    if(el){



      el.textContent = "—";

      el.className =

        "testValue pending";



    }



  });



  const result =

    document.getElementById(

      "testResult"

    );



  result.textContent =

    "NOT RUN";



  result.className =

    "testResult";



}





function runSystemTest(){



  resetSystemTest();



  systemTestState.active = true;



  [

    "Serial",

    "Led",

    "Timing",

    "Memory",

    "Commands",

    "System"

  ].forEach(key => {



    const el =

      document.getElementById(

        `test${key}`

      );



    if(el){



      el.textContent = "TESTING";

      el.className =

        "testValue testing";



    }



  });



  document.getElementById(

    "testResult"

  ).textContent =

    "RUNNING";



  document.getElementById(

    "statusSystem"

  ).textContent =

    "TESTING";



  log(

    "Starting system test...",

    "system"

  );



  sendCloudCommand("test");



  speak(

    "Starting system test."

  );



}





function parseSystemTestLine(line){



  if(!systemTestState.active){

    return;

  }



  const testMatch =

    line.match(

      /^\s*(Serial|LED|Timing|Memory|Commands|System):\s*(OK|FAIL|TESTING)\s*$/i

    );



  if(testMatch){



    const label =

      testMatch[1].toLowerCase();



    const value =

      testMatch[2].toUpperCase();



    const map = {

      serial:"serial",

      led:"led",

      timing:"timing",

      memory:"memory",

      commands:"commands",

      system:"system"

    };



    const key =

      map[label];



    if(key){



      systemTestState[key] =

        value;



      const idMap = {

        serial:"testSerial",

        led:"testLed",

        timing:"testTiming",

        memory:"testMemory",

        commands:"testCommands",

        system:"testSystem"

      };



      const el =

        document.getElementById(

          idMap[key]

        );



      el.textContent =

        value;



      el.className =

        `testValue ${

          value === "OK"

            ? "ok"

            : value === "FAIL"

              ? "fail"

              : "testing"

        }`;



    }



  }



  if(

    /^\s*=+\s*$/.test(line)

  ){



    finalizeSystemTest();



  }



}





function finalizeSystemTest(){



  if(!systemTestState.active){

    return;

  }



  systemTestState.active = false;



  const checks = [

    "serial",

    "led",

    "timing",

    "memory",

    "commands",

    "system"

  ];



  const allComplete =

    checks.every(

      key =>

        systemTestState[key] !== null

    );



  const allOk =

    checks.every(

      key =>

        systemTestState[key] === "OK"

    );



  const result =

    document.getElementById(

      "testResult"

    );



  if(allOk){



    result.textContent =

      "PASS";



    result.className =

      "testResult pass";



    document.getElementById(

      "statusSystem"

    ).textContent =

      "OK";



    speak(

      "System test complete. Serial, LED, timing, memory, commands, and system checks all passed."

    );



  }else{



    result.textContent =

      "FAIL";



    result.className =

      "testResult fail";



    document.getElementById(

      "statusSystem"

    ).textContent =

      "CHECK";



    const failures =

      checks.filter(

        key =>

          systemTestState[key] === "FAIL"

      );



    if(failures.length){



      speak(

        `System test complete. The following checks failed: ${failures.join(", ")}.`

      );



    }else if(!allComplete){



      speak(

        "System test finished, but I could not verify every check."

      );



    }else{



      speak(

        "System test completed with a problem."

      );



    }



  }



}





/* ============================================================

   BOARD SHORTCUTS

   ============================================================ */



function stopBoard(){



  sendCloudCommand("stop");



  document.getElementById(

    "statusBlinking"

  ).textContent =

    "NO";



  speak("Stopped.");



}




