/* ============================================================
   RSR TRAINER
   RSR Trainer LEDs, switch state, patterns, status and tests.
   ============================================================ */

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
