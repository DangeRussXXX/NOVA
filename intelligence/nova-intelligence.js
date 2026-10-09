/* ============================================================
   NOVA INTELLIGENCE
   VERSION 2 — BOARD + RSR NATURAL LANGUAGE INTENT ENGINE
   ============================================================ */

console.log("NOVA Intelligence loaded.");


/* ============================================================
   INTELLIGENCE STATE
   ============================================================ */

const novaIntelligenceState = {
  lastIntent: null,
  lastDevice: null,
  lastTarget: null,
  lastAction: null
};


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
    novaIntelligenceState.lastDevice !== "rsr" ||
    !Number.isInteger(novaIntelligenceState.lastTarget) ||
    novaIntelligenceState.lastTarget < 0 ||
    novaIntelligenceState.lastTarget > 7
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
