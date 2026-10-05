/* ============================================================
   AMOMII ONE
   AMOMII ONE connection controls, board LED/status and system test.
   ============================================================ */

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
  log("Connected to AMOMII Cloud Relay.", "success");
  updateConnectionUI(true);
  speak("AMOMII Cloud Relay is connected.");
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

// ============================================================
// AMOMII CONTROLLER EXPAND / COLLAPSE
// ============================================================

function toggleController(){

  const header =
    document.querySelector(".controllerHeader");

  if(!header) return;

  const panel =
    header.closest(".panel");

  if(!panel) return;

  const body =
    panel.querySelector(":scope > .panelBody");

  if(!body) return;

  body.classList.toggle("collapsed");

}

// Keep the AMOMII header working even if an inline onclick handler
// is unavailable after the hardware code is split into separate files.
window.toggleController = toggleController;

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".controllerHeader");
  if(!header || header.dataset.amomiiCollapseBound === "true") return;

  header.dataset.amomiiCollapseBound = "true";
  header.removeAttribute("onclick");
  header.addEventListener("click", toggleController);
});

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


