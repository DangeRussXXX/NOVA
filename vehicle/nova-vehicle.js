/* ============================================================
   NOVA VEHICLE INTERFACE
   Version 1
   Simulated Vehicle + Panels + Voice
   ============================================================ */

"use strict";


/* ============================================================
   DOM
   ============================================================ */

const speedValue =
  document.getElementById("speedValue");

const rpmValue =
  document.getElementById("rpmValue");

const voltageValue =
  document.getElementById("voltageValue");

const coolantValue =
  document.getElementById("coolantValue");

const fuelValue =
  document.getElementById("fuelValue");

const gearValue =
  document.getElementById("gearValue");

const vehicleClock =
  document.getElementById("vehicleClock");

const novaResponse =
  document.getElementById("novaResponse");

const novaCoreStatus =
  document.getElementById("novaCoreStatus");

const voiceButton =
  document.getElementById("voiceButton");

const bottomVoiceStatus =
  document.getElementById("bottomVoiceStatus");

const vehiclePanel =
  document.getElementById("vehiclePanel");

const vehiclePanelTitle =
  document.getElementById("vehiclePanelTitle");

const vehiclePanelContent =
  document.getElementById("vehiclePanelContent");

const closeVehiclePanel =
  document.getElementById("closeVehiclePanel");


/* ============================================================
   VEHICLE STATE
   ============================================================ */

const vehicleState = {

  speed: 0,

  rpm: 0,

  voltage: 13.8,

  coolant: 190,

  fuel: 78,

  gear: "P",

  simulated: true

};


/* ============================================================
   CLOCK
   ============================================================ */

function updateClock() {

  const now =
    new Date();

  vehicleClock.textContent =
    now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });

}

updateClock();

setInterval(
  updateClock,
  1000
);


/* ============================================================
   VEHICLE DISPLAY
   ============================================================ */

function updateVehicleDisplay() {

  speedValue.textContent =
    Math.round(vehicleState.speed);

  rpmValue.textContent =
    Math.round(vehicleState.rpm);

  voltageValue.textContent =
    vehicleState.voltage.toFixed(1);

  coolantValue.textContent =
    Math.round(vehicleState.coolant);

  fuelValue.textContent =
    Math.round(vehicleState.fuel);

  gearValue.textContent =
    vehicleState.gear;

}


/* ============================================================
   SIMULATED VEHICLE
   ============================================================ */

function simulateVehicle() {

  /*
     For now the car is parked.

     Later this function will be replaced by:
       - OBD-II
       - GPS
       - Android vehicle data
       - NOVA Vehicle Controller
  */

  vehicleState.speed = 0;

  vehicleState.rpm =
    700 + Math.random() * 35;

  vehicleState.voltage =
    13.7 + Math.random() * 0.25;

  vehicleState.coolant =
    188 + Math.random() * 3;

  updateVehicleDisplay();

}

simulateVehicle();

setInterval(
  simulateVehicle,
  1500
);


/* ============================================================
   NOVA RESPONSE
   ============================================================ */

let responseTimer = null;

function showNovaResponse(message) {

  if (!message) {
    return;
  }

  novaResponse.textContent =
    String(message).toUpperCase();

  clearTimeout(responseTimer);

  responseTimer =
    setTimeout(() => {

      if (!voiceListening) {

        novaResponse.textContent =
          "VEHICLE SYSTEM READY";

      }

    }, 6000);

}


/* ============================================================
   SPEECH
   ============================================================ */

function speak(text) {

  if (
    !text ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.rate = 0.9;

  utterance.pitch = 1.05;

  utterance.volume = 1;


  const voices =
    speechSynthesis.getVoices();

  const preferred =
    voices.find(voice =>
      voice.lang &&
      voice.lang
        .toLowerCase()
        .startsWith("en-us") &&
      /aria|jenny|zira|samantha|ava|allison|victoria|female/i
        .test(voice.name)
    ) ||

    voices.find(voice =>
      voice.lang &&
      voice.lang
        .toLowerCase()
        .startsWith("en-us")
    );

  if (preferred) {
    utterance.voice = preferred;
  }


  novaCoreStatus.textContent =
    "SPEAKING";

  utterance.onend = () => {

    novaCoreStatus.textContent =
      voiceListening
        ? "LISTENING"
        : "READY";

  };


  speechSynthesis.speak(
    utterance
  );

}


/* ============================================================
   PANEL SYSTEM
   ============================================================ */

const panelData = {

  navigation: {

    title: "NAVIGATION",

    icon: "⌖",

    text:
      "Navigation system ready. Android GPS and map integration will be connected here."

  },


  music: {

    title: "NOVA MEDIA",

    icon: "♫",

    text:
      "NOVA Media Center will connect to your existing music library and vehicle audio system."

  },


  phone: {

    title: "PHONE",

    icon: "☎",

    text:
      "Bluetooth phone controls, contacts, calls and hands-free communication will appear here."

  },


  cameras: {

    title: "VEHICLE CAMERAS",

    icon: "◉",

    text:
      "Front, rear and additional NOVA vehicle camera feeds will appear here."

  },


  vehicle: {

    title: "VEHICLE SYSTEM",

    icon: "⚡",

    text:
      "Vehicle diagnostics, OBD-II data, sensors, battery voltage and NOVA Vehicle Controller status will appear here."

  },


  amomii: {

    title: "AMOMII NETWORK",

    icon: "A",

    text:
      "Connect NOVA Vehicle to AMOMII ONE, your trainers and other NOVA systems."

  },


  home: {

    title: "NOVA HOME",

    icon: "⌂",

    text:
      "Remote access to your NOVA home systems will appear here."

  },


  settings: {

    title: "VEHICLE SETTINGS",

    icon: "⚙",

    text:
      "Vehicle interface, display, voice, connection and system settings will appear here."

  }

};


function openPanel(panelName) {

  const panel =
    panelData[panelName];

  if (!panel) {
    return;
  }


  vehiclePanelTitle.textContent =
    panel.title;


  vehiclePanelContent.innerHTML = `
    <div class="panelWelcome">

      <div class="panelWelcomeIcon">
        ${panel.icon}
      </div>

      <div class="panelWelcomeTitle">
        ${panel.title}
      </div>

      <div class="panelWelcomeText">
        ${panel.text}
      </div>

    </div>
  `;


  vehiclePanel.classList.add(
    "open"
  );


  showNovaResponse(
    `${panel.title} OPEN`
  );

}


function closePanel() {

  vehiclePanel.classList.remove(
    "open"
  );

}


document
  .querySelectorAll(".vehicleButton")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const panel =
          button.dataset.panel;

        openPanel(panel);

      }
    );

  });


closeVehiclePanel.addEventListener(
  "click",
  closePanel
);


/* ============================================================
   VOICE RECOGNITION
   ============================================================ */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;

let voiceListening = false;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.lang = "en-US";

  recognition.maxAlternatives = 1;


  recognition.onstart = () => {

    voiceListening = true;

    voiceButton.classList.add(
      "listening"
    );

    voiceButton.textContent =
      "LISTENING...";

    bottomVoiceStatus.textContent =
      "LISTENING";

    novaCoreStatus.textContent =
      "LISTENING";

    showNovaResponse(
      "NOVA IS LISTENING"
    );

  };


  recognition.onresult = event => {

    const result =
      event.results[
        event.results.length - 1
      ];

    if (
      !result ||
      !result[0]
    ) {
      return;
    }

    const transcript =
      result[0].transcript.trim();

    if (!transcript) {
      return;
    }

    showNovaResponse(
      `HEARD: ${transcript}`
    );

    routeVehicleVoiceCommand(
      transcript
    );

  };


  recognition.onerror = event => {

    console.warn(
      "NOVA voice recognition:",
      event.error
    );

    if (
      event.error !== "no-speech" &&
      event.error !== "aborted"
    ) {

      showNovaResponse(
        `VOICE ERROR: ${event.error}`
      );

    }

  };


  recognition.onend = () => {

    voiceListening = false;

    voiceButton.classList.remove(
      "listening"
    );

    voiceButton.textContent =
      "TALK TO NOVA";

    bottomVoiceStatus.textContent =
      "READY";

    novaCoreStatus.textContent =
      "READY";

  };

}


/* ============================================================
   TALK BUTTON
   ============================================================ */

voiceButton.addEventListener(
  "click",
  () => {

    if (!recognition) {

      showNovaResponse(
        "VOICE RECOGNITION NOT AVAILABLE"
      );

      speak(
        "Voice recognition is not available in this browser."
      );

      return;

    }


    if (voiceListening) {

      try {
        recognition.stop();
      }
      catch (error) {}

      return;

    }


    try {

      recognition.start();

    }
    catch (error) {

      console.warn(
        error
      );

    }

  }
);


/* ============================================================
   VEHICLE VOICE COMMAND ROUTER
   ============================================================ */

function routeVehicleVoiceCommand(
  rawText
) {

  const command =
    String(rawText)
      .toLowerCase()
      .replace(/[.,!?]/g, "")
      .replace(/^nova\s+/, "")
      .trim();


  /* NAVIGATION */

  if (
    command.includes("navigation") ||
    command === "open maps" ||
    command === "show maps"
  ) {

    openPanel(
      "navigation"
    );

    speak(
      "Opening navigation."
    );

    return;

  }


  /* MUSIC */

  if (
    command.includes("music") ||
    command.includes("media")
  ) {

    openPanel(
      "music"
    );

    speak(
      "Opening NOVA media."
    );

    return;

  }


  /* PHONE */

  if (
    command.includes("phone")
  ) {

    openPanel(
      "phone"
    );

    speak(
      "Opening phone controls."
    );

    return;

  }


  /* CAMERAS */

  if (
    command.includes("camera")
  ) {

    openPanel(
      "cameras"
    );

    speak(
      "Opening vehicle cameras."
    );

    return;

  }


  /* VEHICLE */

  if (
    command.includes("vehicle") ||
    command.includes("diagnostics") ||
    command.includes("obd")
  ) {

    openPanel(
      "vehicle"
    );

    speak(
      "Opening vehicle systems."
    );

    return;

  }


  /* AMOMII */

  if (
    command.includes("amomii") ||
    command.includes("trainer")
  ) {

    openPanel(
      "amomii"
    );

    speak(
      "Opening the AMOMII network."
    );

    return;

  }


  /* HOME */

  if (
    command === "home" ||
    command.includes("nova home") ||
    command.includes("home system")
  ) {

    openPanel(
      "home"
    );

    speak(
      "Opening NOVA home."
    );

    return;

  }


  /* SETTINGS */

  if (
    command.includes("settings")
  ) {

    openPanel(
      "settings"
    );

    speak(
      "Opening vehicle settings."
    );

    return;

  }


  /* CLOSE */

  if (
    command === "close" ||
    command === "go back" ||
    command === "back"
  ) {

    closePanel();

    speak(
      "Closing panel."
    );

    return;

  }


  /* SPEED */

  if (
    command.includes("speed") ||
    command.includes("how fast")
  ) {

    const response =
      `Vehicle speed is ${Math.round(
        vehicleState.speed
      )} miles per hour.`;

    showNovaResponse(
      response
    );

    speak(
      response
    );

    return;

  }


  /* BATTERY VOLTAGE */

  if (
    command.includes("battery") ||
    command.includes("voltage")
  ) {

    const response =
      `Vehicle voltage is ${vehicleState.voltage.toFixed(
        1
      )} volts.`;

    showNovaResponse(
      response
    );

    speak(
      response
    );

    return;

  }


  /* COOLANT */

  if (
    command.includes("coolant") ||
    command.includes("temperature")
  ) {

    const response =
      `Coolant temperature is ${Math.round(
        vehicleState.coolant
      )} degrees Fahrenheit.`;

    showNovaResponse(
      response
    );

    speak(
      response
    );

    return;

  }


  /* FUEL */

  if (
    command.includes("fuel") ||
    command.includes("gas")
  ) {

    const response =
      `Fuel level is ${Math.round(
        vehicleState.fuel
      )} percent.`;

    showNovaResponse(
      response
    );

    speak(
      response
    );

    return;

  }


  /* TIME */

  if (
    command.includes("what time") ||
    command === "time"
  ) {

    const response =
      `It is ${
        new Date().toLocaleTimeString(
          [],
          {
            hour: "numeric",
            minute: "2-digit"
          }
        )
      }.`;

    showNovaResponse(
      response
    );

    speak(
      response
    );

    return;

  }


  /* UNKNOWN COMMAND */

  showNovaResponse(
    `COMMAND NOT RECOGNIZED: ${rawText}`
  );

  speak(
    "I don't have that vehicle command yet."
  );

}


/* ============================================================
   STARTUP
   ============================================================ */

function novaVehicleStartup() {

  updateVehicleDisplay();

  bottomVoiceStatus.textContent =
    recognition
      ? "READY"
      : "UNAVAILABLE";

  console.log(
    "NOVA Vehicle Interface initialized."
  );


  setTimeout(() => {

    showNovaResponse(
      "NOVA VEHICLE INTERFACE ONLINE"
    );

  }, 400);

}


novaVehicleStartup();