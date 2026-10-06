/* ============================================================
   NOVA VEHICLE INTERFACE
   Version 1

   Simulated Vehicle + Panels + Voice

   Legacy WebView Compatible
   Target: Android 6 / Chromium 44+
   ============================================================ */

"use strict";


/* ============================================================
   DOM
   ============================================================ */

var speedValue =
    document.getElementById("speedValue");

var rpmValue =
    document.getElementById("rpmValue");

var voltageValue =
    document.getElementById("voltageValue");

var coolantValue =
    document.getElementById("coolantValue");

var fuelValue =
    document.getElementById("fuelValue");

var gearValue =
    document.getElementById("gearValue");

var vehicleClock =
    document.getElementById("vehicleClock");

var novaResponse =
    document.getElementById("novaResponse");

var novaCoreStatus =
    document.getElementById("novaCoreStatus");

var voiceButton =
    document.getElementById("voiceButton");

var bottomVoiceStatus =
    document.getElementById("bottomVoiceStatus");

var vehiclePanel =
    document.getElementById("vehiclePanel");

var vehiclePanelTitle =
    document.getElementById("vehiclePanelTitle");

var vehiclePanelContent =
    document.getElementById("vehiclePanelContent");

var closeVehiclePanel =
    document.getElementById("closeVehiclePanel");


/* ============================================================
   VEHICLE STATE
   ============================================================ */

var vehicleState = {

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

    var now =
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

var responseTimer = null;

function showNovaResponse(message) {

    if (!message) {
        return;
    }

    novaResponse.textContent =
        String(message).toUpperCase();

    clearTimeout(responseTimer);

    responseTimer =
        setTimeout(
            function() {

                if (!voiceListening) {

                    novaResponse.textContent =
                        "VEHICLE SYSTEM READY";
                }

            },
            6000
        );
}


/* ============================================================
   SPEECH
   ============================================================ */

function findPreferredVoice(voices) {

    var i;
    var voice;
    var language;
    var femaleVoicePattern =
        /aria|jenny|zira|samantha|ava|allison|victoria|female/i;

    /*
       First choice:
       English US voice matching one of the preferred names.
    */

    for (i = 0; i < voices.length; i++) {

        voice = voices[i];

        if (!voice || !voice.lang) {
            continue;
        }

        language =
            String(voice.lang).toLowerCase();

        if (
            language.indexOf("en-us") === 0 &&
            femaleVoicePattern.test(
                String(voice.name || "")
            )
        ) {
            return voice;
        }
    }

    /*
       Second choice:
       Any English US voice.
    */

    for (i = 0; i < voices.length; i++) {

        voice = voices[i];

        if (!voice || !voice.lang) {
            continue;
        }

        language =
            String(voice.lang).toLowerCase();

        if (
            language.indexOf("en-us") === 0
        ) {
            return voice;
        }
    }

    return null;
}


function speak(text) {

    if (
        !text ||
        !("speechSynthesis" in window)
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    var utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 0.9;

    utterance.pitch = 1.05;

    utterance.volume = 1;

    var voices =
        window.speechSynthesis.getVoices();

    var preferred =
        findPreferredVoice(voices);

    if (preferred) {
        utterance.voice = preferred;
    }

    novaCoreStatus.textContent =
        "SPEAKING";

    utterance.onend =
        function() {

            novaCoreStatus.textContent =
                voiceListening
                    ? "LISTENING"
                    : "READY";
        };

    window.speechSynthesis.speak(
        utterance
    );
}


/* ============================================================
   PANEL SYSTEM
   ============================================================ */

var panelData = {

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

    var panel =
        panelData[panelName];

    if (!panel) {
        return;
    }

    vehiclePanelTitle.textContent =
        panel.title;

    vehiclePanelContent.innerHTML =
        '<div class="panelWelcome">' +

            '<div class="panelWelcomeIcon">' +
                panel.icon +
            '</div>' +

            '<div class="panelWelcomeTitle">' +
                panel.title +
            '</div>' +

            '<div class="panelWelcomeText">' +
                panel.text +
            '</div>' +

        '</div>';

    vehiclePanel.classList.add(
        "open"
    );

    showNovaResponse(
        panel.title + " OPEN"
    );
}


function closePanel() {

    vehiclePanel.classList.remove(
        "open"
    );
}


/* ============================================================
   PANEL BUTTONS
   ============================================================ */

var vehicleButtons =
    document.querySelectorAll(
        ".vehicleButton"
    );

var vehicleButtonIndex;

for (
    vehicleButtonIndex = 0;
    vehicleButtonIndex < vehicleButtons.length;
    vehicleButtonIndex++
) {

    (function(button) {

        button.addEventListener(
            "click",
            function() {

                var panel =
                    button.getAttribute(
                        "data-panel"
                    );

                openPanel(panel);
            }
        );

    })(vehicleButtons[vehicleButtonIndex]);
}


closeVehiclePanel.addEventListener(
    "click",
    closePanel
);


/* ============================================================
   VOICE RECOGNITION
   ============================================================ */

var SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


var recognition = null;

var voiceListening = false;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "en-US";

    recognition.maxAlternatives = 1;


    recognition.onstart =
        function() {

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


    recognition.onresult =
        function(event) {

            var result =
                event.results[
                    event.results.length - 1
                ];

            if (
                !result ||
                !result[0]
            ) {
                return;
            }

            var transcript =
                result[0].transcript.trim();

            if (!transcript) {
                return;
            }

            showNovaResponse(
                "HEARD: " + transcript
            );

            routeVehicleVoiceCommand(
                transcript
            );
        };


    recognition.onerror =
        function(event) {

            console.warn(
                "NOVA voice recognition:",
                event.error
            );

            if (
                event.error !== "no-speech" &&
                event.error !== "aborted"
            ) {

                showNovaResponse(
                    "VOICE ERROR: " +
                    event.error
                );
            }
        };


    recognition.onend =
        function() {

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
    function() {

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
            catch (error) {
                console.warn(error);
            }

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

    var command =
        String(rawText)
            .toLowerCase()
            .replace(/[.,!?]/g, "")
            .replace(/^nova\s+/, "")
            .trim();


    /* NAVIGATION */

    if (
        command.indexOf("navigation") !== -1 ||
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
        command.indexOf("music") !== -1 ||
        command.indexOf("media") !== -1
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
        command.indexOf("phone") !== -1
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
        command.indexOf("camera") !== -1
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
        command.indexOf("vehicle") !== -1 ||
        command.indexOf("diagnostics") !== -1 ||
        command.indexOf("obd") !== -1
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
        command.indexOf("amomii") !== -1 ||
        command.indexOf("trainer") !== -1
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
        command.indexOf("nova home") !== -1 ||
        command.indexOf("home system") !== -1
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
        command.indexOf("settings") !== -1
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
        command.indexOf("speed") !== -1 ||
        command.indexOf("how fast") !== -1
    ) {

        var speedResponse =
            "Vehicle speed is " +
            Math.round(
                vehicleState.speed
            ) +
            " miles per hour.";

        showNovaResponse(
            speedResponse
        );

        speak(
            speedResponse
        );

        return;
    }


    /* BATTERY VOLTAGE */

    if (
        command.indexOf("battery") !== -1 ||
        command.indexOf("voltage") !== -1
    ) {

        var voltageResponse =
            "Vehicle voltage is " +
            vehicleState.voltage.toFixed(1) +
            " volts.";

        showNovaResponse(
            voltageResponse
        );

        speak(
            voltageResponse
        );

        return;
    }


    /* COOLANT */

    if (
        command.indexOf("coolant") !== -1 ||
        command.indexOf("temperature") !== -1
    ) {

        var coolantResponse =
            "Coolant temperature is " +
            Math.round(
                vehicleState.coolant
            ) +
            " degrees Fahrenheit.";

        showNovaResponse(
            coolantResponse
        );

        speak(
            coolantResponse
        );

        return;
    }


    /* FUEL */

    if (
        command.indexOf("fuel") !== -1 ||
        command.indexOf("gas") !== -1
    ) {

        var fuelResponse =
            "Fuel level is " +
            Math.round(
                vehicleState.fuel
            ) +
            " percent.";

        showNovaResponse(
            fuelResponse
        );

        speak(
            fuelResponse
        );

        return;
    }


    /* TIME */

    if (
        command.indexOf("what time") !== -1 ||
        command === "time"
    ) {

        var timeResponse =
            "It is " +
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            ) +
            ".";

        showNovaResponse(
            timeResponse
        );

        speak(
            timeResponse
        );

        return;
    }


    /* UNKNOWN COMMAND */

    showNovaResponse(
        "COMMAND NOT RECOGNIZED: " +
        rawText
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

    setTimeout(
        function() {

            showNovaResponse(
                "NOVA VEHICLE INTERFACE ONLINE"
            );

        },
        400
    );
}


novaVehicleStartup();