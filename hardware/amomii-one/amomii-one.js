
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
    setAllPanels(false);
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
      hardwareConnection.textContent =
        connectionStatus.textContent;
    }

    const connectionButton = $("connectionButton");
    const hardwareButton = $("amHwConnect");

    if (connectionButton && hardwareButton) {
      hardwareButton.textContent =
        connectionButton.textContent;
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

      resetPanels();

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
