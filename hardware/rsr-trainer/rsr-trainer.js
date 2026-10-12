/* NOVA RSR Trainer Digital Twin — LED alignment + local pattern previews
   Paste this ENTIRE file into hardware/rsr-trainer/rsr-trainer.js.
   The existing dashboard remains the only sender of hardware commands.
   Preview timing is approximate; it is not measured hardware telemetry.
   Global animation speed defaults to 1.5x; call novaRSRLab.setPreviewSpeed(2) to tune.
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
  let previewTimer = null;
  let previewStates = null;
  let previewName = '';
  let previewStep = 0;
  let photoPowerOn = false;
  let soundEnabled = false;
  let audioContext = null;
  let lastSoundAt = 0;
  let testTimer = null;
  let testRunning = false;
  let previewSpeed = 1.5; // Global simulator speed; hardware timing is unchanged.

  // APPROVED photo alignment: LED 7 at left; LED 0 at right.
  const ledPositions = Array.from({ length: 8 }, (_, i) => ({
    x: 86.5 - i * 2.61,
    y: 19.4,
    label: `LED ${i}`
  }));


  // Web Audio effects are generated locally; no external files and no hardware commands.
  function sound(frequency=440, duration=.055, type='sine') {
    if (!soundEnabled || lab()?.hidden) return;
    const now = performance.now();
    if (now - lastSoundAt < 65) return; // avoid rapid-fire audio overload
    lastSoundAt = now;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.045, audioContext.currentTime + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + duration + .01);
    } catch (err) { console.debug('RSR audio unavailable:', err); }
  }
  // Photo-relative coordinates measured from the supplied PAD-234A image.
  // The two red lamps and green lamp are separate from the 8 Arduino-driven LEDs.
  function drawPhotoPower() {
    const layer = $('rsrLabSwitchLayer');
    if (!layer) return;
    if (!layer.querySelector('#rsrLabPhotoPowerSwitch')) {
      const power = document.createElement('button');
      power.type='button'; power.id='rsrLabPhotoPowerSwitch';
      power.className='rsr-lab__photo-switch';
      power.style.left='77.2%'; power.style.top='8.0%';
      power.title='Click to toggle simulated trainer power (no hardware output)';
      power.setAttribute('aria-label','Toggle simulated trainer power on photograph');
      power.addEventListener('click',()=>{
        photoPowerOn=!photoPowerOn;
        if (!photoPowerOn) stopTestVisual();
        refreshDemo();
        sound(photoPowerOn?620:250,.12,'triangle');
      });
      layer.appendChild(power);
      [[29.5,52.25,'red'],[29.5,60.45,'red'],[29.5,68.75,'green']].forEach(([x,y,color],i)=>{
        const lamp=document.createElement('span');
        lamp.id='rsrLabPhotoLamp'+i;
        lamp.className='rsr-lab__photo-lamp is-'+color;
        lamp.style.left=x+'%'; lamp.style.top=y+'%';
        lamp.title='Simulated '+color+' trainer indicator '+(i+1);
        layer.appendChild(lamp);
      });
    }
  }
  function refreshDemo(activeIndex=-1) {
    drawPhotoPower();
    const button=$('rsrLabPhotoPowerSwitch');
    if(button){button.classList.toggle('is-on',photoPowerOn);button.setAttribute('aria-pressed',String(photoPowerOn));}
    for(let i=0;i<3;i++) {
      const lamp=$('rsrLabPhotoLamp'+i);
      if(lamp) lamp.classList.toggle('is-on',activeIndex>=0 ? activeIndex===i : photoPowerOn);
    }
    setText('rsrLabPhotoPowerStatus',photoPowerOn?'ON — SIMULATED':'OFF — SIMULATED');
  }
  function resetDemo() { photoPowerOn=false; refreshDemo(); }
  function startTestVisual() {
    stopTestVisual();
    testRunning=true;
    $('rsrLabTestPulse')?.parentElement?.classList.add('is-running');
    setText('rsrLabTestResult','RUNNING — visual sequence only; hardware result not verified');
    let step=0;
    const tick=()=>{
      if(!testRunning) return;
      refreshDemo(step%3);
      sound(300+step%3*170,.075,'triangle'); step++;
      if(step<12) testTimer=setTimeout(tick,210);
      else {
        stopTestVisual();
        setText('rsrLabTestResult','VISUAL SEQUENCE COMPLETE — check NOVA for actual test result');
      }
    };
    tick();
  }
  function stopTestVisual() {
    testRunning=false;
    if(testTimer!==null) clearTimeout(testTimer);
    testTimer=null;
    $('rsrLabTestPulse')?.parentElement?.classList.remove('is-running');
    refreshDemo();
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }
  function show(id, visible) {
    const node = $(id);
    if (node) node.hidden = !visible;
  }
  function getStates() {
    try {
      if (typeof trainerLedStates !== 'undefined' && Array.isArray(trainerLedStates)) {
        return trainerLedStates.slice(0, 8).map(Boolean);
      }
    } catch (_) {}
    return Array(8).fill(false);
  }
  function drawLeds() {
    const layer = $('rsrLabLedLayer');
    if (!layer) return;
    if (layer.children.length !== 8) {
      layer.replaceChildren();
      ledPositions.forEach(pos => {
        const led = document.createElement('span');
        led.className = 'rsr-lab__led';
        led.title = `${pos.label} — NOVA UI state or local pattern preview`;
        led.setAttribute('aria-label', pos.label);
        layer.appendChild(led);
      });
    }
    ledPositions.forEach((pos, i) => {
      layer.children[i].style.left = pos.x + '%';
      layer.children[i].style.top = pos.y + '%';
    });
  }
  function refresh() {
    if (!lab()) return;
    drawLeds();
    const states = previewStates || getStates();
    const layer = $('rsrLabLedLayer');
    if (layer) [...layer.children].forEach((led, i) => {
      led.classList.toggle('is-on', !!states[i]);
    });
    setText('rsrLabLedStatus', states.map((on, i) => `${i}:${on ? 'ON' : 'OFF'}`).join('  '));
    setText('rsrLabSwitchStatus', $('rsrSwitchState0')?.textContent?.trim() || 'UNKNOWN');
    setText('rsrLabLinkStatus', `NOVA LINK: ${$('connectionText')?.textContent?.trim() || 'NOT VERIFIED'}`);
    setText('rsrLabPowerStatus', 'NOT MONITORED (PHOTO: '+(photoPowerOn?'ON':'OFF')+')');
    if (previewName) {
      setText('rsrLabModeStatus', `${previewName} • LOCAL VISUAL PREVIEW (timing not hardware verified)`);
    }
  }
  function mode(name) {
    show('rsrLabBoard', name !== 'wiring');
    show('rsrLabWiringPanel', name === 'wiring');
    show('rsrLabPinLayer', name === 'pins');
    [['rsrLabViewBoard', 'board'], ['rsrLabViewWiring', 'wiring'], ['rsrLabViewPins', 'pins']]
      .forEach(([id, value]) => $(id)?.setAttribute('aria-pressed', String(value === name)));
    if (!previewName) setText('rsrLabModeStatus', name === 'pins'
      ? 'PIN MAP • awaiting verified coordinate and netlist data'
      : name === 'wiring' ? 'WIRING • verify against actual hardware'
      : 'LEDs reflect NOVA UI state, not independent hardware confirmation');
  }

  function stopPreview() {
    if (previewTimer !== null) clearTimeout(previewTimer);
    previewTimer = null;
    previewStates = null;
    previewName = '';
    previewStep = 0;
    setText('rsrLabModeStatus', 'LEDs reflect NOVA UI state, not independent hardware confirmation');
    refresh();
  }
  function displayPreview(states) {
    previewStates = Array.from({length: 8}, (_, i) => !!states[i]);
    refresh();
    if (previewName) sound(260 + previewStep % 8 * 55, .05, previewName === 'STROBE' ? 'square' : 'sine');
  }
  function schedulePreview(fn, ms) {
    previewTimer = setTimeout(fn, Math.max(15, Math.round(ms / previewSpeed)));
  }
  function setPreviewSpeed(multiplier) {
    const speed = Number(multiplier);
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 4) return false;
    previewSpeed = speed;
    return true;
  }
  function startBlink() {
    stopPreview();
    previewName = 'BLINK';
    let step = 0;
    const tick = () => {
      if (previewName !== 'BLINK') return;
      if (step >= 10) { stopPreview(); return; }
      displayPreview(Array(8).fill(step % 2 === 0));
      step++;
      schedulePreview(tick, 300);
    };
    tick();
  }
  function startMorse(name) {
    stopPreview();
    previewName = name;
    // Three dots, three dashes, three dots; inter-symbol/letter gaps.
    const unit = 180;
    const symbols = ['.','.','.','-','-','-','.','.','.'];
    const events = [];
    symbols.forEach((symbol, i) => {
      events.push({on:true, ms:(symbol === '.' ? 1 : 3) * unit});
      if (i < symbols.length - 1) events.push({on:false, ms:(i === 2 || i === 5 ? 3 : 1) * unit});
    });
    events.push({on:false, ms:unit});
    let idx = 0;
    const tick = () => {
      if (previewName !== name) return;
      if (idx >= events.length) { stopPreview(); return; }
      const event = events[idx++];
      displayPreview(Array(8).fill(event.on));
      schedulePreview(tick, event.ms);
    };
    tick();
  }
  function patternFrame(name, step) {
    const on = Array(8).fill(false);
    const light = (...indices) => indices.forEach(i => { if (i >= 0 && i < 8) on[i] = true; });
    switch (name) {
      case 'knight': {
        const seq = [0,1,2,3,4,5,6,7,6,5,4,3,2,1];
        light(seq[step % seq.length]); break;
      }
      case 'chase': light(step % 8); break;
      case 'reverse': light(7 - step % 8); break;
      case 'center out': {
        const pairs = [[3,4],[2,5],[1,6],[0,7]];
        light(...pairs[step % 4]); break;
      }
      case 'outside in': {
        const pairs = [[0,7],[1,6],[2,5],[3,4]];
        light(...pairs[step % 4]); break;
      }
      case 'alternate': for (let i = step % 2; i < 8; i += 2) light(i); break;
      case 'fill': for (let i = 0; i <= step % 9; i++) light(i); break;
      case 'wave': light(step % 8, (step + 1) % 8, (step + 2) % 8); break;
      case 'police': light(...(step % 2 ? [0,1,2,3] : [4,5,6,7])); break;
      case 'strobe': if (step % 2 === 0) on.fill(true); break;
      default: return null;
    }
    return on;
  }
  function startPattern(name) {
    if (!patternFrame(name, 0)) return;
    stopPreview();
    previewName = name.toUpperCase();
    previewStep = 0;
    const tick = () => {
      if (previewName !== name.toUpperCase()) return;
      displayPreview(patternFrame(name, previewStep++));
      schedulePreview(tick, name === 'strobe' ? 85 : name === 'police' ? 200 : 150);
    };
    tick();
  }

  // Capture clicks on EXISTING controls. Their original onclick handlers still
  // send the real commands exactly once; this listener sends NOTHING to hardware.
  function onOriginalControlClick(event) {
    const button = event.target.closest('button');
    if (!button || !button.closest('.rsrTrainerController')) return;
    const code = button.getAttribute('onclick') || '';
    const label = (button.textContent || '').trim().toUpperCase();
    if (/run(?:Trainer)?Test|runSystemTest/i.test(code) || label === 'RUN TEST') startTestVisual();
    if (code.includes('startTrainerPatternUI')) {
      const pattern = code.match(/startTrainerPatternUI\(\s*['"]([^'"]+)['"]/);
      if (pattern) startPattern(pattern[1].toLowerCase());
    } else if (code.includes('trainerBlink(')) {
      startBlink();
    } else if (code.includes('trainerSOS(')) {
      startMorse('SOS');
    } else if (code.includes('trainerMorse(')) {
      startMorse('MORSE SOS');
    } else if (/stopTrainerSystem\(|toggleTrainerLed\(|toggleTrainerAll\(/.test(code)) {
      stopPreview();
    }
  }

  function mountOriginalControls() {
    const panel = document.querySelector('.rsrTrainerController');
    const host = $('rsrLabExistingControls');
    if (!panel || !host || panel.parentNode === host) return;
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
    stopPreview();
    stopTestVisual();
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
    $('rsrLabDemoReset')?.addEventListener('click', () => { stopTestVisual(); sound(220,.1); });
    $('rsrLabSoundToggle')?.addEventListener('click', () => {
      soundEnabled=!soundEnabled;
      const button=$('rsrLabSoundToggle');
      if (button) { button.textContent=soundEnabled?'🔊 SOUND ON':'🔇 SOUND OFF'; button.setAttribute('aria-pressed',String(soundEnabled)); }
      if (soundEnabled) sound(650,.11,'triangle');
    });
    refreshDemo();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lab() && !lab().hidden) close();
    });
    const panel = document.querySelector('.rsrTrainerController');
    if (panel) panel.addEventListener('click', onOriginalControlClick, true);
    observer = new MutationObserver(() => {
      if (lab() && !lab().hidden) refresh();
    });
    ['rsrSwitchState0', 'connectionText', 'rsrPatternName'].forEach(id => {
      const target = $(id);
      if (target) observer.observe(target, {childList:true, characterData:true, subtree:true});
    });
    if (panel) observer.observe(panel, {attributes:true, attributeFilter:['class','aria-pressed'], subtree:true});
    mode('board');
    refresh();
    return true;
  }
  window.novaRSRLab = {init, open(){init(); return open();}, close, refresh, mode, stopPreview, setPreviewSpeed, startTestVisual};
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
