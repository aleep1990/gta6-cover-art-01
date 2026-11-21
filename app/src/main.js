// Vice Cover Lab v2 — Cast Edition editor wiring.
// Owns the state, the controls, drag/zoom cropping, face-aware framing,
// undo/redo, PNG export and the fixed ?shot= scenes (see ./shots.js).
// Rendering lives in cover.js.
import { drawCover, layoutPanels, anchorCrop, buildBilling, GRADES, LAYOUTS, TITLE_STYLES, SIZES, DEFAULT_ROLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const SAMPLES = ['hero.jpg', 'boss.jpg', 'mechanic.jpg', 'rider.jpg', 'captain.jpg', 'getaway.jpg', 'hideout.jpg'];
const SAMPLE_LABELS = ['Hero · driver', 'Boss', 'Mechanic', 'Rider', 'Captain', 'Getaway car', 'Hideout motel'];

const state = {
  photos: [null, null, null, null, null, null, null],
  roles: [...DEFAULT_ROLES],
  layout: 'cast',
  grade: 'sunset',
  title: 'Neon Tide',
  subtitle: 'last light on the coast',
  tagline: 'Every sunset has a price',
  quote: 'A sunset you can steal — Golden Coast Herald',
  billing: buildBilling('NEON TIDE'),
  billingDirty: false,
  sealText: 'Original Cover Art',
  titleStyle: 'chrome',
  showReview: true,
  showRoles: true,
  showTagline: true,
  showBilling: true,
  showSeal: true,
  showBarcode: true,
  showComingSoon: true,
  faceAware: true,
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
    subtitle: state.subtitle, tagline: state.tagline, quote: state.quote,
    billing: state.billing, billingDirty: state.billingDirty,
    sealText: state.sealText, titleStyle: state.titleStyle,
    showReview: state.showReview, showRoles: state.showRoles,
    showTagline: state.showTagline, showBilling: state.showBilling,
    showSeal: state.showSeal, showBarcode: state.showBarcode,
    showComingSoon: state.showComingSoon, faceAware: state.faceAware,
    grain: state.grain, vignette: state.vignette, heat: state.heat,
    size: state.size, selectedSlot: state.selectedSlot,
    roles: [...state.roles],
    crops: state.photos.map((p) => (p ? { zoom: p.zoom, ox: p.ox, oy: p.oy, manual: !!p.manual } : null)),
  });
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.title = s.title;
  state.subtitle = s.subtitle; state.tagline = s.tagline; state.quote = s.quote;
  state.billing = s.billing; state.billingDirty = s.billingDirty;
  state.sealText = s.sealText; state.titleStyle = s.titleStyle;
  state.showReview = s.showReview; state.showRoles = s.showRoles;
  state.showTagline = s.showTagline; state.showBilling = s.showBilling;
  state.showSeal = s.showSeal; state.showBarcode = s.showBarcode;
  state.showComingSoon = s.showComingSoon; state.faceAware = s.faceAware;
  state.grain = s.grain; state.vignette = s.vignette; state.heat = s.heat;
  state.size = s.size; state.selectedSlot = s.selectedSlot;
  state.roles = [...s.roles];
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

/**
 * Face-aware framing. Tries the browser's native FaceDetector (Chrome
 * Shape Detection, zero dependency, offline); when it is unavailable, or
 * finds no face, falls back to anchoring the upper-centre face region
 * (top 30% of the photo) so a face near the top of the frame stays in
 * its panel. Returns the detected face box in image fractions, or null.
 */
export async function detectFace(img) {
  try {
    if (typeof FaceDetector === 'undefined') return null;
    const detector = new FaceDetector({ fastMode: true });
    const faces = await detector.detect(img);
    if (!faces || !faces.length) return null;
    const b = faces[0].boundingBox;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    return { x: b.x / iw, y: b.y / ih, w: b.width / iw, h: b.height / ih };
  } catch {
    return null;
  }
}

const FALLBACK_FACE = { x: 0.35, y: 0.12, w: 0.3, h: 0.36 };

async function frameFaces() {
  if (!state.faceAware) return;
  const size = sizeDef();
  const panels = layoutPanels(state.layout, size.w, size.h, state.showReview ? Math.round(size.h * 0.052) : 0);
  for (let i = 0; i < state.photos.length; i++) {
    const p = state.photos[i];
    if (!p || p.manual) continue;
    if (!p.face) p.face = await detectFace(p.img);
    const panel = panels.find((pp) => pp.slot === i);
    if (!panel) continue;
    const anchored = anchorCrop(p.img, panel.w, panel.h, p, p.face || FALLBACK_FACE);
    p.ox = anchored.ox;
    p.oy = anchored.oy;
  }
}

async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map((f) => loadImage(`samples/${f}`)));
  state.photos = loaded.map((img) => ({ img, zoom: 1, ox: 0, oy: 0, face: null, manual: false }));
  await frameFaces();
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
  const stripH = state.showReview ? Math.round(size.h * 0.052) : 0;
  const selectedPanel = layoutPanels(state.layout, size.w, size.h, stripH)
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
    b.title = `${SAMPLE_LABELS[i]} — ${state.roles[i]}`;
    b.setAttribute('aria-label', `Photo slot ${i + 1}: ${SAMPLE_LABELS[i]}`);
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
      renderRoles();
      redraw();
    });
    wrap.appendChild(b);
  });
}

function renderRoles() {
  const wrap = document.getElementById('roles');
  wrap.innerHTML = '';
  state.photos.forEach((p, i) => {
    const label = document.createElement('label');
    label.className = 'role-row';
    label.textContent = `${i + 1} · ${SAMPLE_LABELS[i]}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 18;
    input.value = state.roles[i] || '';
    input.setAttribute('aria-label', `Role tag for slot ${i + 1}`);
    input.addEventListener('input', () => {
      state.roles[i] = input.value;
      redraw();
    });
    input.addEventListener('change', () => commit());
    label.appendChild(input);
    wrap.appendChild(label);
  });
}

function buildChips() {
  const lw = document.getElementById('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.name;
    b.dataset.id = l.id;
    b.addEventListener('click', async () => {
      if (state.layout === l.id) return;
      commit();
      state.layout = l.id;
      if (l.id === 'cast' && state.titleStyle !== 'chrome') {
        state.titleStyle = 'chrome';
      }
      await frameFaces();
      syncChips();
      syncControls();
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
  const tw = document.getElementById('title-styles');
  TITLE_STYLES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.name;
    b.dataset.id = t.id;
    b.addEventListener('click', () => {
      if (state.titleStyle === t.id) return;
      commit();
      state.titleStyle = t.id;
      syncChips();
      redraw();
    });
    tw.appendChild(b);
  });
}

function syncChips() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.grade));
  document.querySelectorAll('#title-styles button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.titleStyle));
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
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('quote').value = state.quote;
  document.getElementById('billing').value = state.billing;
  document.getElementById('seal-text').value = state.sealText;
  document.getElementById('show-review').checked = state.showReview;
  document.getElementById('show-roles').checked = state.showRoles;
  document.getElementById('show-tagline').checked = state.showTagline;
  document.getElementById('show-billing').checked = state.showBilling;
  document.getElementById('show-seal').checked = state.showSeal;
  document.getElementById('show-barcode').checked = state.showBarcode;
  document.getElementById('show-coming-soon').checked = state.showComingSoon;
  document.getElementById('face-aware').checked = state.faceAware;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('heat').value = state.heat;
  document.getElementById('heat-value').textContent = `${state.heat} / 5`;
  document.getElementById('size').value = state.size;
  syncChips();
  syncZoom();
  renderSlots();
  renderRoles();
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
    const files = Array.from(e.target.files || []).slice(0, 7);
    if (!files.length) return;
    commit();
    for (let i = 0; i < files.length; i++) {
      const slot = (state.selectedSlot + i) % 7;
      const img = await loadImage(URL.createObjectURL(files[i]));
      state.photos[slot] = { img, zoom: 1, ox: 0, oy: 0, face: null, manual: false };
    }
    await frameFaces();
    renderSlots();
    redraw();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded.`);
  });

  document.getElementById('load-samples').addEventListener('click', async () => {
    commit();
    await loadSamples();
    setStatus('Sample cast loaded — 7 photos, 7 roles.');
  });

  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    if (!state.billingDirty) {
      state.billing = buildBilling((state.title || 'VICE COVER LAB').toUpperCase());
      document.getElementById('billing').value = state.billing;
    }
    redraw();
  });
  document.getElementById('title').addEventListener('change', () => commit());
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('change', () => commit());
  document.getElementById('tagline').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    redraw();
  });
  document.getElementById('tagline').addEventListener('change', () => commit());
  document.getElementById('quote').addEventListener('input', (e) => {
    state.quote = e.target.value;
    redraw();
  });
  document.getElementById('quote').addEventListener('change', () => commit());
  document.getElementById('billing').addEventListener('input', (e) => {
    state.billing = e.target.value;
    state.billingDirty = true;
    redraw();
  });
  document.getElementById('billing').addEventListener('change', () => commit());
  document.getElementById('seal-text').addEventListener('input', (e) => {
    state.sealText = e.target.value;
    redraw();
  });
  document.getElementById('seal-text').addEventListener('change', () => commit());

  const toggle = (id, key) => {
    document.getElementById(id).addEventListener('change', async (e) => {
      commit();
      state[key] = e.target.checked;
      if (key === 'faceAware' && state.faceAware) {
        state.photos.forEach((p) => { if (p) p.manual = false; });
        await frameFaces();
      }
      redraw();
    });
  };
  toggle('show-review', 'showReview');
  toggle('show-roles', 'showRoles');
  toggle('show-tagline', 'showTagline');
  toggle('show-billing', 'showBilling');
  toggle('show-seal', 'showSeal');
  toggle('show-barcode', 'showBarcode');
  toggle('show-coming-soon', 'showComingSoon');
  toggle('face-aware', 'faceAware');
  toggle('grain', 'grain');
  toggle('vignette', 'vignette');

  document.getElementById('reframe').addEventListener('click', async () => {
    state.photos.forEach((p) => { if (p) p.manual = false; });
    await frameFaces();
    redraw();
    setStatus('Faces re-framed in every panel.');
  });

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
    const stripH = state.showReview ? Math.round(canvas.height * 0.052) : 0;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height, stripH);
    for (let i = panels.length - 1; i >= 0; i--) {
      const p = panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  };
  canvas.addEventListener('pointerdown', (ev) => {
    const i = panelAt(ev);
    if (i < 0) return;
    const stripH = state.showReview ? Math.round(canvas.height * 0.052) : 0;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height, stripH);
    state.selectedSlot = panels[i].slot;
    syncZoom();
    renderSlots();
    renderRoles();
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
    const stripH = state.showReview ? Math.round(canvas.height * 0.052) : 0;
    const panels = layoutPanels(state.layout, canvas.width, canvas.height, stripH);
    const panel = panels.find((pp) => pp.slot === drag.slot) || panels[0];
    p.ox += dx / panel.w;
    p.oy += dy / panel.h;
    p.manual = true;
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
    p.manual = true;
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
      if (opts.tagline !== undefined) state.tagline = opts.tagline;
      if (opts.quote !== undefined) state.quote = opts.quote;
      if (opts.titleStyle !== undefined) state.titleStyle = opts.titleStyle;
      if (opts.size) state.size = opts.size;
      if (opts.showReview !== undefined) state.showReview = opts.showReview;
      syncControls();
    },
    frameFaces,
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
