/* ============================================================
   NOVA INTELLIGENCE
   VERSION 1 — NATURAL LANGUAGE INTENT ENGINE
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
    seven: 7
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
   NATURAL TRAINER LANGUAGE
   ============================================================ */

function novaUnderstandTrainer(text){

  const command =
    String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");


  /* ----------------------------------------------------------
     ALL LIGHTS ON
     ---------------------------------------------------------- */

  if(
    /\b(?:turn|switch|put|light)\b.*\b(?:all|every)\b.*\b(?:light|lights|led|leds)\b.*\bon\b/.test(command) ||
    /\blight up (?:the )?(?:whole|entire) trainer\b/.test(command) ||
    /\bturn (?:the )?(?:whole|entire) trainer on\b/.test(command)
  ){
    return {
      understood: true,
      domain: "hardware",
      device: "trainer",
      action: "all_on",
      command: "trainer all on"
    };
  }


  /* ----------------------------------------------------------
     ALL LIGHTS OFF
     ---------------------------------------------------------- */

  if(
    /\b(?:turn|switch|put)\b.*\b(?:all|every)\b.*\b(?:light|lights|led|leds)\b.*\boff\b/.test(command) ||
    /\bturn (?:the )?(?:whole|entire) trainer off\b/.test(command)
  ){
    return {
      understood: true,
      domain: "hardware",
      device: "trainer",
      action: "all_off",
      command: "trainer all off"
    };
  }


  /* ----------------------------------------------------------
     BLINK TRAINER
     ---------------------------------------------------------- */

  const blinkMatch =
    command.match(
      /\b(?:blink|flash)\b.*?(?:trainer|lights?|leds?)(?:.*?\b(zero|one|two|three|four|five|six|seven|\d+)\b)?/
    );

  if(blinkMatch){

    const count =
      novaNumberFromWord(blinkMatch[1]) ?? 5;

    return {
      understood: true,
      domain: "hardware",
      device: "trainer",
      action: "blink",
      count: count,
      command: `trainer blink ${count}`
    };
  }


  /* ----------------------------------------------------------
     INDIVIDUAL TRAINER LIGHT
     ---------------------------------------------------------- */

  const lightMatch =
    command.match(
      /\b(?:turn|switch|put|set)\b.*?(?:trainer\s+)?(?:light|led)\s*(?:number\s*)?(zero|one|two|three|four|five|six|seven|0|1|2|3|4|5|6|7)\b.*?\b(on|off)\b/
    );

  if(lightMatch){

    const ledNumber =
      novaNumberFromWord(lightMatch[1]);

    const state =
      lightMatch[2];

    return {
      understood: true,
      domain: "hardware",
      device: "trainer",
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
     FIRST / SECOND / THIRD STYLE LANGUAGE
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
      /\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b.*?\b(?:trainer\s+)?(?:light|led)\b/
    );

  if(ordinalMatch){

    const ledNumber =
      ordinalNumbers[ordinalMatch[1]];

    let state = null;


    /* TURN ON/OFF BEFORE THE LIGHT */

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


    /* TURN ON/OFF AFTER THE LIGHT */

    if(!state){

      const trailingState =
        command.match(
          /\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\b.*?\b(?:trainer\s+)?(?:light|led)\b.*?\b(on|off)\b/
        );

      if(trailingState){
        state = trailingState[2];
      }

    }


    if(state){

      return {
        understood: true,
        domain: "hardware",
        device: "trainer",
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
   MAIN INTELLIGENCE ENGINE
   ============================================================ */

function novaUnderstand(rawText){

  const text =
    String(rawText || "")
      .trim();

  if(!text){
    return null;
  }


  /* TRAINER */

  const trainerIntent =
    novaUnderstandTrainer(text);

  if(trainerIntent){
    return trainerIntent;
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
     TRAINER LED
     ---------------------------------------------------------- */

  if(
    intent.device === "trainer" &&
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
      `Trainer LED ${intent.target} ${intent.state}.`,
      false
    );

    return true;
  }


  /* ----------------------------------------------------------
     TRAINER ALL
     ---------------------------------------------------------- */

  if(
    intent.device === "trainer" &&
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
        ? "RSR Trainer all on."
        : "RSR Trainer all off.",
      false
    );

    return true;
  }


  /* ----------------------------------------------------------
     TRAINER BLINK
     ---------------------------------------------------------- */

  if(
    intent.device === "trainer" &&
    intent.action === "blink"
  ){

    sendCloudCommand(
      intent.command
    );

    speak(
      `RSR Trainer blinking ${intent.count} times.`,
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

  console.log(
    "NOVA understood:",
    intent
  );

  return novaExecuteIntent(
    intent
  );
}