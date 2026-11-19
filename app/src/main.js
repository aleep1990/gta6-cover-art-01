// Vice Cover Lab — editor wiring.
// Owns the state, the controls, drag/zoom cropping, undo/redo, PNG export
// and the fixed ?shot= scenes (see ./shots.js). Rendering lives in cover.js.
import { drawCover, layoutPanels, topAnchorOy, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const SAMPLES = ['pier.jpg', 'boulevard.jpg', 'neon-street.jpg', 'palm-sunset.jpg'];

const state = {
  photos: [null, null, null, null],
  layout: 'four',
  grade: 'sunset',
  title: 'Neon Boulevard',
  subtitle: 'chasing the sunset',
  gradientTitle: true,
  grain: true,
  vignette: true,
  heat: 5,
  size: 'square',
  selectedSlot: 0,
};

let undoStack = [];
let redoStack = [];

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, gradientTitle: state.gradientTitle,
    grain: state.grain, vignette: state.vignette, heat: state.heat,
    size: state.size, selectedSlot: state.selectedSlot,
    crops: state.photos.map((p) => (p ? { zoom: p.zoom, ox: p.ox, oy: p.oy } : null)),
  });
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.title = s.title;
  state.subtitle = s.subtitle; state.gradientTitle = s.gradientTitle;
  state.grain = s.grain; state.vignette = s.vignette; state.heat = s.heat;
  state.size = s.size; state.selectedSlot = s.selectedSlot;
  s.crops.forEach((c, i) => {
    if (c && state.photos[i]) Object.assign(state.photos[i], c);
  });
  syncControls();
}

function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
  redraw();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
  redraw();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map((f) => loadImage(`samples/${f}`)));
  state.photos = loaded.map((img) => ({ img, zoom: 1, ox: 0, oy: 0 }));
  renderSlots();
  redraw();
}

function sizeDef() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function redraw() {
  const size = sizeDef();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  const selectedPanel = layoutPanels(state.layout, size.w, size.h)
    .findIndex((p) => p.slot === state.selectedSlot);
  // Cover scenes are exports: never draw the editor selection outline there.
  const select = document.body.classList.contains('shot-cover') ? -1 : selectedPanel;
  drawCover(canvas, state, { select });
}

function renderSlots() {
  const wrap = document.getElementById('slots');
  wrap.innerHTML = '';
  state.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (i === state.selectedSlot ? ' selected' : '') + (p ? '' : ' empty');
    b.title = `Photo slot ${i + 1}${p ? '' : ' — empty, upload a photo'}`;
    b.setAttribute('aria-label', `Photo slot ${i + 1}`);
    if (p) {
      const img = document.createElement('img');
      img.src = p.img.src;
      img.alt = '';
      b.appendChild(img);
    } else {
      b.textContent = '+';
    }
    b.addEventListener('click', () => {
      state.selectedSlot = i;
      syncZoom();
      renderSlots();
      redraw();
    });
    wrap.appendChild(b);
  });
}

function buildChips() {
  const lw = document.getElementById('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.name;
    b.dataset.id = l.id;
    b.addEventListener('click', () => {
      if (state.layout === l.id) return;
      commit();
      state.layout = l.id;
      syncChips();
      redraw();
    });
    lw.appendChild(b);
  });
  const gw = document.getElementById('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = g.id;
    const mid = g.stops[Math.floor(g.stops.length / 2)];
    const last = g.stops[g.stops.length - 1];
    const dot = document.createElement('span');
    dot.className = 'grade-dot';
    dot.style.background = `linear-gradient(135deg, rgb(${mid[1]},${mid[2]},${mid[3]}), rgb(${last[1]},${last[2]},${last[3]}))`;
    b.appendChild(dot);
    b.appendChild(document.createTextNode(g.name));
    b.addEventListener('click', () => {
      if (state.grade === g.id) return;
      commit();
      state.grade = g.id;
      syncChips();
      redraw();
    });
    gw.appendChild(b);
  });
}

function syncChips() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.grade));
}

function syncZoom() {
  const p = state.photos[state.selectedSlot];
  const zoom = document.getElementById('zoom');
  zoom.value = p ? Math.round(p.zoom * 100) : 100;
  document.getElementById('zoom-value').textContent = `${zoom.value}%`;
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('gradient-title').checked = state.gradientTitle;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('heat').value = state.heat;
  document.getElementById('heat-value').textContent = `${state.heat} / 5`;
  document.getElementById('size').value = state.size;
  syncChips();
  syncZoom();
  renderSlots();
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function exportPng(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || sizeDef();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, {});
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Saved vice-cover-${size.w}x${size.h}.png`);
      resolve();
    }, 'image/png');
  });
}

// Exposed for the screenshot scenes: renders a cover of the given size and
// resolves with its PNG data URL, so a headless run can save the real export.
window.__exportCover = (sizeId) => {
  const size = SIZES.find((s) => s.id === sizeId) || sizeDef();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state, {});
  return off.toDataURL('image/png');
};

function bindControls() {
  document.getElementById('upload').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (!files.length) return;
    commit();
    for (let i = 0; i < files.length; i++) {
      const slot = (state.selectedSlot + i) % 4;
      const img = await loadImage(URL.createObjectURL(files[i]));
      state.photos[slot] = { img, zoom: 1, ox: 0, oy: 0 };
    }
    renderSlots();
    redraw();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded.`);
  });

  document.getElementById('load-samples').addEventListener('click', async () => {
    commit();
    await loadSamples();
    setStatus('Sample photos loaded.');
  });

  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('title').addEventListener('change', () => commit());
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('change', () => commit());

  const toggle = (id, key) => {
    document.getElementById(id).addEventListener('change', (e) => {
      commit();
      state[key] = e.target.checked;
      redraw();
    });
  };
  toggle('gradient-title', 'gradientTitle');
  toggle('grain', 'grain');
  toggle('vignette', 'vignette');

  document.getElementById('heat').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    document.getElementById('heat-value').textContent = `${state.heat} / 5`;
    redraw();
  });
  document.getElementById('heat').addEventListener('change', () => commit());

  document.getElementById('zoom').addEventListener('input', (e) => {
    const p = state.photos[state.selectedSlot];
    if (!p) return;
    p.zoom = Number(e.target.value) / 100;
    document.getElementById('zoom-value').textContent = `${e.target.value}%`;
    redraw();
  });
  document.getElementById('zoom').addEventListener('change', () => commit());

  document.getElementById('size').addEventListener('change', (e) => {
    commit();
    state.size = e.target.value;
    redraw();
  });

  document.getElementById('export').addEventListener('click', () => exportPng(state.size));
  document.getElementById('export-all').addEventListener('click', async () => {
    for (const s of SIZES) {
      await exportPng(s.id);
      await new Promise((r) => setTimeout(r, 250));
    }
    setStatus('Saved all three sizes.');
  });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);

  // Drag to pan the photo inside its panel; wheel to zoom it.
  let drag = null;
  const panelAt = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const i = panelAt(ev);
    if (i < 0) return;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    state.selectedSlot = panels[i].slot;
    syncZoom();
    renderSlots();
    drag = { slot: panels[i].slot, x: ev.clientX, y: ev.clientY, moved: false };
    canvas.setPointerCapture(ev.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = state.photos[drag.slot];
    if (!p) return;
    const rect = canvas.getBoundingClientRect();
    const dx = ((ev.clientX - drag.x) / rect.width) * canvas.width;
    const dy = ((ev.clientY - drag.y) / rect.height) * canvas.height;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    const panel = panels.find((pp) => pp.slot === drag.slot) || panels[0];
    p.ox += dx / panel.w;
    p.oy += dy / panel.h;
    drag.x = ev.clientX;
    drag.y = ev.clientY;
    drag.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = state.photos[state.selectedSlot];
    if (!p) return;
    p.zoom = Math.min(3, Math.max(1, p.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    syncZoom();
    redraw();
  }, { passive: false });
}

buildChips();
bindControls();
syncControls();
syncUndoButtons();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadSamples,
    apply: (opts) => {
      if (opts.layout) state.layout = opts.layout;
      if (opts.grade) state.grade = opts.grade;
      if (opts.title !== undefined) state.title = opts.title;
      if (opts.subtitle !== undefined) state.subtitle = opts.subtitle;
      if (opts.size) state.size = opts.size;
      syncControls();
    },
    // Shot scenes only: anchor one slot's crop to the top of its photo so a
    // subject at the top of the frame (a face) stays in its panel.
    anchorSlotTop: (slot) => {
      const p = state.photos[slot];
      if (!p) return;
      const size = sizeDef();
      const panel = layoutPanels(state.layout, size.w, size.h)
        .find((pp) => pp.slot === slot);
      if (panel) p.oy = topAnchorOy(p.img, panel.w, panel.h, p);
    },
    redraw,
  });
} else {
  loadSamples().catch(() => redraw());
}

// Fonts arrive after the first paint; redraw once they are in so the
// Anton / Pacifico lettering is real, not a fallback.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => redraw());
}
