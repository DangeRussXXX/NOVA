/* NOVA RSR PIN MAP v3 — individual, manually verified photo pin placement.
   Drop-in replacement for hardware/rsr-trainer/rsr-pinmap-view.js.
   Does not send commands to the trainer or change LED functionality.
   The dots are visual markers ONLY; electrical continuity is unverified.
*/
(function () {
  'use strict';
  if (window.novaRSRPinmapV3) return;
  const $ = id => document.getElementById(id);
  const DATA_URL = 'hardware/rsr-trainer/rsr-pinmap.json';
  const STORE = 'nova.rsr.pinmap.individual.v3';
  const LEGACY = 'nova.rsr.pinmap.calibration.v2';
  let records = [], panel, overlay, active = false, selectedBoard = 'BB1';
  let selectedPin = '', placementMode = false, showAll = false, positions = {};
  let drag = null;
  try { const parsed = JSON.parse(localStorage.getItem(STORE) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) positions = parsed; } catch (_) {}
  const image = () => $('rsrLabPhoto');
  const board = () => $('rsrLabBoard');
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(positions)); return true; } catch (e) { status('Could not save positions: ' + e.message); return false; } }
  function status(message) { const el = $('rsrMapStatus'); if (el) el.textContent = message; }
  function getPin() { return records.find(p => p.id === selectedPin); }
  function isMain(p) { return p && p.section === 'MAIN' && /^[A-J]$/.test(p.row) && Number.isInteger(p.column); }
  function boardPins(name) { return records.filter(p => p.board === name); }
  function pointFromEvent(e) { const r = image().getBoundingClientRect(); return { x: Math.max(0, Math.min(100, 100 * (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(100, 100 * (e.clientY - r.top) / r.height)) }; }
  function setPoint(id, point) { positions[id] = { x: +point.x.toFixed(5), y: +point.y.toFixed(5) }; persist(); render(); status(id + ' positioned and saved. VISUAL ONLY — no electrical signal.'); }
  function ensure() {
    const viewport = $('rsrLabBoardViewport'), b = board(), img = image();
    if (!viewport || !b || !img) return false;
    if (!panel || !panel.isConnected) {
      panel = document.createElement('section'); panel.id = 'rsrPinmapBrowser'; panel.hidden = true;
      panel.setAttribute('aria-label', 'Individual RSR breadboard pin mapper');
      Object.assign(panel.style, { position: 'relative', zIndex: '65', background: 'rgba(7,23,35,.97)', color: '#e5faff', padding: '12px', border: '1px solid #26b8d6', borderRadius: '8px', font: '13px Arial,sans-serif', boxSizing: 'border-box', maxHeight: '48%', overflow: 'auto' });
      panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px"><strong style="color:#16d7f5">RSR PIN MAP · INDIVIDUAL PIN MAPPER v3</strong><span id="rsrMapProgress"></span></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <label for="rsrMapBoard">BOARD</label><select id="rsrMapBoard"><option value="BB1">BB1 — UPPER</option><option value="BB2">BB2 — LOWER</option></select>
          <label for="rsrMapSearch">PIN ID</label><input id="rsrMapSearch" placeholder="BB1-A1" aria-label="Pin ID" style="width:135px;padding:6px;background:#fff;color:#111">
          <button type="button" id="rsrMapFind">SELECT PIN</button>
          <button type="button" id="rsrMapPrev">◀ PREVIOUS</button><button type="button" id="rsrMapNext">NEXT ▶</button>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <button type="button" id="rsrMapLight">● MARKER ON</button>
          <button type="button" id="rsrMapPlace">PLACE SELECTED PIN: OFF</button>
          <button type="button" id="rsrMapRemove">CLEAR PIN POSITION</button>
          <label><input type="checkbox" id="rsrMapAll"> SHOW ALL SAVED PINS</label>
          <button type="button" id="rsrMapExport">EXPORT BACKUP</button>
          <button type="button" id="rsrMapImport">IMPORT BACKUP</button>
          <input type="file" id="rsrMapFile" accept=".json,application/json" hidden>
        </div>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <strong id="rsrMapSelection" style="color:#fff67a">No pin selected</strong>
          <span>FINE TUNE:</span><button type="button" data-nudge="0,-1">↑</button><button type="button" data-nudge="-1,0">←</button><button type="button" data-nudge="1,0">→</button><button type="button" data-nudge="0,1">↓</button>
          <label for="rsrMapStep">STEP</label><select id="rsrMapStep"><option value="0.05">0.05%</option><option value="0.1" selected>0.1%</option><option value="0.25">0.25%</option><option value="0.5">0.5%</option></select>
        </div>
        <div id="rsrMapStatus" role="status" style="color:#a9e2ee;margin-bottom:6px">Select a pin, turn on its marker, then PLACE SELECTED PIN and click its hole in the photo.</div>
        <div style="color:#adc4cd">Each pin saves its own photo X/Y position in this browser. Drag the yellow dot to adjust. Export a backup regularly. Visual indicators only — breadboard pins are NOT electrically energized.</div>`;
      viewport.parentNode.insertBefore(panel, viewport);
      const buttonStyle = 'background:#07364b;color:#eaffff;border:1px solid #269bc0;border-radius:5px;padding:6px;cursor:pointer';
      panel.querySelectorAll('button').forEach(el => el.style.cssText = buttonStyle);
      panel.querySelectorAll('select').forEach(el => el.style.cssText = buttonStyle);
      $('rsrMapBoard').value = selectedBoard;
      $('rsrMapBoard').addEventListener('change', e => { selectedBoard = e.target.value; selectedPin = boardPins(selectedBoard)[0]?.id || ''; render(); });
      $('rsrMapFind').addEventListener('click', find);
      $('rsrMapSearch').addEventListener('keydown', e => { if (e.key === 'Enter') find(); });
      $('rsrMapPrev').addEventListener('click', () => advance(-1));
      $('rsrMapNext').addEventListener('click', () => advance(1));
      $('rsrMapLight').addEventListener('click', () => { const visible = $('rsrMapLight').dataset.on !== '0'; $('rsrMapLight').dataset.on = visible ? '0' : '1'; render(); });
      $('rsrMapPlace').addEventListener('click', () => { placementMode = !placementMode; render(); if (placementMode) status('Click the physical hole for ' + selectedPin + ' in the trainer PHOTO.'); });
      $('rsrMapRemove').addEventListener('click', () => { if (!selectedPin || !positions[selectedPin]) return; if (!confirm('Clear saved position for ' + selectedPin + '?')) return; delete positions[selectedPin]; persist(); render(); });
      $('rsrMapAll').addEventListener('change', e => { showAll = e.target.checked; render(); });
      panel.querySelectorAll('[data-nudge]').forEach(el => el.addEventListener('click', () => { if (!selectedPin || !positions[selectedPin]) return status('Place this pin first.'); const [dx, dy] = el.dataset.nudge.split(',').map(Number); const step = +$('rsrMapStep').value; const p = positions[selectedPin]; setPoint(selectedPin, { x: Math.max(0, Math.min(100, p.x + dx * step)), y: Math.max(0, Math.min(100, p.y + dy * step)) }); }));
      $('rsrMapExport').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ version: 3, type: 'nova-rsr-individual-pin-positions', positions }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NOVA_RSR_PIN_POSITIONS_BACKUP.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
      $('rsrMapImport').addEventListener('click', () => $('rsrMapFile').click());
      $('rsrMapFile').addEventListener('change', async e => { const f = e.target.files?.[0]; if (!f) return; try { const data = JSON.parse(await f.text()); if (data.type !== 'nova-rsr-individual-pin-positions' || !data.positions || typeof data.positions !== 'object') throw Error('Not a NOVA RSR v3 backup'); const allowed = new Set(records.map(p => p.id)); const incoming = {}; for (const [id, p] of Object.entries(data.positions)) { if (!allowed.has(id) || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) throw Error('Invalid pin data: ' + id); incoming[id] = { x: p.x, y: p.y }; } if (!confirm('Import ' + Object.keys(incoming).length + ' pin positions? This will replace existing saved positions.')) return; positions = incoming; persist(); render(); status('Imported ' + Object.keys(incoming).length + ' positions.'); } catch (err) { status('Import failed: ' + err.message); } finally { e.target.value = ''; } });
    }
    if (!overlay || !overlay.isConnected) {
      overlay = document.createElement('div'); overlay.id = 'rsrPinmapHoleLayer';
      Object.assign(overlay.style, { position: 'absolute', inset: '0', zIndex: '45', pointerEvents: 'none' }); b.appendChild(overlay);
    }
    if (!img.dataset.rsrPinmapV3Bound) {
      img.dataset.rsrPinmapV3Bound = '1';
      img.addEventListener('click', e => { if (!active || !placementMode || !selectedPin || drag) return; setPoint(selectedPin, pointFromEvent(e)); placementMode = false; render(); });
    }
    return true;
  }
  function advance(direction) { const list = boardPins(selectedBoard); const i = list.findIndex(p => p.id === selectedPin); if (!list.length) return; selectedPin = list[Math.max(0, Math.min(list.length - 1, i + direction))].id; placementMode = false; render(); }
  function select(id) { const p = records.find(x => x.id === id); if (!p) return status('Pin ' + id + ' is not in rsr-pinmap.json.'); selectedPin = id; selectedBoard = p.board; placementMode = false; render(); status(id + (positions[id] ? ' has a saved photo position.' : ' has no position yet. Click PLACE SELECTED PIN, then click the photo.')); }
  function find() { const id = ($('rsrMapSearch')?.value || '').trim().toUpperCase(); if (id) select(id); }
  function marker(p, point, isSelected) {
    const imgRect = image().getBoundingClientRect(), bRect = board().getBoundingClientRect();
    const left = 100 * (imgRect.left - bRect.left + imgRect.width * point.x / 100) / (bRect.width || 1);
    const top = 100 * (imgRect.top - bRect.top + imgRect.height * point.y / 100) / (bRect.height || 1);
    const dot = document.createElement('button'); dot.type = 'button'; dot.title = p.id + ' — visual position only'; dot.setAttribute('aria-label', p.id);
    Object.assign(dot.style, { position: 'absolute', left: left + '%', top: top + '%', transform: 'translate(-50%,-50%)', width: isSelected ? '18px' : '8px', height: isSelected ? '18px' : '8px', padding: '0', border: isSelected ? '2px solid #fff' : '1px solid #06dfff', borderRadius: '50%', background: isSelected ? '#fff000' : '#00d7ed', boxShadow: isSelected ? '0 0 15px 5px #ffd500' : '0 0 3px #00eaff', cursor: 'grab', pointerEvents: 'auto', touchAction: 'none' });
    dot.addEventListener('click', e => { e.stopPropagation(); if (drag) return; select(p.id); });
    dot.addEventListener('pointerdown', e => { if (!active) return; e.preventDefault(); e.stopPropagation(); selectedPin = p.id; selectedBoard = p.board; $('rsrMapSelection').textContent = p.id + ' ✓ SAVED'; $('rsrMapSearch').value = p.id; drag = { id: p.id, pointer: e.pointerId, moved: false }; dot.setPointerCapture(e.pointerId); });
    dot.addEventListener('pointermove', e => { if (!drag || drag.pointer !== e.pointerId) return; drag.moved = true; const pt = pointFromEvent(e); const ir = image().getBoundingClientRect(), br = board().getBoundingClientRect(); dot.style.left = (100 * (ir.left - br.left + ir.width * pt.x / 100) / (br.width || 1)) + '%'; dot.style.top = (100 * (ir.top - br.top + ir.height * pt.y / 100) / (br.height || 1)) + '%'; });
    dot.addEventListener('pointerup', e => { if (!drag || drag.pointer !== e.pointerId) return; const id = drag.id, moved = drag.moved; drag = null; if (moved) setPoint(id, pointFromEvent(e)); else render(); });
    dot.addEventListener('pointercancel', () => { drag = null; render(); });
    return dot;
  }
  function render() {
    if (!ensure()) return;
    $('rsrMapBoard').value = selectedBoard;
    $('rsrMapSearch').value = selectedPin;
    $('rsrMapSelection').textContent = selectedPin ? selectedPin + (positions[selectedPin] ? ' ✓ SAVED' : ' · UNMAPPED') : 'No pin selected';
    $('rsrMapPlace').textContent = 'PLACE SELECTED PIN: ' + (placementMode ? 'ON — CLICK PHOTO' : 'OFF');
    const light = $('rsrMapLight').dataset.on !== '0'; $('rsrMapLight').textContent = light ? '● MARKER ON' : '○ MARKER OFF';
    const valid = new Set(records.map(p => p.id));
    const mapped = Object.keys(positions).filter(id => valid.has(id)).length;
    $('rsrMapProgress').textContent = mapped + ' / ' + records.length + ' pins positioned';
    overlay.replaceChildren();
    if (active) {
      const pins = showAll ? records.filter(p => positions[p.id] && (p.board === selectedBoard || p.id === selectedPin)) : [];
      const chosen = getPin(); if (light && chosen && positions[chosen.id] && !pins.some(p => p.id === chosen.id)) pins.push(chosen);
      const frag = document.createDocumentFragment();
      pins.forEach(p => { if (p.id === selectedPin && !light) return; frag.appendChild(marker(p, positions[p.id], p.id === selectedPin)); });
      overlay.appendChild(frag);
    }
  }
  function show() { if (!ensure()) return; panel.hidden = false; active = true; if (!selectedPin && records.length) selectedPin = records[0].id; render(); }
  function hide() { active = false; placementMode = false; drag = null; if (panel) panel.hidden = true; if (overlay) overlay.replaceChildren(); }
  function loadAndShow() { if (records.length) return show(); fetch(DATA_URL, { cache: 'no-store' }).then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); }).then(data => { if (!Array.isArray(data.pins)) throw Error('Missing pins array'); records = data.pins; show(); }).catch(err => { if (ensure()) { panel.hidden = false; active = true; status('Could not load pin database: ' + err.message); } }); }
  document.addEventListener('click', e => { const btn = e.target.closest?.('button'); if (!btn) return; if (btn.id === 'rsrLabViewPins') Promise.resolve().then(loadAndShow); else if (['rsrLabViewBoard', 'rsrLabViewWiring', 'rsrLabClose'].includes(btn.id)) hide(); });
  window.addEventListener('resize', () => { if (active) render(); });
  window.novaRSRPinmapV3 = { show: loadAndShow, hide, render, getPositions: () => JSON.parse(JSON.stringify(positions)) };
})();
