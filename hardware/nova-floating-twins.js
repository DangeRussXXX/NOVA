
/* ============================================================
   NOVA FLOATING TWINS — V2
   AMOMII ONE: Vertical accordion interface
   RSR TRAINER: Existing split interface retained

   Presentation and window management only.
   Hardware commands are not modified.
   ============================================================ */

(function () {
  "use strict";

  const definitions = [
    {
      id: "rsrLab",
      title: "RSR TRAINER",
      header: ".rsr-lab__header",
      grid: ".rsr-lab__columns",
      before: ".rsr-lab__simulator",
      close: "rsrLabClose",
      splitColumns: true,
      left: 38,
      x: 6,
      y: 7,
      w: 88,
      h: 84
    },
    {
      id: "amomiiTwin",
      title: "AMOMII ONE",
      header: ".am-header",
      grid: ".am-workspace",
      before: ".am-simulator",
      close: "amTwinClose",
      splitColumns: false,
      left: 35,
      x: 9,
      y: 10,
      w: 82,
      h: 78
    }
  ];

  const dock = document.createElement("div");
  dock.id = "novaTwinDock";
  document.body.appendChild(dock);

  let topZIndex = 100100;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function bringToFront(element) {
    element.style.setProperty(
      "z-index",
      String(++topZIndex),
      "important"
    );
  }

  function saveWindow(definition, element) {
    try {
      const rect = element.getBoundingClientRect();

      localStorage.setItem(
        "novaFloating_" + definition.id,
        JSON.stringify({
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          left:
            parseFloat(
              element.style.getPropertyValue("--nova-left")
            ) || definition.left
        })
      );
    } catch (error) {
      console.warn(
        "NOVA window position could not be saved:",
        error
      );
    }
  }

  function setupWindow(definition) {
    const element = document.getElementById(definition.id);

    if (!element || element.dataset.novaFloatingReady) {
      return;
    }

    const header = element.querySelector(definition.header);
    const grid = element.querySelector(definition.grid);
    const before = element.querySelector(definition.before);

    if (!header || !grid || !before) {
      return;
    }

    element.dataset.novaFloatingReady = "yes";
    element.classList.add("nova-float-window");

    let state = {
      x: innerWidth * definition.x / 100,
      y: innerHeight * definition.y / 100,
      w: innerWidth * definition.w / 100,
      h: innerHeight * definition.h / 100,
      left: definition.left
    };

    try {
      const saved = JSON.parse(
        localStorage.getItem(
          "novaFloating_" + definition.id
        ) || "{}"
      );

      state = {
        ...state,
        ...saved
      };
    } catch (error) {
      console.warn(
        "NOVA window position could not be restored:",
        error
      );
    }

    function setWindowRect(rect) {
      element.style.setProperty(
        "--nova-x",
        Math.round(rect.x) + "px"
      );

      element.style.setProperty(
        "--nova-y",
        Math.round(rect.y) + "px"
      );

      element.style.setProperty(
        "--nova-w",
        Math.round(rect.w) + "px"
      );

      element.style.setProperty(
        "--nova-h",
        Math.round(rect.h) + "px"
      );
    }

    setWindowRect({
      x: clamp(
        state.x,
        0,
        Math.max(0, innerWidth - 160)
      ),
      y: clamp(
        state.y,
        0,
        Math.max(0, innerHeight - 70)
      ),
      w: clamp(
        state.w,
        340,
        Math.max(340, innerWidth)
      ),
      h: clamp(
        state.h,
        270,
        Math.max(270, innerHeight)
      )
    });

    element.style.setProperty(
      "--nova-left",
      clamp(state.left, 15, 80) + "%"
    );

    /* ========================================================
       WINDOW ACTION BUTTONS
       ======================================================== */

    const actions = document.createElement("div");
    actions.className = "nova-float-actions";

    const minimize = document.createElement("button");
    const maximize = document.createElement("button");

    minimize.type = "button";
    maximize.type = "button";

    minimize.textContent = "—";
    minimize.title = "Minimize " + definition.title;
    minimize.setAttribute(
      "aria-label",
      "Minimize " + definition.title
    );

    maximize.textContent = "□";
    maximize.title = "Maximize or restore";
    maximize.setAttribute(
      "aria-label",
      "Maximize or restore"
    );

    actions.append(minimize, maximize);

    const close = element.querySelector(
      "#" + definition.close
    );

    header.insertBefore(actions, close || null);

    /* ========================================================
       MINIMIZED WINDOW DOCK
       ======================================================== */

    const restore = document.createElement("button");

    restore.type = "button";
    restore.textContent = "↗ " + definition.title;
    restore.hidden = true;

    restore.onclick = function () {
      element.classList.remove("nova-minimized");
      element.hidden = false;
      restore.hidden = true;
      bringToFront(element);
    };

    dock.appendChild(restore);

    minimize.onclick = function () {
      saveWindow(definition, element);
      element.classList.add("nova-minimized");
      restore.hidden = false;
    };

    maximize.onclick = function () {
      if (element.classList.contains("nova-maximized")) {
        element.classList.remove("nova-maximized");
        maximize.textContent = "□";
      } else {
        saveWindow(definition, element);
        element.classList.add("nova-maximized");
        maximize.textContent = "❐";
      }

      bringToFront(element);
    };

    /* ========================================================
       COLUMN RESIZER
       Only used by the existing RSR Trainer interface.
       AMOMII ONE now has a vertical accordion.
       ======================================================== */

    if (definition.splitColumns) {
      const grip = document.createElement("div");

      grip.className = "nova-column-grip";
      grip.title = "Drag to adjust panel widths";
      grip.setAttribute("role", "separator");
      grip.setAttribute(
        "aria-label",
        "Resize columns"
      );

      grip.tabIndex = 0;

      grid.insertBefore(grip, before);

      function setSplit(percent) {
        element.style.setProperty(
          "--nova-left",
          clamp(percent, 15, 80) + "%"
        );
      }

      grip.addEventListener("pointerdown", function (event) {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        bringToFront(element);

        grip.classList.add("nova-grabbing");
        grip.setPointerCapture(event.pointerId);

        const move = function (moveEvent) {
          const rect = grid.getBoundingClientRect();

          if (!rect.width) {
            return;
          }

          setSplit(
            (moveEvent.clientX - rect.left) /
            rect.width * 100
          );
        };

        const up = function () {
          grip.classList.remove("nova-grabbing");

          grip.removeEventListener("pointermove", move);
          grip.removeEventListener("pointerup", up);
          grip.removeEventListener("pointercancel", up);

          saveWindow(definition, element);
        };

        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", up);
        grip.addEventListener("pointercancel", up);
      });

      grip.addEventListener("keydown", function (event) {
        if (
          event.key !== "ArrowLeft" &&
          event.key !== "ArrowRight"
        ) {
          return;
        }

        event.preventDefault();

        const current =
          parseFloat(
            element.style.getPropertyValue("--nova-left")
          ) || definition.left;

        setSplit(
          current + (
            event.key === "ArrowLeft" ? -2 : 2
          )
        );

        saveWindow(definition, element);
      });
    }

    /* ========================================================
       DRAG WINDOW BY HEADER
       ======================================================== */

    header.addEventListener(
      "pointerdown",
      function (event) {
        if (
          event.button !== 0 ||
          event.target.closest(
            "button,input,select,a"
          ) ||
          element.classList.contains("nova-maximized")
        ) {
          return;
        }

        bringToFront(element);
        event.preventDefault();

        const rect = element.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;

        header.setPointerCapture(event.pointerId);

        const move = function (moveEvent) {
          element.style.setProperty(
            "--nova-x",
            clamp(
              rect.left + moveEvent.clientX - startX,
              0,
              Math.max(0, innerWidth - 100)
            ) + "px"
          );

          element.style.setProperty(
            "--nova-y",
            clamp(
              rect.top + moveEvent.clientY - startY,
              0,
              Math.max(0, innerHeight - 50)
            ) + "px"
          );
        };

        const up = function () {
          header.removeEventListener("pointermove", move);
          header.removeEventListener("pointerup", up);
          header.removeEventListener("pointercancel", up);

          saveWindow(definition, element);
        };

        header.addEventListener("pointermove", move);
        header.addEventListener("pointerup", up);
        header.addEventListener("pointercancel", up);
      }
    );

    element.addEventListener(
      "pointerdown",
      function () {
        bringToFront(element);
      }
    );

    /* ========================================================
       RESIZE OBSERVER
       ======================================================== */

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(function () {
        if (
          !element.hidden &&
          !element.classList.contains("nova-maximized") &&
          !element.classList.contains("nova-minimized")
        ) {
          saveWindow(definition, element);
        }
      });

      observer.observe(element);
    }

    /* ========================================================
       WINDOW VISIBILITY
       ======================================================== */

    const visibility = new MutationObserver(function () {
      if (!element.hidden) {
        element.classList.remove("nova-minimized");
        restore.hidden = true;
        bringToFront(element);
      } else {
        restore.hidden = true;
      }
    });

    visibility.observe(element, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  /* ==========================================================
     INITIALIZE EXISTING AND DYNAMIC WINDOWS
     ========================================================== */

  function scanWindows() {
    definitions.forEach(setupWindow);
  }

  scanWindows();

  const observer = new MutationObserver(scanWindows);

  observer.observe(document.body, {
    childList: true,
    subtree: false
  });

})();
