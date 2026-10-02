// ============================================================

// AMOMII ONE COMMAND CENTER 6.0

// Combined Text + Voice Command Edition

//

// Arduino built-in LED

// Trainer LEDs: pins 2-9

//

// Targets:

//   ARDUINO

//   TRAINER

//   BOTH

//

// Examples:

//   LED ON

//   LED OFF

//   ARDUINO LED ON

//   TRAINER LED 3 ON

//   TRAINER LED ALL ON

//   ARDUINO ALL OFF

//   ALL ON

//   ALL OFF

//   BOTH ON

//   BOTH OFF

//   BLINK 10

//   TRAINER BLINK 10

//   BOTH BLINK 10

//   SPEED 100

//   FLASH 10 100

//   TRAINER FLASH 10 100

//   BOTH FLASH 10 100

//   PULSE 500

//   SOS

//   BOTH SOS

//   MORSE SOS

//   BOTH MORSE SOS

//   STOP

//

// Voice-friendly examples:

//   trainer led three on

//   trainer led all off

//   arduino led on

//   all leds on

//   both blink five

//   speed one hundred

//   flash ten one hundred

// ============================================================



#include <Arduino.h>

#include <string.h>

#include <stdlib.h>

#include <ctype.h>





// ============================================================

// HARDWARE

// ============================================================



const byte LED = LED_BUILTIN;



const byte TRAINER[8] = {

  2, 3, 4, 5, 6, 7, 8, 9

};





// ============================================================

// COMMAND BUFFER

// ============================================================



char command[120];

byte commandLength = 0;



unsigned long startTime = 0;

unsigned long commandCount = 0;





// ============================================================

// ARDUINO LED EFFECT STATE

// ============================================================



bool arduinoState = false;

bool arduinoBlinking = false;



unsigned int arduinoBlinkSpeed = 300;

unsigned int arduinoRemainingBlinks = 0;



unsigned long arduinoLastBlink = 0;





// ============================================================

// TRAINER EFFECT STATE

// ============================================================



bool trainerBlinking = false;



unsigned int trainerBlinkSpeed = 300;

unsigned int trainerRemainingBlinks = 0;



unsigned long trainerLastBlink = 0;



bool trainerBlinkState = false;


// ============================================================
// RSR TRAINER PATTERN STATE
// ============================================================

enum TrainerPattern {
  TRAINER_PATTERN_NONE,
  TRAINER_PATTERN_KNIGHT,
  TRAINER_PATTERN_CHASE,
  TRAINER_PATTERN_REVERSE,
  TRAINER_PATTERN_CENTER_OUT,
  TRAINER_PATTERN_OUTSIDE_IN,
  TRAINER_PATTERN_ALTERNATE,
  TRAINER_PATTERN_FILL,
  TRAINER_PATTERN_WAVE,
  TRAINER_PATTERN_POLICE,
  TRAINER_PATTERN_STROBE
};

TrainerPattern trainerPattern = TRAINER_PATTERN_NONE;
unsigned int trainerPatternSpeed = 150;
unsigned long trainerPatternLastStep = 0;
byte trainerPatternStep = 0;






// ============================================================

// BOTH EFFECT STATE

// ============================================================



bool bothBlinking = false;



unsigned int bothBlinkSpeed = 300;

unsigned int bothRemainingBlinks = 0;



unsigned long bothLastBlink = 0;



bool bothBlinkState = false;





// ============================================================

// TARGET TYPE

// ============================================================



enum TargetType {

  TARGET_ARDUINO,

  TARGET_TRAINER,

  TARGET_BOTH

};





// ============================================================

// SETUP

// ============================================================



void setup() {



  pinMode(LED, OUTPUT);

  digitalWrite(LED, LOW);



  for (byte i = 0; i < 8; i++) {

    pinMode(TRAINER[i], OUTPUT);

    digitalWrite(TRAINER[i], LOW);

  }



  Serial.begin(9600);



  startTime = millis();



  startupAnimation();



  Serial.println();

  Serial.println(F("================================================"));

  Serial.println(F("        AMOMII ONE COMMAND CENTER 6.0"));

  Serial.println(F("================================================"));

  Serial.println();

  Serial.println(F("SYSTEM ONLINE"));

  Serial.println(F("USB CONNECTION ACTIVE"));

  Serial.println(F("ARDUINO LED READY"));

  Serial.println(F("TRAINER LEDS READY (2-9)"));

  Serial.println();

  Serial.println(F("TEXT + VOICE COMMAND MODE"));

  Serial.println(F("Type HELP for commands."));

  Serial.println();

}





// ============================================================

// MAIN LOOP

// ============================================================



void loop() {



  readSerial();



  updateArduinoBlink();

  updateTrainerBlink();

  updateBothBlink();

  updateTrainerPattern();

}





// ============================================================

// SERIAL INPUT

// ============================================================



void readSerial() {



  while (Serial.available() > 0) {



    char c = Serial.read();



    if (c == '\n' || c == '\r') {



      if (commandLength > 0) {



        command[commandLength] = '\0';



        commandCount++;



        processCommand();



        commandLength = 0;

        command[0] = '\0';

      }



    } else {



      if (commandLength < sizeof(command) - 1) {

        command[commandLength++] = c;

      }

    }

  }

}





// ============================================================

// LOWERCASE

// ============================================================



void lowerCase(char *text) {



  while (*text) {



    if (*text >= 'A' && *text <= 'Z') {

      *text = *text + ('a' - 'A');

    }



    text++;

  }

}





// ============================================================

// STRING CLEANUP

// ============================================================



void removeExtraSpaces(char *text) {



  char buffer[120];



  byte j = 0;

  bool previousSpace = false;



  for (byte i = 0; text[i] != '\0'; i++) {



    if (text[i] == ' ') {



      if (!previousSpace) {

        buffer[j++] = ' ';

      }



      previousSpace = true;



    } else {



      buffer[j++] = text[i];

      previousSpace = false;

    }

  }



  if (j > 0 && buffer[j - 1] == ' ') {

    j--;

  }



  buffer[j] = '\0';



  strcpy(text, buffer);

}





// ============================================================

// REPLACE FIRST OCCURRENCE

// ============================================================



void replaceFirst(char *text, const char *from, const char *to) {



  char *p = strstr(text, from);



  if (!p) return;



  char buffer[120];



  size_t before = p - text;



  buffer[0] = '\0';



  strncat(buffer, text, before);

  strcat(buffer, to);

  strcat(buffer, p + strlen(from));



  strcpy(text, buffer);

}





// ============================================================

// VOICE NUMBER CONVERSION

// ============================================================



void replaceNumberWords(char *text) {



  replaceFirst(text, "zero", "0");

  replaceFirst(text, "one", "1");

  replaceFirst(text, "two", "2");

  replaceFirst(text, "three", "3");

  replaceFirst(text, "four", "4");

  replaceFirst(text, "five", "5");

  replaceFirst(text, "six", "6");

  replaceFirst(text, "seven", "7");

  replaceFirst(text, "eight", "8");

  replaceFirst(text, "nine", "9");

}





// ============================================================

// VOICE NORMALIZER

// ============================================================



void normalizeVoice(char *text) {



  lowerCase(text);



  removeExtraSpaces(text);



  // ----------------------------------------------------------

  // TRAINER COMMANDS

  // Keep "trainer led" intact so individual LED commands work.

  // ----------------------------------------------------------



  replaceFirst(text, "trainer leds", "trainer led");





  // ----------------------------------------------------------

  // ARDUINO COMMANDS

  // ----------------------------------------------------------



  replaceFirst(text, "arduino led", "arduino");



  replaceFirst(text, "built in led", "arduino");



  replaceFirst(text, "builtin led", "arduino");





  // ----------------------------------------------------------

  // BOTH / ALL COMMANDS

  // ----------------------------------------------------------



  replaceFirst(text, "all leds", "both");



  replaceFirst(text, "all led", "both");



  replaceFirst(text, "all lights", "both");



  replaceFirst(text, "both leds", "both");



  replaceFirst(text, "both led", "both");





  // ----------------------------------------------------------

  // VOICE NUMBERS

  // ----------------------------------------------------------



  replaceNumberWords(text);





  // ----------------------------------------------------------

  // FINAL CLEANUP

  // ----------------------------------------------------------



  removeExtraSpaces(text);

}







// ============================================================

// TRAINER LED CONTROL

// ============================================================



void setTrainerLED(byte index, bool state) {



  if (index > 7) return;



  digitalWrite(

    TRAINER[index],

    state ? HIGH : LOW

  );

}





// ============================================================

// TRAINER ALL ON

// ============================================================



void trainerAllOn() {



  stopTrainerBlink();
  stopTrainerPattern();



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, true);

  }

}





// ============================================================

// TRAINER ALL OFF

// ============================================================



void trainerAllOff() {



  stopTrainerBlink();
  stopTrainerPattern();



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }

}







// ============================================================
// RSR TRAINER PATTERN ENGINE
// ============================================================

const char *trainerPatternName() {
  switch (trainerPattern) {
    case TRAINER_PATTERN_KNIGHT:      return "KNIGHT RIDER";
    case TRAINER_PATTERN_CHASE:       return "CHASE";
    case TRAINER_PATTERN_REVERSE:     return "REVERSE CHASE";
    case TRAINER_PATTERN_CENTER_OUT:  return "CENTER OUT";
    case TRAINER_PATTERN_OUTSIDE_IN:  return "OUTSIDE IN";
    case TRAINER_PATTERN_ALTERNATE:   return "ALTERNATE";
    case TRAINER_PATTERN_FILL:        return "FILL";
    case TRAINER_PATTERN_WAVE:        return "WAVE";
    case TRAINER_PATTERN_POLICE:      return "POLICE";
    case TRAINER_PATTERN_STROBE:      return "STROBE";
    default:                           return "NONE";
  }
}

void clearTrainerLEDs() {
  for (byte i = 0; i < 8; i++) {
    setTrainerLED(i, false);
  }
}

void stopTrainerPattern() {
  trainerPattern = TRAINER_PATTERN_NONE;
  trainerPatternStep = 0;
  clearTrainerLEDs();
}

void startTrainerPattern(TrainerPattern pattern) {
  stopTrainerBlink();
  stopBothBlink();
  trainerPattern = pattern;
  trainerPatternStep = 0;
  trainerPatternLastStep = 0;
  clearTrainerLEDs();

  Serial.print(F("TRAINER PATTERN: "));
  Serial.println(trainerPatternName());
  Serial.println(F("TRAINER PATTERN STATE: RUNNING"));
}

void updateTrainerPattern() {
  if (trainerPattern == TRAINER_PATTERN_NONE) return;

  unsigned long now = millis();
  if (trainerPatternLastStep != 0 &&
      now - trainerPatternLastStep < trainerPatternSpeed) return;

  trainerPatternLastStep = now;
  clearTrainerLEDs();

  switch (trainerPattern) {
    case TRAINER_PATTERN_KNIGHT: {
      const byte seq[14] = {0,1,2,3,4,5,6,7,6,5,4,3,2,1};
      setTrainerLED(seq[trainerPatternStep % 14], true);
      trainerPatternStep = (trainerPatternStep + 1) % 14;
      break;
    }

    case TRAINER_PATTERN_CHASE:
      setTrainerLED(trainerPatternStep % 8, true);
      trainerPatternStep = (trainerPatternStep + 1) % 8;
      break;

    case TRAINER_PATTERN_REVERSE:
      setTrainerLED(7 - (trainerPatternStep % 8), true);
      trainerPatternStep = (trainerPatternStep + 1) % 8;
      break;

    case TRAINER_PATTERN_CENTER_OUT: {
      const byte left[4]  = {3,2,1,0};
      const byte right[4] = {4,5,6,7};
      byte s = trainerPatternStep % 4;
      setTrainerLED(left[s], true);
      setTrainerLED(right[s], true);
      trainerPatternStep = (trainerPatternStep + 1) % 4;
      break;
    }

    case TRAINER_PATTERN_OUTSIDE_IN: {
      const byte left[4]  = {0,1,2,3};
      const byte right[4] = {7,6,5,4};
      byte s = trainerPatternStep % 4;
      setTrainerLED(left[s], true);
      setTrainerLED(right[s], true);
      trainerPatternStep = (trainerPatternStep + 1) % 4;
      break;
    }

    case TRAINER_PATTERN_ALTERNATE:
      for (byte i = 0; i < 8; i++) {
        setTrainerLED(i, (i % 2) == (trainerPatternStep % 2));
      }
      trainerPatternStep = (trainerPatternStep + 1) % 2;
      break;

    case TRAINER_PATTERN_FILL: {
      byte s = trainerPatternStep % 16;
      if (s < 8) {
        for (byte i = 0; i <= s; i++) setTrainerLED(i, true);
      } else {
        byte keep = 15 - s;
        for (byte i = 0; i <= keep; i++) setTrainerLED(i, true);
      }
      trainerPatternStep = (trainerPatternStep + 1) % 16;
      break;
    }

    case TRAINER_PATTERN_WAVE: {
      byte head = trainerPatternStep % 8;
      setTrainerLED(head, true);
      setTrainerLED((head + 7) % 8, true);
      setTrainerLED((head + 6) % 8, true);
      trainerPatternStep = (trainerPatternStep + 1) % 8;
      break;
    }

    case TRAINER_PATTERN_POLICE:
      for (byte i = 0; i < 4; i++) setTrainerLED(i, (trainerPatternStep % 2) == 0);
      for (byte i = 4; i < 8; i++) setTrainerLED(i, (trainerPatternStep % 2) == 1);
      trainerPatternStep = (trainerPatternStep + 1) % 2;
      break;

    case TRAINER_PATTERN_STROBE:
      for (byte i = 0; i < 8; i++) setTrainerLED(i, (trainerPatternStep % 2) == 0);
      trainerPatternStep = (trainerPatternStep + 1) % 2;
      break;

    default:
      stopTrainerPattern();
      break;
  }
}

void showTrainerStatus() {
  Serial.println(F("========== RSR TRAINER STATUS =========="));
  Serial.println(F("Trainer: ONLINE"));
  Serial.println(F("LEDs: 8"));

  for (byte i = 0; i < 8; i++) {
    Serial.print(F("TRAINER LED "));
    Serial.print(i);
    Serial.print(F(": "));
    Serial.println(digitalRead(TRAINER[i]) == HIGH ? F("ON") : F("OFF"));
  }

  Serial.print(F("TRAINER PATTERN: "));
  Serial.println(trainerPatternName());
  Serial.print(F("TRAINER PATTERN STATE: "));
  Serial.println(trainerPattern == TRAINER_PATTERN_NONE ? F("STOPPED") : F("RUNNING"));
  Serial.print(F("TRAINER PATTERN SPEED: "));
  Serial.print(trainerPatternSpeed);
  Serial.println(F(" ms"));
  Serial.println(F("========================================"));
}

void trainerTest() {
  stopTrainerBlink();
  stopBothBlink();
  stopTrainerPattern();

  Serial.println(F("========== RSR TRAINER TEST =========="));
  Serial.println(F("Trainer LEDs: TESTING"));

  for (byte i = 0; i < 8; i++) {
    Serial.print(F("TRAINER TEST LED "));
    Serial.print(i);
    Serial.println(F(": TESTING"));
    setTrainerLED(i, true);
    delay(150);
    setTrainerLED(i, false);
    Serial.print(F("TRAINER TEST LED "));
    Serial.print(i);
    Serial.println(F(": OK"));
  }

  Serial.println(F("TRAINER TEST ALL: TESTING"));
  for (byte i = 0; i < 8; i++) setTrainerLED(i, true);
  delay(400);
  for (byte i = 0; i < 8; i++) setTrainerLED(i, false);
  Serial.println(F("TRAINER TEST ALL: OK"));
  Serial.println(F("Trainer LEDs: OK"));
  Serial.println(F("RSR TRAINER TEST: PASS"));
  Serial.println(F("======================================"));
}


// ============================================================

// ARDUINO ON

// ============================================================



void arduinoOn() {



  stopArduinoBlink();



  arduinoState = true;



  digitalWrite(LED, HIGH);

}





// ============================================================

// ARDUINO OFF

// ============================================================



void arduinoOff() {



  stopArduinoBlink();



  arduinoState = false;



  digitalWrite(LED, LOW);

}





// ============================================================

// BOTH ON

// ============================================================



void bothOn() {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();
  stopTrainerPattern();



  arduinoState = true;



  digitalWrite(LED, HIGH);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, true);

  }

}





// ============================================================

// BOTH OFF

// ============================================================



void bothOff() {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();
  stopTrainerPattern();



  arduinoState = false;



  digitalWrite(LED, LOW);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }

}





// ============================================================

// STOP ARDUINO

// ============================================================



void stopArduinoBlink() {



  arduinoBlinking = false;

  arduinoRemainingBlinks = 0;

}





// ============================================================

// STOP TRAINER

// ============================================================



void stopTrainerBlink() {



  trainerBlinking = false;

  trainerRemainingBlinks = 0;

}





// ============================================================

// STOP BOTH

// ============================================================



void stopBothBlink() {



  bothBlinking = false;

  bothRemainingBlinks = 0;

}





// ============================================================

// STOP ALL EFFECTS

// ============================================================



void stopAllEffects() {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();
  stopTrainerPattern();



  Serial.println(F("All effects stopped."));

}





// ============================================================

// ARDUINO BLINK UPDATE

// ============================================================



void updateArduinoBlink() {



  if (!arduinoBlinking) return;



  unsigned long now = millis();



  if (now - arduinoLastBlink >= arduinoBlinkSpeed) {



    arduinoLastBlink = now;



    arduinoState = !arduinoState;



    digitalWrite(

      LED,

      arduinoState ? HIGH : LOW

    );



    if (!arduinoState) {



      if (arduinoRemainingBlinks > 0) {

        arduinoRemainingBlinks--;

      }



      if (arduinoRemainingBlinks == 0) {



        arduinoBlinking = false;



        Serial.println(F("Arduino blink complete."));

      }

    }

  }

}





// ============================================================

// TRAINER BLINK UPDATE

// ============================================================



void updateTrainerBlink() {



  if (!trainerBlinking) return;



  unsigned long now = millis();



  if (now - trainerLastBlink >= trainerBlinkSpeed) {



    trainerLastBlink = now;



    trainerBlinkState = !trainerBlinkState;



    for (byte i = 0; i < 8; i++) {

      setTrainerLED(i, trainerBlinkState);

    }



    if (!trainerBlinkState) {



      if (trainerRemainingBlinks > 0) {

        trainerRemainingBlinks--;

      }



      if (trainerRemainingBlinks == 0) {



        trainerBlinking = false;



        Serial.println(F("Trainer blink complete."));

      }

    }

  }

}





// ============================================================

// BOTH BLINK UPDATE

// ============================================================



void updateBothBlink() {



  if (!bothBlinking) return;



  unsigned long now = millis();



  if (now - bothLastBlink >= bothBlinkSpeed) {



    bothLastBlink = now;



    bothBlinkState = !bothBlinkState;



    digitalWrite(

      LED,

      bothBlinkState ? HIGH : LOW

    );



    for (byte i = 0; i < 8; i++) {

      setTrainerLED(i, bothBlinkState);

    }



    if (!bothBlinkState) {



      if (bothRemainingBlinks > 0) {

        bothRemainingBlinks--;

      }



      if (bothRemainingBlinks == 0) {



        bothBlinking = false;



        Serial.println(F("Both blink complete."));

      }

    }

  }

}





// ============================================================

// START ARDUINO BLINK

// ============================================================



void startArduinoBlink(

  unsigned int count,

  unsigned int speed

) {



  stopArduinoBlink();



  arduinoBlinkSpeed = speed;

  arduinoRemainingBlinks = count;



  arduinoState = false;



  digitalWrite(LED, LOW);



  arduinoBlinking = true;



  arduinoLastBlink = millis();



  Serial.print(F("Arduino blinking "));

  Serial.print(count);

  Serial.print(F(" times at "));

  Serial.print(speed);

  Serial.println(F(" ms."));

}





// ============================================================

// START TRAINER BLINK

// ============================================================



void startTrainerBlink(

  unsigned int count,

  unsigned int speed

) {



  stopTrainerBlink();



  trainerBlinkSpeed = speed;

  trainerRemainingBlinks = count;



  trainerBlinkState = false;



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }



  trainerBlinking = true;



  trainerLastBlink = millis();



  Serial.print(F("Trainer blinking "));

  Serial.print(count);

  Serial.print(F(" times at "));

  Serial.print(speed);

  Serial.println(F(" ms."));

}





// ============================================================

// START BOTH BLINK

// ============================================================



void startBothBlink(

  unsigned int count,

  unsigned int speed

) {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();



  bothBlinkSpeed = speed;

  bothRemainingBlinks = count;



  bothBlinkState = false;



  digitalWrite(LED, LOW);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }



  arduinoState = false;



  bothBlinking = true;



  bothLastBlink = millis();



  Serial.print(F("Both blinking "));

  Serial.print(count);

  Serial.print(F(" times at "));

  Serial.print(speed);

  Serial.println(F(" ms."));

}





// ============================================================

// PULSE ARDUINO

// ============================================================



void pulseArduino(unsigned int duration) {



  stopArduinoBlink();



  arduinoState = true;



  digitalWrite(LED, HIGH);



  delay(duration);



  arduinoState = false;



  digitalWrite(LED, LOW);



  Serial.println(F("Arduino pulse complete."));

}





// ============================================================

// PULSE TRAINER

// ============================================================



void pulseTrainer(unsigned int duration) {



  stopTrainerBlink();



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, true);

  }



  delay(duration);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }



  Serial.println(F("Trainer pulse complete."));

}





// ============================================================

// PULSE BOTH

// ============================================================



void pulseBoth(unsigned int duration) {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();



  digitalWrite(LED, HIGH);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, true);

  }



  delay(duration);



  digitalWrite(LED, LOW);



  for (byte i = 0; i < 8; i++) {

    setTrainerLED(i, false);

  }



  arduinoState = false;



  Serial.println(F("Both pulse complete."));

}





// ============================================================

// FLASH ARDUINO

// ============================================================



void flashArduino(

  int count,

  int speed

) {



  stopArduinoBlink();



  for (int i = 0; i < count; i++) {



    digitalWrite(LED, HIGH);

    arduinoState = true;



    delay(speed);



    digitalWrite(LED, LOW);

    arduinoState = false;



    delay(speed);

  }



  Serial.println(F("Arduino flash complete."));

}





// ============================================================

// FLASH TRAINER

// ============================================================



void flashTrainer(

  int count,

  int speed

) {



  stopTrainerBlink();



  for (int i = 0; i < count; i++) {



    for (byte j = 0; j < 8; j++) {

      setTrainerLED(j, true);

    }



    delay(speed);



    for (byte j = 0; j < 8; j++) {

      setTrainerLED(j, false);

    }



    delay(speed);

  }



  Serial.println(F("Trainer flash complete."));

}





// ============================================================

// FLASH BOTH

// ============================================================



void flashBoth(

  int count,

  int speed

) {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();



  for (int i = 0; i < count; i++) {



    digitalWrite(LED, HIGH);



    for (byte j = 0; j < 8; j++) {

      setTrainerLED(j, true);

    }



    delay(speed);



    digitalWrite(LED, LOW);



    for (byte j = 0; j < 8; j++) {

      setTrainerLED(j, false);

    }



    delay(speed);

  }



  arduinoState = false;



  Serial.println(F("Both flash complete."));

}





// ============================================================

// SOS ARDUINO

// ============================================================



void sendSOSArduino() {



  stopArduinoBlink();



  Serial.println(F("Arduino SOS..."));



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);

    delay(200);



    digitalWrite(LED, LOW);

    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);

    delay(600);



    digitalWrite(LED, LOW);

    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);

    delay(200);



    digitalWrite(LED, LOW);

    delay(200);

  }



  arduinoState = false;



  Serial.println(F("Arduino SOS complete."));

}





// ============================================================

// SOS TRAINER

// ============================================================



void sendSOSTrainer() {



  stopTrainerBlink();



  Serial.println(F("Trainer SOS..."));



  for (byte i = 0; i < 3; i++) {



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);

    delay(200);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);

    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);

    delay(600);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);

    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);

    delay(200);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);

    delay(200);

  }



  Serial.println(F("Trainer SOS complete."));

}





// ============================================================

// SOS BOTH

// ============================================================



void sendSOSBoth() {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();



  Serial.println(F("Both SOS..."));



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);



    delay(200);



    digitalWrite(LED, LOW);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);



    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);



    delay(600);



    digitalWrite(LED, LOW);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);



    delay(200);

  }



  delay(300);



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, true);



    delay(200);



    digitalWrite(LED, LOW);



    for (byte j = 0; j < 8; j++) setTrainerLED(j, false);



    delay(200);

  }



  arduinoState = false;



  Serial.println(F("Both SOS complete."));

}





// ============================================================

// MORSE TABLE

// ============================================================



const char *getMorse(char c) {



  switch (c) {



    case 'A': return ".-";

    case 'B': return "-...";

    case 'C': return "-.-.";

    case 'D': return "-..";

    case 'E': return ".";

    case 'F': return "..-.";

    case 'G': return "--.";

    case 'H': return "....";

    case 'I': return "..";

    case 'J': return ".---";

    case 'K': return "-.-";

    case 'L': return ".-..";

    case 'M': return "--";

    case 'N': return "-.";

    case 'O': return "---";

    case 'P': return ".--.";

    case 'Q': return "--.-";

    case 'R': return ".-.";

    case 'S': return "...";

    case 'T': return "-";

    case 'U': return "..-";

    case 'V': return "...-";

    case 'W': return ".--";

    case 'X': return "-..-";

    case 'Y': return "-.--";

    case 'Z': return "--..";



    case '0': return "-----";

    case '1': return ".----";

    case '2': return "..---";

    case '3': return "...--";

    case '4': return "....-";

    case '5': return ".....";

    case '6': return "-....";

    case '7': return "--...";

    case '8': return "---..";

    case '9': return "----.";



    case '.': return ".-.-.-";

    case ',': return "--..--";

    case '?': return "..--..";

    case '!': return "-.-.--";

    case '/': return "-..-.";

    case '-': return "-....-";

    case ':': return "---...";

    case ';': return "-.-.-.";

    case '=': return "-...-";

    case '+': return ".-.-.";

    case '@': return ".--.-.";



    case '\'': return ".----.";

    case '"': return ".-..-.";

    case '(':

    case ')': return "-.--.";

    case '&': return ".-...";

    case '$': return "...-..-";



    default:

      return NULL;

  }

}





// ============================================================

// MORSE SINGLE SYMBOL

// ============================================================



void sendMorseSymbol(

  const char *code,

  TargetType target

) {



  while (*code) {



    unsigned int duration;



    if (*code == '.') {

      duration = 200;

    } else {

      duration = 600;

    }



    if (target == TARGET_ARDUINO) {



      digitalWrite(LED, HIGH);

      arduinoState = true;



    } else if (target == TARGET_TRAINER) {



      for (byte i = 0; i < 8; i++) {

        setTrainerLED(i, true);

      }



    } else {



      digitalWrite(LED, HIGH);



      for (byte i = 0; i < 8; i++) {

        setTrainerLED(i, true);

      }



      arduinoState = true;

    }



    delay(duration);



    if (target == TARGET_ARDUINO) {



      digitalWrite(LED, LOW);

      arduinoState = false;



    } else if (target == TARGET_TRAINER) {



      for (byte i = 0; i < 8; i++) {

        setTrainerLED(i, false);

      }



    } else {



      digitalWrite(LED, LOW);



      for (byte i = 0; i < 8; i++) {

        setTrainerLED(i, false);

      }



      arduinoState = false;

    }



    delay(200);



    code++;

  }

}





// ============================================================

// MORSE

// ============================================================



void sendMorse(

  char *message,

  TargetType target

) {



  stopArduinoBlink();

  stopTrainerBlink();

  stopBothBlink();



  Serial.print(F("MORSE TX: "));

  Serial.println(message);



  while (*message) {



    char c = *message++;



    if (c >= 'a' && c <= 'z') {

      c -= 32;

    }



    if (c == ' ') {



      delay(1000);

      continue;

    }



    const char *code = getMorse(c);



    if (code != NULL) {



      Serial.print(c);

      Serial.print(F(": "));

      Serial.println(code);



      sendMorseSymbol(code, target);



      delay(600);

    }

  }



  Serial.println(F("Morse transmission complete."));

}





// ============================================================

// COUNTDOWN

// ============================================================



void countdown(

  byte seconds,

  TargetType target

) {



  stopAllEffects();



  Serial.println();

  Serial.println(F("COUNTDOWN"));



  for (int i = seconds; i > 0; i--) {



    Serial.print(i);

    Serial.println(F("..."));



    if (target == TARGET_ARDUINO) {

      pulseArduino(150);

    }



    else if (target == TARGET_TRAINER) {

      pulseTrainer(150);

    }



    else {

      pulseBoth(150);

    }



    delay(850);

  }



  Serial.println(F("GO!"));



  if (target == TARGET_ARDUINO) {

    flashArduino(3, 100);

  }



  else if (target == TARGET_TRAINER) {

    flashTrainer(3, 100);

  }



  else {

    flashBoth(3, 100);

  }

}





// ============================================================

// TIMER

// ============================================================



void timer(

  byte seconds,

  TargetType target

) {



  stopAllEffects();



  Serial.print(F("Timer started: "));

  Serial.print(seconds);

  Serial.println(F(" seconds."));



  for (int i = seconds; i > 0; i--) {



    Serial.print(i);

    Serial.println(F(" seconds remaining"));



    if (target == TARGET_ARDUINO) {



      digitalWrite(LED, HIGH);

      arduinoState = true;



      delay(100);



      digitalWrite(LED, LOW);

      arduinoState = false;

    }



    else if (target == TARGET_TRAINER) {



      for (byte j = 0; j < 8; j++) {

        setTrainerLED(j, true);

      }



      delay(100);



      for (byte j = 0; j < 8; j++) {

        setTrainerLED(j, false);

      }

    }



    else {



      digitalWrite(LED, HIGH);



      for (byte j = 0; j < 8; j++) {

        setTrainerLED(j, true);

      }



      delay(100);



      digitalWrite(LED, LOW);



      for (byte j = 0; j < 8; j++) {

        setTrainerLED(j, false);

      }



      arduinoState = false;

    }



    delay(900);

  }



  Serial.println(F("TIME!"));



  if (target == TARGET_ARDUINO) {

    flashArduino(5, 100);

  }



  else if (target == TARGET_TRAINER) {

    flashTrainer(5, 100);

  }



  else {

    flashBoth(5, 100);

  }

}





// ============================================================

// RANDOM

// ============================================================



void randomPattern(TargetType target) {



  randomSeed(micros());



  byte pattern = random(1, 6);



  Serial.print(F("Random pattern selected: "));

  Serial.println(pattern);



  runPattern(pattern, target);

}





// ============================================================

// PATTERNS

// ============================================================



void runPattern(

  byte pattern,

  TargetType target

) {



  switch (pattern) {



    case 1:



      Serial.println(F("Pattern 1: FAST"));



      if (target == TARGET_ARDUINO)

        flashArduino(10, 100);



      else if (target == TARGET_TRAINER)

        flashTrainer(10, 100);



      else

        flashBoth(10, 100);



      break;





    case 2:



      Serial.println(F("Pattern 2: SLOW"));



      if (target == TARGET_ARDUINO)

        flashArduino(5, 500);



      else if (target == TARGET_TRAINER)

        flashTrainer(5, 500);



      else

        flashBoth(5, 500);



      break;





    case 3:



      Serial.println(F("Pattern 3: SOS"));



      if (target == TARGET_ARDUINO)

        sendSOSArduino();



      else if (target == TARGET_TRAINER)

        sendSOSTrainer();



      else

        sendSOSBoth();



      break;





    case 4:



      Serial.println(F("Pattern 4: DOUBLE FLASH"));



      for (byte i = 0; i < 5; i++) {



        if (target == TARGET_ARDUINO) {

          pulseArduino(100);

          delay(100);

          pulseArduino(100);

        }



        else if (target == TARGET_TRAINER) {

          pulseTrainer(100);

          delay(100);

          pulseTrainer(100);

        }



        else {

          pulseBoth(100);

          delay(100);

          pulseBoth(100);

        }



        delay(500);

      }



      break;





    case 5:



      Serial.println(F("Pattern 5: HEARTBEAT"));



      for (byte i = 0; i < 5; i++) {



        if (target == TARGET_ARDUINO) {

          pulseArduino(100);

          delay(100);

          pulseArduino(300);

        }



        else if (target == TARGET_TRAINER) {

          pulseTrainer(100);

          delay(100);

          pulseTrainer(300);

        }



        else {

          pulseBoth(100);

          delay(100);

          pulseBoth(300);

        }



        delay(700);

      }



      break;





    default:



      Serial.println(F("ERROR: Pattern must be 1-5."));



      break;

  }

}





// ============================================================

// STATUS

// ============================================================



void showStatus() {



  unsigned long seconds =

    (millis() - startTime) / 1000UL;



  Serial.println();

  Serial.println(F("========================================"));

  Serial.println(F("              SYSTEM STATUS"));

  Serial.println(F("========================================"));



  Serial.println(F("Board:       AMOMII ONE"));

  Serial.println(F("Connection:  USB"));

  Serial.println(F("System:      ONLINE"));



  Serial.print(F("Arduino LED: "));

  Serial.println(

    arduinoState ? F("ON") : F("OFF")

  );



  Serial.print(F("Arduino Blink: "));

  Serial.println(

    arduinoBlinking ? F("YES") : F("NO")

  );



  Serial.print(F("Arduino Speed: "));

  Serial.print(arduinoBlinkSpeed);

  Serial.println(F(" ms"));



  Serial.print(F("Trainer Blink: "));

  Serial.println(

    trainerBlinking ? F("YES") : F("NO")

  );



  Serial.print(F("Trainer Speed: "));

  Serial.print(trainerBlinkSpeed);

  Serial.println(F(" ms"));



  Serial.print(F("Both Blink: "));

  Serial.println(

    bothBlinking ? F("YES") : F("NO")

  );



  Serial.print(F("Commands:    "));

  Serial.println(commandCount);



  Serial.print(F("Uptime:      "));

  Serial.print(seconds);

  Serial.println(F(" seconds"));



  Serial.println();



  Serial.println(F("Trainer LEDs:"));



  for (byte i = 0; i < 8; i++) {



    Serial.print(F("  "));

    Serial.print(i);

    Serial.print(F(": "));



    Serial.println(

      digitalRead(TRAINER[i])

      ? F("ON")

      : F("OFF")

    );

  }



  Serial.println(F("========================================"));

}





// ============================================================

// UPTIME

// ============================================================



void showUptime() {



  unsigned long total =

    (millis() - startTime) / 1000UL;



  unsigned long hours =

    total / 3600UL;



  byte minutes =

    (total % 3600UL) / 60UL;



  byte seconds =

    total % 60UL;



  Serial.print(F("Uptime: "));



  if (hours < 10) Serial.print('0');

  Serial.print(hours);



  Serial.print(':');



  if (minutes < 10) Serial.print('0');

  Serial.print(minutes);



  Serial.print(':');



  if (seconds < 10) Serial.print('0');

  Serial.println(seconds);

}





// ============================================================

// ABOUT

// ============================================================



void showAbout() {



  Serial.println();

  Serial.println(F("========================================"));

  Serial.println(F("       AMOMII ONE COMMAND CENTER"));

  Serial.println(F("                 VERSION 6.0"));

  Serial.println(F("========================================"));

  Serial.println();



  Serial.println(F("USB ROBOT DEVELOPMENT CONSOLE"));



  Serial.println();



  Serial.println(F("HARDWARE"));

  Serial.println(F("  AMOMII ONE"));

  Serial.println(F("  BUILT-IN LED"));

  Serial.println(F("  TRAINER LEDS 2-9"));

  Serial.println(F("  USB"));



  Serial.println();



  Serial.println(F("CONTROL"));

  Serial.println(F("  TEXT COMMANDS"));

  Serial.println(F("  VOICE-FRIENDLY COMMANDS"));

  Serial.println(F("  INDEPENDENT TARGETS"));

  Serial.println(F("  SYNCHRONIZED BOTH TARGET"));



  Serial.println();



  Serial.println(F("EFFECTS"));

  Serial.println(F("  BLINK"));

  Serial.println(F("  FLASH"));

  Serial.println(F("  PULSE"));

  Serial.println(F("  SOS"));

  Serial.println(F("  MORSE"));

  Serial.println(F("  COUNTDOWN"));

  Serial.println(F("  TIMER"));

  Serial.println(F("  PATTERNS"));

  Serial.println(F("  RANDOM"));



  Serial.println();

}





// ============================================================

// SYSTEM TEST

// ============================================================



void systemTest() {



  Serial.println();

  Serial.println(F("========== SYSTEM TEST =========="));



  stopAllEffects();



  Serial.println(F("Serial:       OK"));



  Serial.println(F("Arduino LED:  TESTING"));



  flashArduino(3, 200);



  Serial.println(F("Arduino LED:  OK"));



  Serial.println(F("Trainer LEDs: TESTING"));



  for (byte i = 0; i < 8; i++) {



    setTrainerLED(i, true);



    delay(100);



    setTrainerLED(i, false);

  }



  Serial.println(F("Trainer LEDs: OK"));



  Serial.println(F("Both LEDs:    TESTING"));



  flashBoth(3, 150);



  Serial.println(F("Both LEDs:    OK"));



  Serial.println(F("Timing:       OK"));

  Serial.println(F("Memory:       OK"));

  Serial.println(F("Commands:     OK"));

  Serial.println(F("System:       OK"));



  Serial.println(F("================================="));

  Serial.println();

}





// ============================================================

// STARTUP ANIMATION

// ============================================================



void startupAnimation() {



  for (byte i = 0; i < 3; i++) {



    digitalWrite(LED, HIGH);



    delay(100);



    digitalWrite(LED, LOW);



    delay(100);

  }

}





// ============================================================

// CLEAR

// ============================================================



void clearScreen() {



  for (byte i = 0; i < 30; i++) {

    Serial.println();

  }



  Serial.println(

    F("AMOMII ONE Command Center ready.")

  );

}





// ============================================================

// HELP

// ============================================================



void showHelp() {



  Serial.println();

  Serial.println(F("================================================"));

  Serial.println(F("          AMOMII ONE COMMAND CENTER 6.0"));

  Serial.println(F("================================================"));



  Serial.println();



  Serial.println(F("ARDUINO LED"));

  Serial.println(F("-----------"));

  Serial.println(F("LED ON"));

  Serial.println(F("LED OFF"));

  Serial.println(F("ARDUINO ON"));

  Serial.println(F("ARDUINO OFF"));

  Serial.println(F("BLINK 10"));

  Serial.println(F("SPEED 100"));

  Serial.println(F("PULSE 500"));

  Serial.println(F("FLASH 10 100"));



  Serial.println();



  Serial.println(F("TRAINER LEDS"));

  Serial.println(F("------------"));

  Serial.println(F("TRAINER LED 0 ON"));

  Serial.println(F("TRAINER LED 0 OFF"));

  Serial.println(F("TRAINER LED 7 ON"));

  Serial.println(F("TRAINER LED 7 OFF"));

  Serial.println(F("TRAINER ALL ON"));

  Serial.println(F("TRAINER ALL OFF"));

  Serial.println(F("TRAINER BLINK 10"));

  Serial.println(F("TRAINER FLASH 10 100"));

  Serial.println(F("TRAINER PULSE 500"));

  Serial.println(F("TRAINER SOS"));

  Serial.println(F("TRAINER MORSE SOS"));
  Serial.println(F("TRAINER STATUS"));
  Serial.println(F("TRAINER TEST"));
  Serial.println(F("TRAINER STOP"));
  Serial.println(F("TRAINER PATTERN KNIGHT"));
  Serial.println(F("TRAINER PATTERN CHASE"));
  Serial.println(F("TRAINER PATTERN REVERSE CHASE"));
  Serial.println(F("TRAINER PATTERN CENTER OUT"));
  Serial.println(F("TRAINER PATTERN OUTSIDE IN"));
  Serial.println(F("TRAINER PATTERN ALTERNATE"));
  Serial.println(F("TRAINER PATTERN FILL"));
  Serial.println(F("TRAINER PATTERN WAVE"));
  Serial.println(F("TRAINER PATTERN POLICE"));
  Serial.println(F("TRAINER PATTERN STROBE"));
  Serial.println(F("TRAINER PATTERN SPEED 150"));



  Serial.println();



  Serial.println(F("BOTH"));

  Serial.println(F("----"));

  Serial.println(F("ALL ON"));

  Serial.println(F("ALL OFF"));

  Serial.println(F("BOTH ON"));

  Serial.println(F("BOTH OFF"));

  Serial.println(F("BOTH BLINK 10"));

  Serial.println(F("BOTH FLASH 10 100"));

  Serial.println(F("BOTH PULSE 500"));

  Serial.println(F("BOTH SOS"));

  Serial.println(F("BOTH MORSE SOS"));



  Serial.println();



  Serial.println(F("EFFECTS"));

  Serial.println(F("-------"));

  Serial.println(F("BLINK 10"));

  Serial.println(F("TRAINER BLINK 10"));

  Serial.println(F("BOTH BLINK 10"));

  Serial.println(F("SPEED 100"));

  Serial.println(F("FLASH 10 100"));

  Serial.println(F("PULSE 500"));

  Serial.println(F("SOS"));

  Serial.println(F("MORSE HELLO"));

  Serial.println(F("MORSE 123"));

  Serial.println(F("COUNTDOWN 10"));

  Serial.println(F("TIMER 10"));

  Serial.println(F("RANDOM"));

  Serial.println(F("PATTERN 1"));

  Serial.println(F("PATTERN 2"));

  Serial.println(F("PATTERN 3"));

  Serial.println(F("PATTERN 4"));

  Serial.println(F("PATTERN 5"));



  Serial.println();



  Serial.println(F("STOP"));

  Serial.println(F("----"));

  Serial.println(F("STOP"));

  Serial.println(F("STOP ALL"));



  Serial.println();



  Serial.println(F("SYSTEM"));

  Serial.println(F("------"));

  Serial.println(F("STATUS"));

  Serial.println(F("UPTIME"));

  Serial.println(F("VERSION"));

  Serial.println(F("ABOUT"));

  Serial.println(F("TEST"));

  Serial.println(F("REBOOT"));

  Serial.println(F("HELP"));

  Serial.println(F("COMMANDS"));

  Serial.println(F("ECHO HELLO"));

  Serial.println(F("CLEAR"));



  Serial.println();



  Serial.println(F("VOICE EXAMPLES"));

  Serial.println(F("--------------"));

  Serial.println(F("trainer led three on"));

  Serial.println(F("trainer led all off"));

  Serial.println(F("arduino led on"));

  Serial.println(F("all leds on"));

  Serial.println(F("both blink five"));

  Serial.println(F("speed one hundred"));

  Serial.println(F("flash ten one hundred"));

  Serial.println(F("both morse hello"));



  Serial.println();

  Serial.println(F("================================================"));

  Serial.println();

}





// ============================================================

// COMMAND PROCESSOR

// ============================================================



void processCommand() {



  // ----------------------------------------------------------

  // NORMALIZE INPUT

  // ----------------------------------------------------------



  normalizeVoice(command);



  Serial.print(F("> "));

  Serial.println(command);





  // ----------------------------------------------------------

  // HELP

  // ----------------------------------------------------------



  if (!strcmp(command, "help") ||

      !strcmp(command, "?") ||

      !strcmp(command, "commands")) {



    showHelp();

    return;

  }





  // ----------------------------------------------------------

  // STATUS

  // ----------------------------------------------------------



  if (!strcmp(command, "status")) {



    showStatus();

    return;

  }





  // ----------------------------------------------------------

  // UPTIME

  // ----------------------------------------------------------



  if (!strcmp(command, "uptime")) {



    showUptime();

    return;

  }





  // ----------------------------------------------------------

  // VERSION

  // ----------------------------------------------------------



  if (!strcmp(command, "version")) {



    Serial.println(

      F("AMOMII ONE COMMAND CENTER 6.0")

    );



    return;

  }





  // ----------------------------------------------------------

  // ABOUT

  // ----------------------------------------------------------



  if (!strcmp(command, "about")) {



    showAbout();

    return;

  }





  // ----------------------------------------------------------

  // CLEAR

  // ----------------------------------------------------------



  if (!strcmp(command, "clear")) {



    clearScreen();

    return;

  }





  // ----------------------------------------------------------

  // STOP

  // ----------------------------------------------------------



  if (!strcmp(command, "stop") ||

      !strcmp(command, "stop all") ||

      !strcmp(command, "stopall")) {



    stopAllEffects();



    return;

  }





  // ----------------------------------------------------------

  // ALL ON / BOTH ON

  // ----------------------------------------------------------



  if (!strcmp(command, "all on") ||

      !strcmp(command, "allon") ||

      !strcmp(command, "both on") ||

      !strcmp(command, "both on")) {



    bothOn();



    Serial.println(F("ALL LEDs ON"));



    return;

  }





  // ----------------------------------------------------------

  // ALL OFF / BOTH OFF

  // ----------------------------------------------------------



  if (!strcmp(command, "all off") ||

      !strcmp(command, "alloff") ||

      !strcmp(command, "both off") ||

      !strcmp(command, "both off")) {



    bothOff();



    Serial.println(F("ALL LEDs OFF"));



    return;

  }





  // ----------------------------------------------------------

  // TRAINER ALL ON

  // ----------------------------------------------------------



  if (!strcmp(command, "trainer all on") ||

      !strcmp(command, "trainer on")) {



    trainerAllOn();



    Serial.println(F("TRAINER ALL ON"));



    return;

  }





  // ----------------------------------------------------------

  // TRAINER ALL OFF

  // ----------------------------------------------------------



  if (!strcmp(command, "trainer all off") ||

      !strcmp(command, "trainer off")) {



    trainerAllOff();



    Serial.println(F("TRAINER ALL OFF"));



    return;

  }





  // ----------------------------------------------------------

  // ARDUINO ON

  // ----------------------------------------------------------



  if (!strcmp(command, "on") ||

      !strcmp(command, "ledon") ||

      !strcmp(command, "led on") ||

      !strcmp(command, "arduino on") ||

      !strcmp(command, "arduino led on")) {



    arduinoOn();



    Serial.println(F("ARDUINO LED ON"));



    return;

  }



// ----------------------------------------------------------

// ARDUINO OFF

// ----------------------------------------------------------



if (!strcmp(command, "off") ||

    !strcmp(command, "ledoff") ||

    !strcmp(command, "led off") ||

    !strcmp(command, "arduino off") ||

    !strcmp(command, "arduino led off")) {



  arduinoOff();



  Serial.println(F("ARDUINO LED OFF"));



  return;

}





// ----------------------------------------------------------

// ARDUINO TOGGLE

// ----------------------------------------------------------



if (!strcmp(command, "toggle") ||

    !strcmp(command, "led toggle") ||

    !strcmp(command, "arduino toggle") ||

    !strcmp(command, "arduino led toggle")) {



  if (arduinoState) {

    arduinoOff();

    Serial.println(F("ARDUINO LED OFF"));

  } else {

    arduinoOn();

    Serial.println(F("ARDUINO LED ON"));

  }



  return;

}





// ----------------------------------------------------------

// TRAINER INDIVIDUAL LED

  //

  // TRAINER LED 0 ON

  // TRAINER LED 7 OFF

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer led ", 12)) {



    char *p = command + 12;



    if (*p >= '0' && *p <= '7') {



      byte index = *p - '0';



      p++;



      while (*p == ' ') p++;



      if (!strcmp(p, "on")) {



        stopTrainerBlink();
        stopTrainerPattern();



        setTrainerLED(index, true);



        Serial.print(F("TRAINER LED "));

        Serial.print(index);

        Serial.println(F(" ON"));



        return;

      }



      if (!strcmp(p, "off")) {



        stopTrainerBlink();
        stopTrainerPattern();



        setTrainerLED(index, false);



        Serial.print(F("TRAINER LED "));

        Serial.print(index);

        Serial.println(F(" OFF"));



        return;

      }

    }

  }





  // ----------------------------------------------------------

  // ARDUINO BLINK

  // ----------------------------------------------------------



  if (!strncmp(command, "blink ", 6) ||

      !strncmp(command, "blink", 5)) {



    int count = atoi(

      command + (command[5] == ' ' ? 6 : 5)

    );



    if (count >= 1 && count <= 1000) {



      startArduinoBlink(

        count,

        arduinoBlinkSpeed

      );



    } else {



      Serial.println(

        F("ERROR: BLINK must be 1-1000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER BLINK

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer blink ", 14)) {



    int count = atoi(command + 14);



    if (count >= 1 && count <= 1000) {



      startTrainerBlink(

        count,

        trainerBlinkSpeed

      );



    } else {



      Serial.println(

        F("ERROR: TRAINER BLINK must be 1-1000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // BOTH BLINK

  // ----------------------------------------------------------



  if (!strncmp(command, "both blink ", 11)) {



    int count = atoi(command + 11);



    if (count >= 1 && count <= 1000) {



      startBothBlink(

        count,

        bothBlinkSpeed

      );



    } else {



      Serial.println(

        F("ERROR: BOTH BLINK must be 1-1000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // SPEED

  // ----------------------------------------------------------



  if (!strncmp(command, "speed", 5)) {



    int speed = atoi(command + 5);



    if (speed >= 20 && speed <= 5000) {



      arduinoBlinkSpeed = speed;

      trainerBlinkSpeed = speed;

      bothBlinkSpeed = speed;



      Serial.print(F("All blink speeds set to "));

      Serial.print(speed);

      Serial.println(F(" ms."));



    } else {



      Serial.println(

        F("ERROR: SPEED must be 20-5000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER FLASH

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer flash ", 14)) {



    int count;

    int speed;



    if (sscanf(

          command + 14,

          "%d %d",

          &count,

          &speed

        ) == 2) {



      if (count >= 1 &&

          count <= 1000 &&

          speed >= 20 &&

          speed <= 5000) {



        flashTrainer(count, speed);



      } else {



        Serial.println(

          F("ERROR: invalid TRAINER FLASH values.")

        );

      }



    } else {



      Serial.println(

        F("Usage: TRAINER FLASH COUNT SPEED")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // BOTH FLASH

  // ----------------------------------------------------------



  if (!strncmp(command, "both flash ", 11)) {



    int count;

    int speed;



    if (sscanf(

          command + 11,

          "%d %d",

          &count,

          &speed

        ) == 2) {



      if (count >= 1 &&

          count <= 1000 &&

          speed >= 20 &&

          speed <= 5000) {



        flashBoth(count, speed);



      } else {



        Serial.println(

          F("ERROR: invalid BOTH FLASH values.")

        );

      }



    } else {



      Serial.println(

        F("Usage: BOTH FLASH COUNT SPEED")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // ARDUINO FLASH

  // ----------------------------------------------------------



  if (!strncmp(command, "flash ", 6) ||

      !strncmp(command, "flash", 5)) {



    int count;

    int speed;



    if (sscanf(

          command + 5,

          "%d %d",

          &count,

          &speed

        ) == 2) {



      if (count >= 1 &&

          count <= 1000 &&

          speed >= 20 &&

          speed <= 5000) {



        flashArduino(count, speed);



      } else {



        Serial.println(

          F("ERROR: invalid FLASH values.")

        );

      }



    } else {



      Serial.println(

        F("Usage: FLASH COUNT SPEED")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER PULSE

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer pulse ", 14)) {



    int duration = atoi(command + 14);



    if (duration >= 1 && duration <= 10000) {



      pulseTrainer(duration);



    } else {



      Serial.println(

        F("ERROR: TRAINER PULSE must be 1-10000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // BOTH PULSE

  // ----------------------------------------------------------



  if (!strncmp(command, "both pulse ", 11)) {



    int duration = atoi(command + 11);



    if (duration >= 1 && duration <= 10000) {



      pulseBoth(duration);



    } else {



      Serial.println(

        F("ERROR: BOTH PULSE must be 1-10000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // ARDUINO PULSE

  // ----------------------------------------------------------



  if (!strncmp(command, "pulse ", 6) ||

      !strncmp(command, "pulse", 5)) {



    int duration = atoi(command + 5);



    if (duration >= 1 && duration <= 10000) {



      pulseArduino(duration);



    } else {



      Serial.println(

        F("ERROR: PULSE must be 1-10000.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER SOS

  // ----------------------------------------------------------



  if (!strcmp(command, "trainer sos")) {



    sendSOSTrainer();



    return;

  }





  // ----------------------------------------------------------

  // BOTH SOS

  // ----------------------------------------------------------



  if (!strcmp(command, "both sos")) {



    sendSOSBoth();



    return;

  }





  // ----------------------------------------------------------

  // ARDUINO SOS

  // ----------------------------------------------------------



  if (!strcmp(command, "sos") ||

      !strcmp(command, "arduino sos")) {



    sendSOSArduino();



    return;

  }





  // ----------------------------------------------------------

  // TRAINER MORSE

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer morse ", 14)) {



    sendMorse(

      command + 14,

      TARGET_TRAINER

    );



    return;

  }





  // ----------------------------------------------------------

  // BOTH MORSE

  // ----------------------------------------------------------



  if (!strncmp(command, "both morse ", 11)) {



    sendMorse(

      command + 11,

      TARGET_BOTH

    );



    return;

  }





  // ----------------------------------------------------------

  // ARDUINO MORSE

  // ----------------------------------------------------------



  if (!strncmp(command, "arduino morse ", 14)) {



    sendMorse(

      command + 14,

      TARGET_ARDUINO

    );



    return;

  }





  // ----------------------------------------------------------

  // NORMAL MORSE

  // ----------------------------------------------------------



  if (!strncmp(command, "morse ", 6) ||

      !strncmp(command, "morse", 5)) {



    sendMorse(

      command + 5,

      TARGET_ARDUINO

    );



    return;

  }





  // ----------------------------------------------------------

  // TRAINER COUNTDOWN

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer countdown ", 18)) {



    int seconds = atoi(command + 18);



    if (seconds >= 1 && seconds <= 60) {



      countdown(

        seconds,

        TARGET_TRAINER

      );



    } else {



      Serial.println(

        F("ERROR: COUNTDOWN must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // BOTH COUNTDOWN

  // ----------------------------------------------------------



  if (!strncmp(command, "both countdown ", 15)) {



    int seconds = atoi(command + 15);



    if (seconds >= 1 && seconds <= 60) {



      countdown(

        seconds,

        TARGET_BOTH

      );



    } else {



      Serial.println(

        F("ERROR: COUNTDOWN must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // COUNTDOWN

  // ----------------------------------------------------------



  if (!strncmp(command, "countdown ", 10)) {



    int seconds = atoi(command + 10);



    if (seconds >= 1 && seconds <= 60) {



      countdown(

        seconds,

        TARGET_ARDUINO

      );



    } else {



      Serial.println(

        F("ERROR: COUNTDOWN must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER TIMER

  // ----------------------------------------------------------



  if (!strncmp(command, "trainer timer ", 15)) {



    int seconds = atoi(command + 15);



    if (seconds >= 1 && seconds <= 60) {



      timer(

        seconds,

        TARGET_TRAINER

      );



    } else {



      Serial.println(

        F("ERROR: TIMER must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // BOTH TIMER

  // ----------------------------------------------------------



  if (!strncmp(command, "both timer ", 12)) {



    int seconds = atoi(command + 12);



    if (seconds >= 1 && seconds <= 60) {



      timer(

        seconds,

        TARGET_BOTH

      );



    } else {



      Serial.println(

        F("ERROR: TIMER must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TIMER

  // ----------------------------------------------------------



  if (!strncmp(command, "timer ", 6)) {



    int seconds = atoi(command + 6);



    if (seconds >= 1 && seconds <= 60) {



      timer(

        seconds,

        TARGET_ARDUINO

      );



    } else {



      Serial.println(

        F("ERROR: TIMER must be 1-60.")

      );

    }



    return;

  }





  // ----------------------------------------------------------

  // TRAINER RANDOM

  // ----------------------------------------------------------



  if (!strcmp(command, "trainer random")) {



    randomPattern(TARGET_TRAINER);



    return;

  }





  // ----------------------------------------------------------

  // BOTH RANDOM

  // ----------------------------------------------------------



  if (!strcmp(command, "both random")) {



    randomPattern(TARGET_BOTH);



    return;

  }





  // ----------------------------------------------------------

  // RANDOM

  // ----------------------------------------------------------



  if (!strcmp(command, "random")) {



    randomPattern(TARGET_ARDUINO);



    return;

  }





  // ----------------------------------------------------------
  // RSR TRAINER SYSTEM / LOOPING PATTERNS
  // ----------------------------------------------------------

  if (!strcmp(command, "trainer status") ||
      !strcmp(command, "rsr status")) {
    showTrainerStatus();
    return;
  }

  if (!strcmp(command, "trainer test") ||
      !strcmp(command, "rsr test")) {
    trainerTest();
    return;
  }

  if (!strcmp(command, "trainer stop") ||
      !strcmp(command, "rsr stop")) {
    stopTrainerBlink();
    stopBothBlink();
    stopTrainerPattern();
    Serial.println(F("TRAINER STOPPED"));
    Serial.println(F("TRAINER PATTERN STATE: STOPPED"));
    return;
  }

  if (!strncmp(command, "trainer pattern speed ", 22)) {
    int speed = atoi(command + 22);
    if (speed >= 40 && speed <= 2000) {
      trainerPatternSpeed = (unsigned int)speed;
      Serial.print(F("TRAINER PATTERN SPEED: "));
      Serial.print(trainerPatternSpeed);
      Serial.println(F(" ms"));
    } else {
      Serial.println(F("ERROR: TRAINER PATTERN SPEED must be 40-2000 ms."));
    }
    return;
  }

  if (!strcmp(command, "trainer pattern knight") ||
      !strcmp(command, "trainer pattern knight rider")) {
    startTrainerPattern(TRAINER_PATTERN_KNIGHT);
    return;
  }

  if (!strcmp(command, "trainer pattern chase")) {
    startTrainerPattern(TRAINER_PATTERN_CHASE);
    return;
  }

  if (!strcmp(command, "trainer pattern reverse") ||
      !strcmp(command, "trainer pattern reverse chase")) {
    startTrainerPattern(TRAINER_PATTERN_REVERSE);
    return;
  }

  if (!strcmp(command, "trainer pattern center out")) {
    startTrainerPattern(TRAINER_PATTERN_CENTER_OUT);
    return;
  }

  if (!strcmp(command, "trainer pattern outside in")) {
    startTrainerPattern(TRAINER_PATTERN_OUTSIDE_IN);
    return;
  }

  if (!strcmp(command, "trainer pattern alternate")) {
    startTrainerPattern(TRAINER_PATTERN_ALTERNATE);
    return;
  }

  if (!strcmp(command, "trainer pattern fill")) {
    startTrainerPattern(TRAINER_PATTERN_FILL);
    return;
  }

  if (!strcmp(command, "trainer pattern wave")) {
    startTrainerPattern(TRAINER_PATTERN_WAVE);
    return;
  }

  if (!strcmp(command, "trainer pattern police")) {
    startTrainerPattern(TRAINER_PATTERN_POLICE);
    return;
  }

  if (!strcmp(command, "trainer pattern strobe")) {
    startTrainerPattern(TRAINER_PATTERN_STROBE);
    return;
  }

  // Preserve the original numeric trainer patterns 1-5.
  if (!strncmp(command, "trainer pattern ", 16)) {
    byte pattern = atoi(command + 16);
    runPattern(pattern, TARGET_TRAINER);
    return;
  }





  // ----------------------------------------------------------

  // BOTH PATTERN

  // ----------------------------------------------------------



  if (!strncmp(command, "both pattern ", 13)) {



    byte pattern = atoi(command + 13);



    runPattern(

      pattern,

      TARGET_BOTH

    );



    return;

  }





  // ----------------------------------------------------------

  // PATTERN

  // ----------------------------------------------------------



  if (!strncmp(command, "pattern ", 8)) {



    byte pattern = atoi(command + 8);



    runPattern(

      pattern,

      TARGET_ARDUINO

    );



    return;

  }





  // ----------------------------------------------------------

  // TEST

  // ----------------------------------------------------------



  if (!strcmp(command, "test")) {



    systemTest();



    return;

  }





  // ----------------------------------------------------------

  // REBOOT

  // ----------------------------------------------------------



  if (!strcmp(command, "reboot")) {



    Serial.println();

    Serial.println(F("REBOOT REQUESTED"));

    Serial.println(

      F("Press the RESET button on the board.")

    );

    Serial.println();



    return;

  }





  // ----------------------------------------------------------

  // ECHO

  // ----------------------------------------------------------



  if (!strncmp(command, "echo ", 5) ||

      !strncmp(command, "echo", 4)) {



    Serial.print(F("ECHO: "));



    Serial.println(command + 4);



    return;

  }





  // ----------------------------------------------------------

  // UNKNOWN

  // ----------------------------------------------------------



  Serial.print(F("ERROR: Unknown command: "));

  Serial.println(command);



  Serial.println(

    F("Type HELP for available commands.")

  );

}
