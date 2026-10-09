/* ============================================================

   NOVA INTELLIGENCE

   VERSION 4 — BOARD + RSR CONVERSATION INTELLIGENCE

   ============================================================ */



console.log("NOVA Intelligence loaded.");





/* ============================================================

   INTELLIGENCE STATE

   ============================================================ */



const NOVA_MEMORY_TIMEOUT = 5 * 60 * 1000; // Five minutes

const novaIntelligenceState = {
  lastIntent: null,
  lastDevice: null,
  lastAction: null,
  lastUpdated: null
};

// Watch target updates from BOTH the legacy index.html router and this engine.
// This avoids changing the already-working index.html voice commands.
let novaRememberedTarget = null;
Object.defineProperty(novaIntelligenceState, "lastTarget", {
  enumerable: true,
  configurable: false,
  get() {
    return novaRememberedTarget;
  },
  set(value) {
    novaRememberedTarget = value;
    novaIntelligenceState.lastUpdated =
      Number.isInteger(value) && value >= 0 && value <= 7
        ? Date.now()
        : null;
  }
});

function novaClearConversationMemory() {
  novaIntelligenceState.lastIntent = null;
  novaIntelligenceState.lastDevice = null;
  novaIntelligenceState.lastTarget = null;
  novaIntelligenceState.lastAction = null;
  novaIntelligenceState.lastUpdated = null;
}

function novaHasFreshRSRTarget() {
  const memory = novaIntelligenceState;
  if (memory.lastDevice !== "rsr" ||
      !Number.isInteger(memory.lastTarget) ||
      memory.lastTarget < 0 || memory.lastTarget > 7) {
    return false;
  }
  if (!Number.isFinite(memory.lastUpdated) ||
      Date.now() - memory.lastUpdated >= NOVA_MEMORY_TIMEOUT) {
    novaClearConversationMemory();
    return false;
  }
  return true;
}





/* ============================================================

   NUMBER CONVERSION

   ============================================================ */



function novaNumberFromWord(value){



  const numbers = {

    zero: 0,

    one: 1,

    two: 2,

    three: 3,

    four: 4,

    five: 5,

    six: 6,

    seven: 7,

    eight: 8,

    nine: 9

  };



  const text =

    String(value || "")

      .toLowerCase()

      .trim();



  if(numbers[text] !== undefined){

    return numbers[text];

  }



  const number = Number(text);



  return Number.isFinite(number)

    ? number

    : null;

}





/* ============================================================

   NATURAL BOARD LANGUAGE

   Spoken name: BOARD

   Internal hardware commands remain unchanged.

   ============================================================ */



function novaUnderstandBoard(text){



  const command =

    String(text || "")

      .toLowerCase()

      .trim()

      .replace(/\s+/g, " ");





  /* BOARD LED ON */



  if(

    /\b(?:turn|switch|put|set)\b.*?\bboard\b.*?\b(?:light|led)\b.*?\bon\b/.test(command) ||

    /\b(?:turn|switch|put|set)\b.*?\bon\b.*?\b(?:the\s+)?board\b.*?\b(?:light|led)\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "board",

      action: "led_on",

      state: "on",

      command: "led on"

    };

  }





  /* BOARD LED OFF */



  if(

    /\b(?:turn|switch|put|set)\b.*?\bboard\b.*?\b(?:light|led)\b.*?\boff\b/.test(command) ||

    /\b(?:turn|switch|put|set)\b.*?\boff\b.*?\b(?:the\s+)?board\b.*?\b(?:light|led)\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "board",

      action: "led_off",

      state: "off",

      command: "led off"

    };

  }





  /* BLINK / FLASH BOARD */



  const blinkMatch =

    command.match(

      /\b(?:blink|flash)\b.*?\b(?:the\s+)?board\b(?:.*?\b(zero|one|two|three|four|five|six|seven|eight|nine|\d+)\b)?/

    );



  if(blinkMatch){



    const count =

      novaNumberFromWord(blinkMatch[1]) ?? 5;



    return {

      understood: true,

      domain: "hardware",

      device: "board",

      action: "blink",

      count: count,

      command: `blink ${count}`

    };

  }





  /* BOARD SYSTEM TEST */



  if(

    /\b(?:run|start|do)\b.*?\bboard\b.*?\b(?:system\s+)?test\b/.test(command) ||

    /\b(?:run|start|do)\b.*?\b(?:system\s+)?test\b.*?\b(?:on\s+)?(?:the\s+)?board\b/.test(command) ||

    /\btest\b.*?\b(?:the\s+)?board\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "board",

      action: "system_test",

      command: "system test"

    };

  }





  /* BOARD STATUS */



  if(

    /\b(?:what(?:'s| is)|check|show|get)\b.*?\bboard\b.*?\bstatus\b/.test(command) ||

    /\bboard status\b/.test(command) ||

    /\bstatus\b.*?\b(?:of|for)\b.*?\b(?:the\s+)?board\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "board",

      action: "status",

      command: "status"

    };

  }





  return null;

}





/* ============================================================

   NATURAL RSR LANGUAGE

   Spoken name: RSR

   Internal Arduino protocol still uses TRAINER.

   ============================================================ */



function novaUnderstandRSR(text){



  const command =

    String(text || "")

      .toLowerCase()

      .trim()

      .replace(/\s+/g, " ");





  /* ----------------------------------------------------------

     ALL RSR LIGHTS ON

     ---------------------------------------------------------- */



  if(

    /\b(?:turn|switch|put|light)\b.*\b(?:all|every)\b.*\brsr\b.*\b(?:light|lights|led|leds)\b.*\bon\b/.test(command) ||

    /\b(?:turn|switch|put|light)\b.*\b(?:all|every)\b.*\b(?:light|lights|led|leds)\b.*\brsr\b.*\bon\b/.test(command) ||

    /\blight up (?:the )?(?:whole|entire) rsr\b/.test(command) ||

    /\bturn (?:the )?(?:whole|entire) rsr on\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "rsr",

      action: "all_on",

      command: "trainer all on"

    };

  }





  /* ----------------------------------------------------------

     ALL RSR LIGHTS OFF

     ---------------------------------------------------------- */



  if(

    /\b(?:turn|switch|put)\b.*\b(?:all|every)\b.*\brsr\b.*\b(?:light|lights|led|leds)\b.*\boff\b/.test(command) ||

    /\b(?:turn|switch|put)\b.*\b(?:all|every)\b.*\b(?:light|lights|led|leds)\b.*\brsr\b.*\boff\b/.test(command) ||

    /\bturn (?:the )?(?:whole|entire) rsr off\b/.test(command)

  ){

    return {

      understood: true,

      domain: "hardware",

      device: "rsr",

      action: "all_off",

      command: "trainer all off"

    };

  }





  /* ----------------------------------------------------------

     BLINK RSR

     ---------------------------------------------------------- */



  const blinkMatch =

    command.match(

      /\b(?:blink|flash)\b.*?\b(?:the\s+)?rsr\b(?:.*?\b(zero|one|two|three|four|five|six|seven|eight|nine|\d+)\b)?/

    );



  if(blinkMatch){



    const count =

      novaNumberFromWord(blinkMatch[1]) ?? 5;



    return {

      understood: true,

      domain: "hardware",

      device: "rsr",

      action: "blink",

      count: count,

      command: `trainer blink ${count}`

    };

  }





  /* ----------------------------------------------------------

     INDIVIDUAL RSR LIGHT — NUMBER STYLE

     ---------------------------------------------------------- */



  const lightMatch =

    command.match(

      /\b(?:turn|switch|put|set)\b.*?\brsr\b.*?\b(?:light|led)\s*(?:number\s*)?(zero|one|two|three|four|five|six|seven|0|1|2|3|4|5|6|7)\b.*?\b(on|off)\b/

    );



  if(lightMatch){



    const ledNumber =

      novaNumberFromWord(lightMatch[1]);



    const state =

      lightMatch[2];



    return {

      understood: true,

      domain: "hardware",

      device: "rsr",

      action:

        state === "on"

          ? "led_on"

          : "led_off",

      target: ledNumber,

      state: state,

      command:

        `trainer led ${ledNumber} ${state}`

    };

  }





  /* ----------------------------------------------------------

     FIRST / SECOND / THIRD STYLE RSR LANGUAGE

     ---------------------------------------------------------- */



  const ordinalNumbers = {

    first: 0,

    second: 1,

    third: 2,

    fourth: 3,

    fifth: 4,

    sixth: 5,

    seventh: 6,

    eighth: 7

  };



  const ordinalMatch =

    command.match(

      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b.*?\brsr\b.*?\b(?:light|led)\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b.*?\b(?:light|led)\b.*?\brsr\b/

    );



  if(ordinalMatch){



    const ordinal =

      ordinalMatch[1] || ordinalMatch[2];



    const ledNumber =

      ordinalNumbers[ordinal];



    let state = null;





    if(

      /\b(?:turn|switch|put|set)\s+(?:it\s+)?on\b/.test(command) ||

      /\bon\b.*?\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b/.test(command)

    ){

      state = "on";

    }



    if(

      /\b(?:turn|switch|put|set)\s+(?:it\s+)?off\b/.test(command) ||

      /\boff\b.*?\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b/.test(command)

    ){

      state = "off";

    }





    if(!state){



      const trailingState =

        command.match(

          /\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b.*?\b(?:rsr\s+)?(?:light|led)\b.*?\b(on|off)\b/

        );



      if(trailingState){

        state = trailingState[2];

      }



    }





    if(state){



      return {

        understood: true,

        domain: "hardware",

        device: "rsr",

        action:

          state === "on"

            ? "led_on"

            : "led_off",

        target: ledNumber,

        state: state,

        command:

          `trainer led ${ledNumber} ${state}`

      };



    }

  }





  return null;

}



/* ============================================================

   NOVA CONVERSATION MEMORY — LED FOLLOW-UPS

   ============================================================ */



function novaUnderstandFollowUp(rawText) {



  const text = String(rawText || "")

    .toLowerCase()

    .replace(/^nova[\s,]+/, "")

    .replace(/[.,!?]/g, "")

    .replace(/\s+/g, " ")

    .trim();



  // Only recognize clear follow-up instructions.

  const match = text.match(

    /^(?:(?:now|please)\s+)*(?:turn|switch|set)\s+(?:that one|that light|that led|it)\s+(on|off)$/

  );



  if (!match) {

    return null;

  }



  // Only reuse a specific, previously selected RSR LED.

  if (

    !novaHasFreshRSRTarget()

  ) {

    speak("Which RSR light would you like me to control?");

    return { needsClarification: true };

  }



  const ledNumber = novaIntelligenceState.lastTarget;

  const state = match[1];



  return {

    understood: true,

    domain: "hardware",

    device: "rsr",

    action: state === "on" ? "led_on" : "led_off",

    target: ledNumber,

    state: state,

    command: `trainer led ${ledNumber} ${state}`

  };

}



/* ============================================================

   MAIN INTELLIGENCE ENGINE

   ============================================================ */



function novaUnderstand(rawText){



  const text =

    String(rawText || "")

      .trim();



  if(!text){

    return null;

  }



  // Check conversational follow-up commands first.

const followUpIntent = novaUnderstandFollowUp(text);



if (followUpIntent) {

  return followUpIntent;

}



  /* BOARD */



  const boardIntent =

    novaUnderstandBoard(text);



  if(boardIntent){

    return boardIntent;

  }





  /* RSR */



  const rsrIntent =

    novaUnderstandRSR(text);



  if(rsrIntent){

    return rsrIntent;

  }





  return null;

}





/* ============================================================

   EXECUTE INTELLIGENT INTENT

   ============================================================ */



function novaExecuteIntent(intent){



  if(!intent || !intent.understood){

    return false;

  }





  novaIntelligenceState.lastIntent =

    intent;



  novaIntelligenceState.lastDevice =

    intent.device || null;



  novaIntelligenceState.lastTarget =

    intent.target ?? null;



  novaIntelligenceState.lastAction =

    intent.action || null;





  /* ----------------------------------------------------------

     BOARD LED

     ---------------------------------------------------------- */



  if(

    intent.device === "board" &&

    (

      intent.action === "led_on" ||

      intent.action === "led_off"

    )

  ){



    sendCloudCommand(

      intent.command

    );



    speak(

      intent.state === "on"

        ? "Board light on."

        : "Board light off.",

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     BOARD BLINK

     ---------------------------------------------------------- */



  if(

    intent.device === "board" &&

    intent.action === "blink"

  ){



    sendCloudCommand(

      intent.command

    );



    speak(

      `Board blinking ${intent.count} times.`,

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     BOARD SYSTEM TEST

     ---------------------------------------------------------- */



  if(

    intent.device === "board" &&

    intent.action === "system_test"

  ){



    sendCloudCommand(

      intent.command

    );



    speak(

      "Running board system test.",

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     BOARD STATUS

     ---------------------------------------------------------- */



  if(

    intent.device === "board" &&

    intent.action === "status"

  ){



    sendCloudCommand(

      intent.command

    );



    speak(

      "Checking board status.",

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     RSR LED

     ---------------------------------------------------------- */



  if(

    intent.device === "rsr" &&

    (

      intent.action === "led_on" ||

      intent.action === "led_off"

    )

  ){



    sendCloudCommand(

      intent.command

    );



    if(

      intent.target !== null &&

      intent.target !== undefined

    ){

      setTrainerLedUI(

        intent.target,

        intent.state === "on"

      );

    }



    speak(

      `RSR light ${intent.target} ${intent.state}.`,

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     RSR ALL

     ---------------------------------------------------------- */



  if(

    intent.device === "rsr" &&

    (

      intent.action === "all_on" ||

      intent.action === "all_off"

    )

  ){



    const state =

      intent.action === "all_on";



    sendCloudCommand(

      intent.command

    );



    trainerLedStates.forEach(

      (_, index) =>

        setTrainerLedUI(

          index,

          state

        )

    );



    speak(

      state

        ? "RSR all on."

        : "RSR all off.",

      false

    );



    return true;

  }





  /* ----------------------------------------------------------

     RSR BLINK

     ---------------------------------------------------------- */



  if(

    intent.device === "rsr" &&

    intent.action === "blink"

  ){



    sendCloudCommand(

      intent.command

    );



    speak(

      `RSR blinking ${intent.count} times.`,

      false

    );



    return true;

  }





  return false;

}



/* ============================================================

   INTELLIGENCE ENTRY POINT

   ============================================================ */



function novaTryIntelligence(rawText){



  const intent =

    novaUnderstand(rawText);



  if(!intent){

    return false;

  }



  // Handle clarification without sending a hardware command.

  if(intent.needsClarification){

    return true;

  }



  console.log(

    "NOVA understood:",

    intent

  );



  return novaExecuteIntent(

    intent

  );

}


/* ============================================================
   NOVA INTELLIGENCE V4 — NATURAL CONVERSATION

   This is installed after index.html defines routeVoiceCommand.
   It intercepts ONLY the new, clearly recognized phrases and
   leaves every other command with the existing working router.
   ============================================================ */

const novaV4State = {
  group: [],
  groupUpdated: null,
  lastCommand: null
};

function novaV4Normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/^nova[\s,]+/, "")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function novaV4ForgetGroup() {
  novaV4State.group = [];
  novaV4State.groupUpdated = null;
}

function novaV4GetFreshGroup() {
  if (!Number.isFinite(novaV4State.groupUpdated) ||
      Date.now() - novaV4State.groupUpdated >= NOVA_MEMORY_TIMEOUT) {
    novaV4ForgetGroup();
    return [];
  }
  return novaV4State.group.slice();
}

function novaV4RecordCommand(command) {
  if (typeof command === "string" && command.trim()) {
    novaV4State.lastCommand = command.trim();
  }
}

// A deliberate, narrow grammar for multi-step RSR commands.
// Examples: "turn on RSR light three", "turn on light five".
function novaV4ParseLightClause(text) {
  const match = novaV4Normalize(text).match(
    /^(?:please )?(?:turn|switch|set) (on|off) (?:the )?(?:(?:rsr|trainer) )?(?:light|led) (?:number )?(zero|one|two|three|four|five|six|seven|[0-7])$/
  );
  if (!match) return null;
  const target = novaNumberFromWord(match[2]);
  if (!Number.isInteger(target) || target < 0 || target > 7) return null;
  return {target, state: match[1]};
}

function novaV4SendLight(target, state) {
  const intent = {
    understood: true,
    domain: "hardware",
    device: "rsr",
    action: state === "on" ? "led_on" : "led_off",
    target,
    state,
    command: `trainer led ${target} ${state}`
  };
  // Reuse the existing execution path (one relay send per LED).
  const handled = novaExecuteIntent(intent);
  if (handled) novaV4RecordCommand(intent.command);
  return handled;
}

function novaV4HandleNewCommand(rawText) {
  const text = novaV4Normalize(rawText);

  if (/^(?:(?:please|now) )*(?:forget|clear|reset) (?:the )?(?:last device|last light|last led|conversation memory)$/.test(text)) {
    novaClearConversationMemory();
    novaV4ForgetGroup();
    speak("I've cleared the last device from conversation memory.", false);
    return true;
  }

  if (/^(?:what (?:was|is) (?:the |your )?last command|repeat (?:the |your )?last command)$/.test(text)) {
    speak(novaV4State.lastCommand
      ? `The last hardware command I recorded was ${novaV4State.lastCommand.replace(/^trainer led (\d) (on|off)$/, "RSR light $1 $2")}.`
      : "I haven't recorded a hardware command in this session.", false);
    return true;
  }

  const both = text.match(/^(?:(?:now|please) )*(?:turn|switch|set) (?:them both|both(?: of them)?|those two(?: lights)?) (on|off)$/);
  if (both) {
    const group = novaV4GetFreshGroup();
    if (group.length !== 2) {
      speak("Which two RSR lights would you like me to control?", false);
      return true;
    }
    for (const target of group) novaV4SendLight(target, both[1]);
    novaV4State.groupUpdated = Date.now();
    return true;
  }

  // Validate BOTH clauses before sending EITHER hardware command.
  const clauses = text.split(/\s+then\s+/);
  if (clauses.length === 2) {
    const first = novaV4ParseLightClause(clauses[0]);
    const second = novaV4ParseLightClause(clauses[1]);
    if (first && second) {
      if (first.target === second.target) {
        speak("Please choose two different RSR lights.", false);
        return true;
      }
      // Preserve the stated order. The cloud relay uses a command queue.
      novaV4SendLight(first.target, first.state);
      novaV4SendLight(second.target, second.state);
      novaV4State.group = [first.target, second.target];
      novaV4State.groupUpdated = Date.now();
      return true;
    }
    // An attempted two-part LED instruction should not partly execute.
    if (/\b(?:rsr|trainer|led|light)\b/.test(text)) {
      speak("I couldn't understand both light commands. Please try again.", false);
      return true;
    }
  }
  return false;
}

// Wrap the existing voice router rather than replacing its commands.
// This also observes legacy "trainer LED three on" commands, which
// are processed before novaTryIntelligence in index.html.
if (typeof routeVoiceCommand === "function") {
  const novaV4OriginalRoute = routeVoiceCommand;
  routeVoiceCommand = function(command, raw) {
    const spoken = String(raw || command || "");
    if (novaV4HandleNewCommand(spoken)) return;

    const normalized = novaV4Normalize(command || spoken);
    const legacyLED = normalized.match(
      /\btrainer\s+(?:led\s+)?(zero|one|two|three|four|five|six|seven|[0-7])\s+(on|off)\b/
    );
    if (legacyLED) {
      novaV4ForgetGroup();
      novaV4RecordCommand(`trainer led ${novaNumberFromWord(legacyLED[1])} ${legacyLED[2]}`);
    } else if (/^(?:(?:now|please) )*(?:turn|switch|set) (?:that one|that light|that led|it) (?:on|off)$/.test(normalized)) {
      if (novaHasFreshRSRTarget()) {
        const state = normalized.match(/\b(on|off)$/)[1];
        novaV4RecordCommand(`trainer led ${novaIntelligenceState.lastTarget} ${state}`);
      }
      novaV4ForgetGroup();
    } else if (/\b(?:board|rsr|trainer)\b/.test(normalized)) {
      novaV4ForgetGroup();
    }
    return novaV4OriginalRoute.apply(this, arguments);
  };
} else {
  console.warn("NOVA v4: voice router unavailable; v4 phrases not installed.");
}


/* ============================================================
   NOVA INTELLIGENCE V5 — DEVICE AWARENESS
   Preserves V4 router, commands and five-minute memory.
   Reports Arduino output pin states, NOT optical LED verification.
   ============================================================ */

const novaV5 = {
  outputs: Array(8).fill(null),
  lastSnapshotAt: 0,
  lastResponseAt: 0,
  snapshot: null,
  pending: null,
  timeoutMs: 15000
};

function novaV5Say(message) {
  if (typeof speak === "function") speak(message, false);
  else console.log("NOVA V5:", message);
}

function novaV5FinishPending(message) {
  const pending = novaV5.pending;
  if (!pending) return;
  clearTimeout(pending.timer);
  novaV5.pending = null;
  novaV5Say(message);
}

function novaV5DescribeOutputs() {
  const on = novaV5.outputs.flatMap((value, i) => value === true ? [i] : []);
  const unknown = novaV5.outputs.filter(value => value === null).length;
  let result = on.length
    ? `The Arduino reports RSR outputs ${on.join(", ")} on.`
    : "The Arduino reports all eight RSR outputs off.";
  if (unknown) result += ` ${unknown} outputs have unknown states.`;
  result += " These are Arduino output readings, not physical LED measurements.";
  return result;
}

function novaV5Request(kind) {
  if (novaV5.pending) {
    novaV5Say("I'm already waiting for an Arduino status report. Please try again shortly.");
    return true;
  }
  if (typeof sendCloudCommand !== "function") {
    novaV5Say("The cloud command connection is unavailable in this dashboard.");
    return true;
  }
  novaV5.snapshot = {startedAt: Date.now(), values: Array(8).fill(null), seen: new Set(), active: false, trainerOnline: false};
  const timer = setTimeout(() => {
    if (novaV5.pending && novaV5.pending.kind === kind) {
      novaV5FinishPending("I did not receive a complete, fresh trainer status report. I cannot confirm the current device state.");
    }
    novaV5.snapshot = null;
  }, novaV5.timeoutMs);
  novaV5.pending = {kind, timer};
  try {
    sendCloudCommand("trainer status");
  } catch (error) {
    novaV5FinishPending("I couldn't send the trainer status request.");
    novaV5.snapshot = null;
  }
  return true;
}

function novaV5ObserveLine(rawLine) {
  const line = String(rawLine || "").trim();
  if (!line) return;
  novaV5.lastResponseAt = Date.now();
  const snap = novaV5.snapshot;
  if (!snap || !novaV5.pending) return;
  // The firmware emits this heading before its eight numbered output readings.
  if (/^=+\s*RSR TRAINER STATUS\s*=+$/i.test(line)) {
    snap.active = true;
    snap.seen.clear();
    snap.values.fill(null);
    return;
  }
  if (!snap.active) return;
  if (/^Trainer:\s*ONLINE$/i.test(line)) snap.trainerOnline = true;
  const match = line.match(/^TRAINER LED ([0-7]):\s*(ON|OFF)$/i);
  if (match) {
    const n = Number(match[1]);
    snap.values[n] = match[2].toUpperCase() === "ON";
    snap.seen.add(n);
  }
  if (snap.seen.size !== 8) return;
  novaV5.outputs = snap.values.slice();
  novaV5.lastSnapshotAt = Date.now();
  const kind = novaV5.pending.kind;
  novaV5.snapshot = null;
  if (kind === "lights") novaV5FinishPending(novaV5DescribeOutputs());
  else if (kind === "devices") novaV5FinishPending("The AMOMII ONE Arduino responded through the cloud relay, and its RSR trainer output controller reports online. This does not independently verify physical trainer wiring.");
  else novaV5FinishPending("Yes. I received a fresh, complete status response from the Arduino's RSR trainer controller.");
}

// Attach to the existing hardware response handler, which receives /response.
if (typeof processSerialLine === "function") {
  const novaV5OriginalSerialLine = processSerialLine;
  processSerialLine = function(line) {
    novaV5ObserveLine(line);
    return novaV5OriginalSerialLine.apply(this, arguments);
  };
} else {
  console.warn("NOVA v5: processSerialLine unavailable; response awareness disabled.");
}

function novaV5HandleCommand(raw) {
  const text = novaV4Normalize(raw);
  if (/^(?:which|what) (?:rsr |trainer )?(?:lights|leds|outputs) (?:are )?on\??$/.test(text) ||
      /^(?:tell me |show me )?(?:which|what) (?:rsr |trainer )?(?:lights|leds|outputs) are on$/.test(text)) {
    return novaV5Request("lights");
  }
  if (/^(?:what|which) devices are connected$/.test(text) ||
      /^what(?:'s| is) connected$/.test(text)) {
    return novaV5Request("devices");
  }
  if (/^(?:is|does) (?:my |the )?(?:rsr |trainer|rsr trainer)(?: responding| respond| online| connected)\??$/.test(text) ||
      /^(?:check|test) (?:the |my )?(?:rsr |trainer|rsr trainer) (?:connection|response)$/.test(text)) {
    return novaV5Request("health");
  }
  const except = text.match(/^(?:please )?(?:turn|switch|set) off (?:every|all)(?: rsr| trainer)? (?:light|lights|led|leds)(?: except| but| other than) (?:number )?(zero|one|two|three|four|five|six|seven|[0-7])$/);
  if (except) {
    const keep = novaNumberFromWord(except[1]);
    if (!Number.isInteger(keep) || keep < 0 || keep > 7) return false;
    if (typeof sendCloudCommand !== "function") {
      novaV5Say("The cloud relay is not available.");
      return true;
    }
    // This affects only trainer LEDs 0–7. The excluded LED is untouched.
    for (let n = 0; n < 8; n++) {
      if (n === keep) continue;
      sendCloudCommand(`trainer led ${n} off`);
      if (typeof setTrainerLedUI === "function") setTrainerLedUI(n, false);
    }
    novaV4ForgetGroup();
    novaV4RecordCommand(`trainer LEDs except ${keep} off`);
    novaV5Say(`I sent off commands for the seven RSR lights other than ${keep}. I left light ${keep} unchanged. Their actual states have not yet been checked.`);
    return true;
  }
  return false;
}

// V5 wraps V4, leaving all other voice commands unchanged.
if (typeof routeVoiceCommand === "function") {
  const novaV5OriginalRoute = routeVoiceCommand;
  routeVoiceCommand = function(command, raw) {
    if (novaV5HandleCommand(raw || command)) return;
    return novaV5OriginalRoute.apply(this, arguments);
  };
}

console.log("NOVA Intelligence v5 Device Awareness loaded.");
