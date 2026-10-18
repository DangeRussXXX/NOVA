
/* ============================================================
   NOVA FLOATING TWINS — V4
   AMOMII ONE + RSR TRAINER

   - Draggable floating windows
   - Resizable windows
   - Minimize / restore
   - Maximize / restore
   - Draggable two-column dividers
   - Saved window positions and panel widths
   - AMOMII board simulation expanded on first load

   Hardware controllers are not modified.
   ============================================================ */

(function () {
  'use strict';

  const defs = [
    {
      id: 'rsrLab',
      title: 'RSR TRAINER',
      header: '.rsr-lab__header',
      grid: '.rsr-lab__columns',
      before: '.rsr-lab__simulator',
      close: 'rsrLabClose',
      left: 38,
      x: 6,
      y: 7,
      w: 88,
      h: 84
    },
    {
      id: 'amomiiTwin',
      title: 'AMOMII ONE',
      header: '.am-header',
      grid: '.am-workspace',
      before: '.am-simulator',
      close: 'amTwinClose',
      left: 35,
      x: 9,
      y: 10,
      w: 82,
      h: 78
    }
  ];

  let z = 100100;

  let dock = document.getElementById('novaTwinDock');

  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'novaTwinDock';
    document.body.appendChild(dock);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function front(el) {
    el.style.setProperty(
      'z-index',
      String(++z),
      'important'
    );
  }

  function save(def, el) {
    try {
      const rect = el.getBoundingClientRect();

      localStorage.setItem(
        'novaFloating_' + def.id,
        JSON.stringify({
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          left:
            parseFloat(
              el.style.getPropertyValue('--nova-left')
            ) || def.left
        })
      );
    } catch (error) {
      console.warn(
        '[NOVA Floating Twins] Save skipped:',
        error
      );
    }
  }

  function setupBoardSections(el) {
    if (el.id !== 'amomiiTwin') return;

    const hardware = el.querySelector('.am-hardware');
    const simulator = el.querySelector('.am-simulator');

    if (hardware) {
      hardware.querySelectorAll(
        'details.am-section'
      ).forEach(section => {
        section.open = false;
      });
    }

    if (simulator) {
      simulator.querySelectorAll(
        'details.am-section'
      ).forEach(section => {
        section.open = true;
      });
    }
  }

  function setup(def) {
    const el = document.getElementById(def.id);

    if (!el || el.dataset.novaFloatingReady) {
      return;
    }

    const header = el.querySelector(def.header);
    const grid = el.querySelector(def.grid);
    const before = el.querySelector(def.before);

    if (!header || !grid || !before) {
      return;
    }

    el.dataset.novaFloatingReady = 'yes';
    el.classList.add('nova-float-window');

    let state = {
      x: innerWidth * def.x / 100,
      y: innerHeight * def.y / 100,
      w: innerWidth * def.w / 100,
      h: innerHeight * def.h / 100,
      left: def.left
    };

    try {
      const saved = JSON.parse(
        localStorage.getItem(
          'novaFloating_' + def.id
        ) || '{}'
      );

      state = {
        ...state,
        ...saved
      };
    } catch (error) {
      console.warn(
        '[NOVA Floating Twins] Saved layout unavailable'
      );
    }

    function setRect(rect) {
      el.style.setProperty(
        '--nova-x',
        Math.round(rect.x) + 'px'
      );

      el.style.setProperty(
        '--nova-y',
        Math.round(rect.y) + 'px'
      );

      el.style.setProperty(
        '--nova-w',
        Math.round(rect.w) + 'px'
      );

      el.style.setProperty(
        '--nova-h',
        Math.round(rect.h) + 'px'
      );
    }

    setRect({
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

    function setSplit(percent) {
      el.style.setProperty(
        '--nova-left',
        clamp(percent, 15, 80) + '%'
      );
    }

    setSplit(state.left);

    // FLOATING WINDOW ACTIONS

    const actions = document.createElement('div');
    actions.className = 'nova-float-actions';

    const minimize = document.createElement('button');
    const maximize = document.createElement('button');

    minimize.type = 'button';
    maximize.type = 'button';

    minimize.textContent = '—';
    minimize.title = 'Minimize ' + def.title;
    minimize.setAttribute(
      'aria-label',
      'Minimize ' + def.title
    );

    maximize.textContent = '□';
    maximize.title = 'Maximize or restore';
    maximize.setAttribute(
      'aria-label',
      'Maximize or restore ' + def.title
    );

    actions.append(minimize, maximize);

    const close = el.querySelector('#' + def.close);

    // Keep all three window buttons together as one right-aligned unit.
    // Moving the existing CLOSE element preserves its original event handlers.
    const windowButtons = document.createElement('div');
    windowButtons.className = 'nova-window-buttons';
    windowButtons.appendChild(actions);
    if (close) windowButtons.appendChild(close);
    header.appendChild(windowButtons);

    // MINIMIZE DOCK

    const restore = document.createElement('button');

    restore.type = 'button';
    restore.textContent = '↗ ' + def.title;
    restore.hidden = true;

    restore.onclick = () => {
      el.classList.remove('nova-minimized');
      el.hidden = false;
      restore.hidden = true;
      front(el);
    };

    dock.appendChild(restore);

    minimize.onclick = () => {
      save(def, el);
      el.classList.add('nova-minimized');
      restore.hidden = false;
    };

    maximize.onclick = () => {
      if (el.classList.contains('nova-maximized')) {
        el.classList.remove('nova-maximized');
        maximize.textContent = '□';
      } else {
        save(def, el);
        el.classList.add('nova-maximized');
        maximize.textContent = '❐';
      }

      front(el);
    };

    // TWO-COLUMN RESIZE GRIP

    let grip = grid.querySelector(
      ':scope > .nova-column-grip'
    );

    if (!grip) {
      grip = document.createElement('div');
      grip.className = 'nova-column-grip';

      grid.insertBefore(grip, before);
    }

    grip.title = 'Drag to adjust panel widths';
    grip.setAttribute('role', 'separator');
    grip.setAttribute(
      'aria-label',
      'Resize columns'
    );
    grip.setAttribute(
      'aria-orientation',
      'vertical'
    );
    grip.tabIndex = 0;

    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      front(el);

      grip.classList.add('nova-grabbing');
      grip.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        const rect = grid.getBoundingClientRect();

        if (!rect.width) return;

        const percent =
          (moveEvent.clientX - rect.left) /
          rect.width * 100;

        setSplit(percent);
      };

      const up = () => {
        grip.classList.remove('nova-grabbing');

        grip.removeEventListener(
          'pointermove',
          move
        );

        grip.removeEventListener(
          'pointerup',
          up
        );

        grip.removeEventListener(
          'pointercancel',
          up
        );

        save(def, el);
      };

      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });

    grip.addEventListener('keydown', event => {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        return;
      }

      event.preventDefault();

      const current =
        parseFloat(
          el.style.getPropertyValue('--nova-left')
        ) || def.left;

      setSplit(
        current +
        (event.key === 'ArrowLeft' ? -2 : 2)
      );

      save(def, el);
    });

    // WINDOW DRAGGING

    header.addEventListener('pointerdown', event => {
      if (
        event.button !== 0 ||
        event.target.closest(
          'button,input,select,a,textarea'
        ) ||
        el.classList.contains('nova-maximized')
      ) {
        return;
      }

      front(el);
      event.preventDefault();

      const rect = el.getBoundingClientRect();

      const startX = event.clientX;
      const startY = event.clientY;

      header.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        const x = clamp(
          rect.left + moveEvent.clientX - startX,
          0,
          Math.max(0, innerWidth - 100)
        );

        const y = clamp(
          rect.top + moveEvent.clientY - startY,
          0,
          Math.max(0, innerHeight - 50)
        );

        el.style.setProperty(
          '--nova-x',
          x + 'px'
        );

        el.style.setProperty(
          '--nova-y',
          y + 'px'
        );
      };

      const up = () => {
        header.removeEventListener(
          'pointermove',
          move
        );

        header.removeEventListener(
          'pointerup',
          up
        );

        header.removeEventListener(
          'pointercancel',
          up
        );

        save(def, el);
      };

      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', up);
      header.addEventListener('pointercancel', up);
    });

    el.addEventListener('pointerdown', () => {
      front(el);
    });

    // BOARD DEFAULT STATE

    setupBoardSections(el);

    if (el.id === 'amomiiTwin') {
      const openBoard = () => {
        const board = el.querySelector(
          '.am-simulator details.am-section'
        );

        if (!board) return;

        if (!el.dataset.novaBoardInitialized) {
          board.open = true;
          el.dataset.novaBoardInitialized = 'yes';

          requestAnimationFrame(() => {
            try {
              window.novaAMOMIIPinmap?.render?.();
            } catch (error) {
              console.warn(
                '[NOVA] Pinmap render:',
                error
              );
            }
          });
        }
      };

      openBoard();

      const boardObserver = new MutationObserver(openBoard);

      boardObserver.observe(el, {
        childList: true,
        subtree: true
      });
    }

    // MANUAL WINDOW RESIZE HANDLE

    const corner = document.createElement('div');

    corner.className = 'nova-window-resize';
    corner.title = 'Drag to resize window';
    corner.setAttribute(
      'aria-label',
      'Resize ' + def.title + ' window'
    );

    el.appendChild(corner);

    corner.addEventListener('pointerdown', event => {
      if (
        event.button !== 0 ||
        el.classList.contains('nova-maximized')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      front(el);

      const rect = el.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;

      corner.setPointerCapture(event.pointerId);

      const move = moveEvent => {
        const minW = innerWidth <= 620 ? 280 : 340;
        const minH = innerWidth <= 620 ? 240 : 270;

        const width = clamp(
          rect.width + moveEvent.clientX - startX,
          minW,
          Math.max(minW, innerWidth - rect.left)
        );

        const height = clamp(
          rect.height + moveEvent.clientY - startY,
          minH,
          Math.max(minH, innerHeight - rect.top)
        );

        el.style.setProperty(
          '--nova-w',
          Math.round(width) + 'px'
        );

        el.style.setProperty(
          '--nova-h',
          Math.round(height) + 'px'
        );
      };

      const up = () => {
        corner.removeEventListener(
          'pointermove',
          move
        );

        corner.removeEventListener(
          'pointerup',
          up
        );

        corner.removeEventListener(
          'pointercancel',
          up
        );

        save(def, el);
      };

      corner.addEventListener('pointermove', move);
      corner.addEventListener('pointerup', up);
      corner.addEventListener('pointercancel', up);
    });

    // WINDOW RESIZE OBSERVER

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        if (
          !el.hidden &&
          !el.classList.contains('nova-maximized') &&
          !el.classList.contains('nova-minimized')
        ) {
          save(def, el);
        }
      });

      resizeObserver.observe(el);
    }

    // VISIBILITY

    const visibility = new MutationObserver(() => {
      if (!el.hidden) {
        el.classList.remove('nova-minimized');
        restore.hidden = true;
        front(el);
      } else {
        restore.hidden = true;
      }
    });

    visibility.observe(el, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  // INITIALIZE EXISTING AND LAZY-LOADED WINDOWS

  function scan() {
    defs.forEach(setup);
  }

  scan();

  const observer = new MutationObserver(scan);

  observer.observe(document.body, {
    childList: true,
    subtree: false
  });

})();
