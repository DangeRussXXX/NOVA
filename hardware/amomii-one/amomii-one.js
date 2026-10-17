
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

    root.querySelectorAll('[data-am-led-command]').forEach(function (button) {
      button.addEventListener('click', function () {
        const feedback = $('amLedSettingsFeedback');
        try {
          const action = button.dataset.amLedCommand;
          let command = '';
          if (action === 'speed') {
            command = 'speed ' + ledNumber('amBlinkSpeed', 20, 5000);
          } else if (action === 'blink') {
            // Firmware's SPEED command sets the blink rate globally;
            // send it before starting the selected built-in LED blink.
            const speed = ledNumber('amBlinkSpeed', 20, 5000);
            const count = ledNumber('amBlinkCount', 1, 1000);
            if (typeof window.sendCloudCommand !== 'function') throw new Error('Cloud command handler unavailable.');
            window.sendCloudCommand('speed ' + speed);
            command = 'blink ' + count;
          } else if (action === 'flash') {
            command = 'flash ' + ledNumber('amFlashCount', 1, 1000) +
              ' ' + ledNumber('amFlashSpeed', 20, 5000);
          } else return;
          if (typeof window.sendCloudCommand !== 'function') throw new Error('Cloud command handler unavailable.');
          window.sendCloudCommand(command);
          if (feedback) feedback.textContent = 'Sent: ' + command + ' (hardware response not yet verified)';
        } catch (error) {
          if (feedback) feedback.textContent = error.message;
        }
      });
    });

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
