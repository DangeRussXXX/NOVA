/* NOVA RSR Trainer Digital Twin — v1.9.23
   File: hardware/rsr-trainer/rsr-trainer.js
   Requires the rsr-trainer.html fragment to be inserted into the page first.
   Does not send any new hardware commands or override NOVA's existing functions.
*/
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const lab = () => $('rsrLab');
  let originalParent = null;
  let originalNext = null;
  let mountedPanel = null;
  let initialized = false;
  let observer = null;
  let selectedMode = 'board';

  // These are temporary DISPLAY coordinates, not verified pin coordinates.
  // Adjust after comparing the actual trainer photo in the browser.
  const ledPositions = Array.from({length: 8}, (_, i) => ({
    x: 61.7 + (7 - i) * 2.6, y: 16.4, label: `LED ${i}`
  }));

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }
  function show(id, visible) {
    const node = $(id);
    if (node) node.hidden = !visible;
  }
  function getStates() {
    // Existing hardware module exposes trainerLedStates as a top-level const.
    // typeof is safe when that binding is not yet loaded.
    try {
      if (typeof trainerLedStates !== 'undefined' && Array.isArray(trainerLedStates)) {
        return trainerLedStates.slice(0, 8).map(Boolean);
      }
    } catch (_) {}
    return Array(8).fill(false);
  }
  function drawLeds() {
    const layer = $('rsrLabLedLayer');
    if (!layer || layer.children.length === 8) return;
    layer.replaceChildren();
    ledPositions.forEach((pos, i) => {
      const led = document.createElement('span');
      led.className = 'rsr-lab__led';
      led.style.left = pos.x + '%';
      led.style.top = pos.y + '%';
      led.title = `${pos.label} — commanded/reported UI state`;
      led.setAttribute('aria-label', pos.label);
      layer.appendChild(led);
    });
  }
  function refresh() {
    if (!lab()) return;
    drawLeds();
    const states = getStates();
    const layer = $('rsrLabLedLayer');
    if (layer) [...layer.children].forEach((led, i) => {
      led.classList.toggle('is-on', !!states[i]);
    });
    setText('rsrLabLedStatus', states.map((on, i) => `${i}:${on ? 'ON' : 'OFF'}`).join('  '));
    setText('rsrLabSwitchStatus', $('rsrSwitchState0')?.textContent?.trim() || 'UNKNOWN');
    setText('rsrLabLinkStatus', `NOVA LINK: ${$('connectionText')?.textContent?.trim() || 'NOT VERIFIED'}`);
    setText('rsrLabPowerStatus', 'NOT MONITORED');
  }
  function mode(name) {
    selectedMode = name;
    show('rsrLabBoard', name !== 'wiring');
    show('rsrLabWiringPanel', name === 'wiring');
    show('rsrLabPinLayer', name === 'pins');
    [['rsrLabViewBoard', 'board'], ['rsrLabViewWiring', 'wiring'], ['rsrLabViewPins', 'pins']]
      .forEach(([id, value]) => $(id)?.setAttribute('aria-pressed', String(value === name)));
    setText('rsrLabModeStatus', name === 'pins'
      ? 'PIN MAP • awaiting verified coordinate and netlist data'
      : name === 'wiring' ? 'WIRING • verify against actual hardware'
      : 'LEDs reflect NOVA UI state, not independent hardware confirmation');
  }
  function mountOriginalControls() {
    const panel = document.querySelector('.rsrTrainerController');
    const host = $('rsrLabExistingControls');
    if (!panel || !host) return;
    if (panel.parentNode === host) return;
    originalParent = panel.parentNode;
    originalNext = panel.nextSibling;
    mountedPanel = panel;
    host.appendChild(panel);
  }
  function restoreOriginalControls() {
    if (!mountedPanel || !originalParent) return;
    const anchor = originalNext && originalNext.parentNode === originalParent ? originalNext : null;
    originalParent.insertBefore(mountedPanel, anchor);
    mountedPanel = null;
  }
  function open() {
    if (!lab()) { console.warn('RSR digital twin HTML not loaded.'); return false; }
    mountOriginalControls();
    lab().hidden = false;
    document.body.classList.add('rsr-lab-open');
    refresh();
    return true;
  }
  function close() {
    if (!lab()) return;
    restoreOriginalControls();
    lab().hidden = true;
    document.body.classList.remove('rsr-lab-open');
  }
  function init() {
    if (initialized || !lab()) return false;
    initialized = true;
    $('rsrLabClose')?.addEventListener('click', close);
    $('rsrLabViewBoard')?.addEventListener('click', () => mode('board'));
    $('rsrLabViewWiring')?.addEventListener('click', () => mode('wiring'));
    $('rsrLabViewPins')?.addEventListener('click', () => mode('pins'));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lab() && !lab().hidden) close();
    });
    observer = new MutationObserver(() => {
      if (lab() && !lab().hidden) refresh();
    });
    ['rsrSwitchState0', 'connectionText', 'rsrPatternName'].forEach(id => {
      const target = $(id);
      if (target) observer.observe(target, {childList:true, characterData:true, subtree:true});
    });
    // Existing LED buttons update their classes when the hardware module changes state.
    // Watch those updates instead of replacing existing control functions.
    const panel = document.querySelector('.rsrTrainerController');
    if (panel) observer.observe(panel, {attributes:true, attributeFilter:['class','aria-pressed'], subtree:true});
    mode('board');
    refresh();
    return true;
  }
  window.novaRSRLab = {init, open(){init(); return open();}, close, refresh, mode};
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
