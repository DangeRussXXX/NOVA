/* NOVA RSR PIN MAP v1 — non-invasive database browser.
   Does not change existing LED animation, commands, or board coordinates.
   Photo pin coordinates are not yet calibrated: no markers are invented. */
(function () {
  'use strict';
  const DATA_URL = 'hardware/rsr-trainer/rsr-pinmap.json';
  let pins = null;
  let loading = null;
  let panel = null;
  const $ = id => document.getElementById(id);
  function ensurePanel() {
    const viewport = $('rsrLabBoardViewport');
    if (!viewport) return null;
    if (panel && panel.isConnected) return panel;
    panel = document.createElement('section');
    panel.id = 'rsrPinmapBrowser';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'RSR breadboard pin database');
    Object.assign(panel.style, {
      position: 'absolute', inset: '8px', zIndex: '50', overflow: 'auto',
      padding: '16px', borderRadius: '12px', color: '#eef6ff',
      background: 'rgba(11,22,36,.97)', border: '1px solid #52718b',
      boxSizing: 'border-box'
    });
    panel.innerHTML = `
      <h3 style="margin:0 0 8px">RSR PIN MAP · DATABASE v1</h3>
      <p style="margin:0 0 12px;font-size:13px">1,660 provisional records. Physical photo coordinates and electrical continuity are not yet verified.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <input id="rsrPinSearch" aria-label="Search pin ID" placeholder="Search BB1-A1, BB2-J63, rail..." style="flex:1;min-width:180px;padding:10px;color:#111;background:white;border-radius:6px" />
        <select id="rsrPinBoard" aria-label="Filter board" style="padding:10px;color:#111;background:white;border-radius:6px"><option value="ALL">All records</option><option value="BB1">Breadboard 1</option><option value="BB2">Breadboard 2</option><option value="UNASSIGNED">Unassigned rails</option></select>
      </div>
      <div id="rsrPinCount" role="status" style="margin-bottom:8px;font-size:13px"></div>
      <div style="overflow:auto;max-height:55vh"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left">Pin ID</th><th style="text-align:left">Board</th><th style="text-align:left">Section</th><th style="text-align:left">Status</th></tr></thead><tbody id="rsrPinRows"></tbody></table></div>
      <p style="font-size:12px;opacity:.8">Displaying up to 100 matches. Rail positions are provisional. Photo overlay calibration comes next.</p>`;
    // Keep panel above the photo without moving the existing photo or LED overlay.
    if (getComputedStyle(viewport).position === 'static') viewport.style.position = 'relative';
    viewport.appendChild(panel);
    $('rsrPinSearch').addEventListener('input', render);
    $('rsrPinBoard').addEventListener('change', render);
    return panel;
  }
  function render() {
    if (!pins || !ensurePanel()) return;
    const q = $('rsrPinSearch').value.trim().toUpperCase();
    const board = $('rsrPinBoard').value;
    const matching = pins.filter(p =>
      (board === 'ALL' || p.board === board) &&
      (!q || String(p.id).toUpperCase().includes(q))
    );
    $('rsrPinCount').textContent = `${matching.length.toLocaleString()} matching records`;
    const tbody = $('rsrPinRows');
    tbody.replaceChildren();
    matching.slice(0, 100).forEach(p => {
      const tr = document.createElement('tr');
      [p.id, p.board, p.section, p.status].forEach(value => {
        const td = document.createElement('td');
        td.textContent = String(value ?? '');
        td.style.padding = '6px 8px';
        td.style.borderBottom = '1px solid #33465a';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  function load() {
    if (pins) return Promise.resolve(pins);
    if (loading) return loading;
    loading = fetch(DATA_URL, {cache: 'no-store'})
      .then(r => { if (!r.ok) throw new Error('Pin map HTTP ' + r.status); return r.json(); })
      .then(data => {
        if (!Array.isArray(data.pins)) throw new Error('JSON missing pins array');
        pins = data.pins;
        return pins;
      })
      .catch(e => { loading = null; throw e; });
    return loading;
  }
  function showPins() {
    const p = ensurePanel();
    if (!p) return;
    p.hidden = false;
    $('rsrPinCount').textContent = 'Loading pin database...';
    load().then(render).catch(e => {
      $('rsrPinCount').textContent = 'Unable to load pin map: ' + e.message;
      console.error('RSR pin map:', e);
    });
  }
  function hidePins() { if (panel) panel.hidden = true; }
  // Capture handles lazily inserted RSR markup; existing handlers remain intact.
  document.addEventListener('click', event => {
    const btn = event.target.closest?.('button');
    if (!btn) return;
    if (btn.id === 'rsrLabViewPins') showPins();
    else if (btn.id === 'rsrLabViewBoard' || btn.id === 'rsrLabViewWiring' || btn.id === 'rsrLabClose') hidePins();
  });
  window.novaRSRPinmap = {show: showPins, hide: hidePins, reload() { pins = null; loading = null; showPins(); }};
})();
