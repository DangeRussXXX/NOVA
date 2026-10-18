
/* ============================================================
   NOVA — AMOMII ONE
   Vertical Accordion Interface

   Preserves:
   - Existing hardware command handlers
   - NOVA Cloud Relay commands
   - Board status synchronization
   - Pin mapper initialization and rendering
   - Existing floating-window integration

   Removes:
   - Legacy BOARD / PIN MAP tab navigation
   ============================================================ */

(function () {
  "use strict";

  let loading = null;
  let hardwareSyncTimer = null;

  const $ = (id) => document.getElementById(id);

  /* ==========================================================
     PIN MAP RENDERING
     ========================================================== */

  function renderPinMap() {
    if (
      window.novaAMOMIIPinmap &&
      typeof window.novaAMOMIIPinmap.render === "function"
    ) {
      window.novaAMOMIIPinmap.render();
    }
  }

  function schedulePinMapRender() {
    requestAnimationFrame(function () {
      requestAnimationFrame(renderPinMap);
    });
  }

  /* ==========================================================
     ACCORDION PANELS
     ========================================================== */

  function getPanels() {
    const root = $("amomiiTwin");

    if (!root) {
      return [];
    }

    return Array.from(
      root.querySelectorAll(".am-section")
    );
  }

  function setAllPanels(open) {
    getPanels().forEach(function (panel) {
      panel.open = open;
    });

    if (open) {
      schedulePinMapRender();
    }
  }

  function resetPanels() {
    getPanels().forEach(function (panel) { panel.open = false; });
    const board = $("amBoardControls");
    const simulator = $("amBoardSimulator");
    if (board) board.open = true;
    if (simulator) simulator.open = true;
    schedulePinMapRender();
  }

  function initializeAccordion() {
    const root = $("amomiiTwin");

    if (!root) {
      return;
    }

    const showButton = $("amShowPanels");
    const hideButton = $("amHidePanels");

    if (showButton) {
      showButton.onclick = function () {
        setAllPanels(true);
      };
    }

    if (hideButton) {
      hideButton.onclick = function () {
        setAllPanels(false);
      };
    }

    root.querySelectorAll(".am-section").forEach(
      function (panel) {
        panel.addEventListener("toggle", function () {
          if (
            panel.open &&
            panel.querySelector("#amPhotoWrap")
          ) {
            schedulePinMapRender();
          }
        });
      }
    );

    resetPanels();
  }

  /* ==========================================================
     HARDWARE STATUS SYNCHRONIZATION
     ========================================================== */

  function syncHardware() {
    const root = $("amomiiTwin");

    if (!root || root.hidden) {
      return;
    }

    root.querySelectorAll("[data-am-source]").forEach(
      function (target) {
        const source = $(target.dataset.amSource);

        if (source) {
          target.textContent = source.textContent;
        }
      }
    );

    const connectionStatus = $("connectionText");
    const hardwareConnection = $("amHwConnection");

    if (connectionStatus && hardwareConnection) {
      const directText = connectionStatus.textContent.trim();
      hardwareConnection.textContent = /connected/i.test(directText) && !/disconnected|offline/i.test(directText)
        ? directText : "NOT CONNECTED";
    }

    if ($('amUsbDiagnostics')) $('amUsbDiagnostics').textContent = hardwareConnection ? hardwareConnection.textContent : 'NOT VERIFIED';
    // Relay health cannot be inferred from direct serial status or a test result.
    if ($('amCloudDiagnostics')) {
      const delivery = $('amLedDelivery')?.textContent || '';
      $('amCloudDiagnostics').textContent = /CLOUD ACCEPTED/.test(delivery) ? 'LAST COMMAND ACCEPTED' : 'NOT VERIFIED';
    }

    const connectionButton = $("connectionButton");
    const hardwareButton = $("amHwConnect");

    if (connectionButton && hardwareButton) {
      hardwareButton.textContent =
        /disconnect/i.test(connectionButton.textContent) ? "DISCONNECT" : "CONNECT";
    }

    const boardLed = $("boardLedButton");
    const hardwareLed = $("amHwLed");

    if (boardLed && hardwareLed) {
      hardwareLed.classList.toggle(
        "active",
        boardLed.getAttribute("aria-pressed") === "true"
      );
    }
  }

  /* ==========================================================
     HARDWARE COMMAND BUTTONS
     ========================================================== */

  function initializeHardwareButtons() {
    const root = $("amomiiTwin");

    if (!root) {
      return;
    }

    root.querySelectorAll("[data-am-action]").forEach(
      function (button) {
        button.addEventListener("click", function () {
          const action = button.dataset.amAction;
          const handler = window[action];

          if (typeof handler === "function") {
            handler();
          } else {
            alert(
              "NOVA hardware command unavailable: " +
              action
            );
          }
        });
      }
    );

    // Commands below match the existing CommandCenter.ino firmware:
    // speed 20-5000, blink 1-1000, flash COUNT SPEED.
    function ledNumber(id, min, max) {
      const input = $(id);
      const value = input ? Number(input.value) : NaN;
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error((input && input.closest('label') ? input.closest('label').textContent.trim() : id) +
          ' must be a whole number from ' + min + ' to ' + max + '.');
      }
      return value;
    }

    const LED_SETTINGS_KEY = 'novaAmomiiBuiltinLedSettingsV2';
    const fields = ['amBlinkCount','amBlinkSpeed','amFlashCount','amFlashSpeed','amMorseText'];
    try {
      const saved = JSON.parse(localStorage.getItem(LED_SETTINGS_KEY) || '{}');
      fields.forEach(function (id) { if ($(id) && saved[id] !== undefined) $(id).value = saved[id]; });
    } catch (error) { console.warn('AMOMII settings restore:', error); }
    function saveLedSettings() {
      try {
        const values = {};
        fields.forEach(function (id) { if ($(id)) values[id] = $(id).value; });
        localStorage.setItem(LED_SETTINGS_KEY, JSON.stringify(values));
      } catch (error) { console.warn('AMOMII settings save:', error); }
    }
    fields.forEach(function (id) { if ($(id)) $(id).addEventListener('change', saveLedSettings); });

    function ledMonitor(id, value) { if ($(id)) $(id).textContent = value; }
    function deviceFeedback(message) {
      ledMonitor('amLedDeviceResponse', message);
      if (/\b(error|invalid|unknown command)\b/i.test(message)) ledMonitor('amLedDelivery', 'DEVICE REPORTED ERROR');
      else ledMonitor('amLedDelivery', 'DEVICE RESPONSE RECEIVED');
      if (/\b(complete|stopped)\b/i.test(message)) ledMonitor('amLedMode', 'COMPLETE / IDLE');
    }
    // This hook observes replies already processed by NOVA. It does not invent acknowledgements.
    if (typeof window.processSerialLine === 'function' && !window.processSerialLine.__amomiiObserved) {
      const original = window.processSerialLine;
      const observed = function (line) {
        const result = original.apply(this, arguments);
        String(line || '').split(/\r?\n/).forEach(function (reply) {
          const clean = reply.trim();
          if (/\b(arduino|blink|flash|morse|led|speed|stop|error)\b/i.test(clean)) deviceFeedback(clean);
        });
        return result;
      };
      observed.__amomiiObserved = true;
      window.processSerialLine = observed;
    }

    async function sendLedCommand(command, mode, settings) {
      if (typeof window.sendCloudCommand !== 'function') throw new Error('NOVA cloud command handler unavailable.');
      ledMonitor('amLedLastCommand', command);
      ledMonitor('amLedMode', mode + ' (REQUESTED)');
      ledMonitor('amLedCurrentSettings', settings);
      ledMonitor('amLedDelivery', 'SENDING...');
      ledMonitor('amLedDeviceResponse', 'WAITING FOR DEVICE REPLY');
      const sent = await window.sendCloudCommand(command);
      ledMonitor('amLedDelivery', sent ? 'CLOUD ACCEPTED — DEVICE NOT YET VERIFIED' : 'CLOUD SEND FAILED');
      if (!sent) ledMonitor('amLedMode', 'NOT VERIFIED');
      return sent;
    }

    root.querySelectorAll('[data-am-led-command]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const feedback = $('amLedSettingsFeedback');
        button.disabled = true;
        try {
          saveLedSettings();
          const action = button.dataset.amLedCommand;
          let command = '', mode = '', settings = '';
          if (action === 'speed') {
            const speed = ledNumber('amBlinkSpeed', 20, 5000);
            command = 'speed ' + speed; mode = 'SPEED SET'; settings = speed + ' ms';
          } else if (action === 'blink') {
            const speed = ledNumber('amBlinkSpeed', 20, 5000);
            const count = ledNumber('amBlinkCount', 1, 1000);
            const prepared = await sendLedCommand('speed ' + speed, 'SETTING SPEED', speed + ' ms');
            if (!prepared) throw new Error('Unable to send blink speed; blink not started.');
            command = 'blink ' + count; mode = 'BLINKING'; settings = count + ' blinks · ' + speed + ' ms';
          } else if (action === 'flash') {
            const count = ledNumber('amFlashCount', 1, 1000);
            const speed = ledNumber('amFlashSpeed', 20, 5000);
            command = 'flash ' + count + ' ' + speed; mode = 'FLASHING'; settings = count + ' flashes · ' + speed + ' ms';
          } else if (action === 'morse') {
            const message = ($('amMorseText')?.value || '').trim().toUpperCase().replace(/\s+/g, ' ');
            if (!message || !/^[A-Z0-9 ]{1,80}$/.test(message)) throw new Error('Morse text must be 1–80 letters, digits or spaces.');
            command = 'morse ' + message; mode = 'MORSE'; settings = message;
          } else return;
          const sent = await sendLedCommand(command, mode, settings);
          if (feedback) feedback.textContent = sent ? 'Cloud accepted: ' + command + '. Waiting for hardware confirmation.' : 'Could not send: ' + command;
        } catch (error) {
          if (feedback) feedback.textContent = error.message;
          ledMonitor('amLedDelivery', 'ERROR: ' + error.message);
        } finally { button.disabled = false; }
      });
    });
    const stopButtons = root.querySelectorAll('[data-am-action="stopBoard"]');
    stopButtons.forEach(function (button) { button.addEventListener('click', function () {
      ledMonitor('amLedMode', 'STOP REQUESTED');
      ledMonitor('amLedLastCommand', 'stop');
      ledMonitor('amLedDelivery', 'STOP REQUESTED — NOT YET VERIFIED');
    }); });

    root.querySelectorAll("[data-am-command]").forEach(
      function (button) {
        button.addEventListener("click", function () {
          const command = button.dataset.amCommand;

          if (
            typeof window.sendCloudCommand === "function"
          ) {
            window.sendCloudCommand(command);
          } else {
            alert(
              "NOVA cloud commands are unavailable"
            );
          }
        });
      }
    );
  }

  /* ==========================================================
     LOAD PIN MAPPER SCRIPT
     ========================================================== */

  function loadPinMapper() {
    if (
      window.novaAMOMIIPinmap &&
      typeof window.novaAMOMIIPinmap.init === "function"
    ) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");

      script.src =
        "hardware/amomii-one/amomii-pinmap.js?v=1.0.0";

      script.onload = resolve;

      script.onerror = function () {
        reject(
          new Error(
            "AMOMII pin mapper failed to load"
          )
        );
      };

      document.body.appendChild(script);
    });
  }

  /* ==========================================================
     INITIALIZE AMOMII ONE
     ========================================================== */

  async function setup() {
    if ($("amomiiTwin")) {
      return;
    }

    const response = await fetch(
      "hardware/amomii-one/amomii-one.html",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "AMOMII window HTTP " + response.status
      );
    }

    const template = document.createElement("template");

    template.innerHTML = await response.text();

    const element = template.content.querySelector(
      "#amomiiTwin"
    );

    if (!element) {
      throw new Error(
        "AMOMII window markup missing"
      );
    }

    document.body.appendChild(element);

    await loadPinMapper();

    if (
      !window.novaAMOMIIPinmap ||
      typeof window.novaAMOMIIPinmap.init !== "function"
    ) {
      throw new Error(
        "AMOMII pin mapper initialization unavailable"
      );
    }

    await window.novaAMOMIIPinmap.init();

    const closeButton = $("amTwinClose");

    if (closeButton) {
      closeButton.onclick = function () {
        window.novaCloseAMOMII();
      };
    }

    initializeHardwareButtons();
    initializeAccordion();

    window.novaAMOMIISyncHardware = syncHardware;

    if (hardwareSyncTimer === null) {
      hardwareSyncTimer = setInterval(
        syncHardware,
        700
      );
    }
  }

  /* ==========================================================
     OPEN AMOMII ONE
     ========================================================== */

  window.novaOpenAMOMII = function () {
    if (!loading) {
      loading = setup().catch(function (error) {
        loading = null;
        throw error;
      });
    }

    return loading.then(function () {
      const root = $("amomiiTwin");

      if (!root) {
        return;
      }

      root.hidden = false;

      renderPinMap();
      syncHardware();

    }).catch(function (error) {
      console.error(error);

      alert(
        "AMOMII ONE: " + error.message
      );
    });
  };

  /* ==========================================================
     CLOSE AMOMII ONE
     ========================================================== */

  window.novaCloseAMOMII = function () {
    const root = $("amomiiTwin");

    if (root) {
      root.hidden = true;
    }
  };

})();
