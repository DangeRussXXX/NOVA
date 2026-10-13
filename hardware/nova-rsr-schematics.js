
/* ============================================================
   NOVA — RSR TRAINER ONE SCHEMATICS
   Floating Schematic Viewer
   Matches AMOMII ONE's schematic window controls and layout.
   Does not send hardware commands.
   ============================================================ */

(function () {
  "use strict";

  const WINDOW_ID = "novaRsrSchematicsWindow";
  const BUTTON_ID = "novaRsrSchematicButton";

  const VIEWER_URL =
    "hardware/rsr-schematics/index.html";

  let schematicWindow = null;
  let highestZ = 10000;

  let dragState = null;
  let resizeState = null;

  function bringToFront() {
    if (!schematicWindow) return;

    highestZ = Math.max(
      highestZ + 1,
      ...Array.from(
        document.querySelectorAll(
          "#novaRsrSchematicsWindow, #novaAmomiiSchematicsWindow"
        )
      ).map((element) => {
        return Number.parseInt(
          getComputedStyle(element).zIndex,
          10
        ) || 0;
      })
    );

    schematicWindow.style.zIndex = String(highestZ);
  }

  function createWindow() {
    if (schematicWindow) return schematicWindow;

    schematicWindow = document.createElement("section");

    schematicWindow.id = WINDOW_ID;
    schematicWindow.className = "nova-rsr-schematic-window";
    schematicWindow.hidden = true;

    schematicWindow.setAttribute(
      "aria-label",
      "RSR TRAINER ONE Schematics"
    );

    schematicWindow.innerHTML = `
      <div class="nova-rsr-schematic-header">
        <div class="nova-rsr-schematic-title">
          <span>⚡ RSR TRAINER ONE — SCHEMATICS</span>
          <small>PAD-234A · SCHEMATIC REFERENCE</small>
        </div>

        <div class="nova-rsr-schematic-actions">
          <button type="button"
                  data-rsr-schematic-action="minimize"
                  title="Minimize">—</button>

          <button type="button"
                  data-rsr-schematic-action="maximize"
                  title="Maximize">□</button>

          <button type="button"
                  data-rsr-schematic-action="close"
                  title="Close">✕</button>
        </div>
      </div>

      <div class="nova-rsr-schematic-content">
        <iframe
          title="RSR TRAINER ONE Circuit Schematics"
          src="${VIEWER_URL}"
          allowfullscreen
        ></iframe>
      </div>

      <div class="nova-rsr-schematic-resizer"
           title="Resize window"></div>
    `;

    document.body.appendChild(schematicWindow);

    const header = schematicWindow.querySelector(
      ".nova-rsr-schematic-header"
    );

    const resizer = schematicWindow.querySelector(
      ".nova-rsr-schematic-resizer"
    );

    header.addEventListener("pointerdown", startDrag);
    resizer.addEventListener("pointerdown", startResize);

    schematicWindow.addEventListener(
      "pointerdown",
      bringToFront
    );

    schematicWindow
      .querySelectorAll("[data-rsr-schematic-action]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.rsrSchematicAction;

          if (action === "close") closeWindow();
          if (action === "minimize") minimizeWindow();
          if (action === "maximize") maximizeWindow();
        });
      });

    return schematicWindow;
  }

  function openWindow() {
    const win = createWindow();

    win.hidden = false;
    win.classList.remove("is-minimized");

    bringToFront();
  }

  function closeWindow() {
    if (!schematicWindow) return;

    schematicWindow.hidden = true;
    schematicWindow.classList.remove("is-minimized");
  }

  function minimizeWindow() {
    if (!schematicWindow) return;

    schematicWindow.classList.toggle("is-minimized");
    bringToFront();
  }

  function maximizeWindow() {
    if (!schematicWindow) return;

    const maximized =
      schematicWindow.classList.toggle("is-maximized");

    if (maximized) {
      schematicWindow.classList.remove("is-minimized");
    }

    bringToFront();
  }

  function startDrag(event) {
    if (event.button !== 0) return;

    if (event.target.closest("button")) return;

    if (
      schematicWindow.classList.contains("is-maximized")
    ) {
      return;
    }

    const rect = schematicWindow.getBoundingClientRect();

    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top
    };

    schematicWindow.style.left = `${rect.left}px`;
    schematicWindow.style.top = `${rect.top}px`;
    schematicWindow.style.right = "auto";
    schematicWindow.style.bottom = "auto";

    event.currentTarget.setPointerCapture(event.pointerId);

    bringToFront();
  }

  function startResize(event) {
    if (event.button !== 0) return;

    if (
      schematicWindow.classList.contains("is-maximized") ||
      schematicWindow.classList.contains("is-minimized")
    ) {
      return;
    }

    const rect = schematicWindow.getBoundingClientRect();

    resizeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    bringToFront();

    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (
      dragState &&
      dragState.pointerId === event.pointerId
    ) {
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;

      const width = schematicWindow.offsetWidth;
      const height = schematicWindow.offsetHeight;

      const left = Math.max(
        0,
        Math.min(
          window.innerWidth - Math.min(width, 100),
          dragState.left + dx
        )
      );

      const top = Math.max(
        0,
        Math.min(
          window.innerHeight - Math.min(height, 45),
          dragState.top + dy
        )
      );

      schematicWindow.style.left = `${left}px`;
      schematicWindow.style.top = `${top}px`;
    }

    if (
      resizeState &&
      resizeState.pointerId === event.pointerId
    ) {
      const dx = event.clientX - resizeState.startX;
      const dy = event.clientY - resizeState.startY;

      schematicWindow.style.width =
        `${Math.max(420, resizeState.width + dx)}px`;

      schematicWindow.style.height =
        `${Math.max(280, resizeState.height + dy)}px`;
    }
  }

  function handlePointerUp(event) {
    if (
      dragState &&
      dragState.pointerId === event.pointerId
    ) {
      dragState = null;
    }

    if (
      resizeState &&
      resizeState.pointerId === event.pointerId
    ) {
      resizeState = null;
    }
  }

  function attachButton() {
    const lab = document.getElementById("rsrLab");
    const header = lab && lab.querySelector(".rsr-lab__header");

    if (!header) return;

    let button = document.getElementById(BUTTON_ID);

    if (!button) {
      button = document.createElement("button");
      button.id = BUTTON_ID;
      button.type = "button";
      button.className = "nova-rsr-schem-launch";
      button.textContent = "▤ SCHEMATICS";
      button.title = "Open RSR schematic reference";
      header.appendChild(button);
    }

    if (button.dataset.rsrSchematicReady) return;

    button.dataset.rsrSchematicReady = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openWindow();
    });
  }

  function initialize() {
    attachButton();

    const observer = new MutationObserver(() => {
      attachButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener(
    "pointermove",
    handlePointerMove
  );

  document.addEventListener(
    "pointerup",
    handlePointerUp
  );

  document.addEventListener(
    "pointercancel",
    handlePointerUp
  );

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

  window.novaOpenRSRSchematics = openWindow;

})();
