// Vice Cover Lab — cover renderer.
// Draws a multi-panel poster cover onto any canvas: photos are placed into
// layout panels, re-graded with a gradient map, and finished with bold
// Anton lettering, a neon Pacifico subtitle, a badge ribbon, a heat meter,
// a halftone title block, grain and a vignette. Pure Canvas 2D, no network.

export const GRADES = [
  {
    id: 'sunset', name: 'Vice Sunset', strength: 0.55,
    stops: [[0, 18, 8, 42], [0.25, 122, 28, 92], [0.55, 255, 108, 58], [0.8, 255, 172, 92], [1, 255, 242, 205]],
  },
  {
    id: 'neon', name: 'Neon Night', strength: 0.6,
    stops: [[0, 4, 18, 36], [0.3, 0, 118, 132], [0.6, 178, 38, 162], [0.85, 255, 58, 182], [1, 255, 222, 242]],
  },
  {
    id: 'golden', name: 'Golden Hour', strength: 0.5,
    stops: [[0, 32, 18, 8], [0.35, 122, 72, 22], [0.65, 232, 152, 62], [1, 255, 232, 172]],
  },
  {
    id: 'noir', name: 'Noir', strength: 0.85,
    stops: [[0, 0, 0, 0], [0.5, 128, 120, 110], [1, 255, 250, 240]],
  },
  {
    id: 'palm', name: 'Palm Teal', strength: 0.55,
    stops: [[0, 4, 26, 20], [0.35, 0, 112, 92], [0.7, 62, 202, 142], [1, 222, 255, 212]],
  },
  {
    id: 'hotpink', name: 'Hot Pink', strength: 0.55,
    stops: [[0, 42, 4, 42], [0.35, 162, 10, 112], [0.7, 255, 62, 132], [1, 255, 182, 92]],
  },
];

export const LAYOUTS = [
  { id: 'four', name: 'Four-Panel Grid' },
  { id: 'hero', name: 'Hero + Three' },
  { id: 'bleed', name: 'Full-Bleed' },
  { id: 'nine', name: 'Nine-Panel Grid' },
  { id: 'tilted', name: 'Tilted Snapshot' },
  { id: 'split', name: 'Vertical Split' },
];

export const SIZES = [
  { id: 'square', name: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'landscape', name: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
];

const BG = '#160a26';
const FRAME = '#fdf7ef';

/** Panels for a layout, in cover coordinates. Each panel: {x, y, w, h, slot, rot, polaroid}. */
export function layoutPanels(layout, W, H) {
  const gap = Math.round(Math.min(W, H) * 0.014);
  const titleH = Math.round(H * 0.24);
  const top = 0;
  const bottom = H - titleH;
  const inset = Math.round(Math.min(W, H) * 0.018);
  const area = { x: inset, y: inset, w: W - inset * 2, h: bottom - inset - top };
  const grid = (cols, rows, slotOf) => {
    const out = [];
    const cw = (area.w - gap * (cols - 1)) / cols;
    const ch = (area.h - gap * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: area.x + c * (cw + gap), y: area.y + r * (ch + gap),
          w: cw, h: ch, slot: slotOf(r, c), rot: 0, polaroid: false,
        });
      }
    }
    return out;
  };
  switch (layout) {
    case 'hero': {
      const heroW = area.w * 0.62;
      const sideW = area.w - heroW - gap;
      const sh = (area.h - gap * 2) / 3;
      const out = [{ x: area.x, y: area.y, w: heroW, h: area.h, slot: 0, rot: 0, polaroid: false }];
      for (let i = 0; i < 3; i++) {
        out.push({ x: area.x + heroW + gap, y: area.y + i * (sh + gap), w: sideW, h: sh, slot: 1 + i, rot: 0, polaroid: false });
      }
      return out;
    }
    case 'bleed':
      return [{ x: area.x, y: area.y, w: area.w, h: area.h, slot: 0, rot: 0, polaroid: false }];
    case 'nine':
      return grid(3, 3, (r, c) => (r * 3 + c) % 4);
    case 'tilted': {
      const pw = area.w * 0.44;
      const ph = area.h * 0.46;
      const cx = area.x + area.w / 2;
      const cy = area.y + area.h / 2;
      const rots = [-7, -2, 4, 8];
      const offs = [[-0.26, -0.24], [0.24, -0.26], [-0.24, 0.24], [0.26, 0.26]];
      return rots.map((rot, i) => ({
        x: cx - pw / 2 + offs[i][0] * area.w, y: cy - ph / 2 + offs[i][1] * area.h,
        w: pw, h: ph, slot: i, rot, polaroid: true,
      }));
    }
    case 'split': {
      const lw = area.w * 0.55;
      return [
        { x: area.x, y: area.y, w: lw, h: area.h, slot: 0, rot: 0, polaroid: false },
        { x: area.x + lw + gap, y: area.y, w: area.w - lw - gap, h: area.h, slot: 1, rot: 0, polaroid: false },
      ];
    }
    case 'four':
    default:
      return grid(2, 2, (r, c) => (r * 2 + c) % 4);
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }

function gradeColor(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t <= b[0] || i === stops.length - 2) {
      const f = b[0] === a[0] ? 0 : Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
      return [lerp(a[1], b[1], f), lerp(a[2], b[2], f), lerp(a[3], b[3], f)];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}

/** Gradient-maps an image region: luminance drives a colour ramp. Returns a canvas. */
export function gradeImage(img, w, h, grade, crop) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const ctx = c.getContext('2d');
  drawCoverFit(ctx, img, c.width, c.height, crop);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const s = grade.strength;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    const [r, g, b] = gradeColor(grade.stops, lum);
    px[i] = px[i] + (r - px[i]) * s;
    px[i + 1] = px[i + 1] + (g - px[i + 1]) * s;
    px[i + 2] = px[i + 2] + (b - px[i + 2]) * s;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/** oy (in panel-height fractions) that aligns the top edge of img with the
 * top edge of a (w, h) panel under the same cover-fit as drawCoverFit.
 * Use it for a photo whose subject sits at the top of the frame (a face
 * near the top edge) so the cover-fit's vertical centring cannot crop it
 * out. Returns 0 when the fitted image is no taller than the panel. */
export function topAnchorOy(img, w, h, crop) {
  const zoom = crop && crop.zoom ? crop.zoom : 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dh = ih * scale;
  if (dh <= h) return 0;
  return (dh - h) / (2 * h);
}

/** Draws img cover-fitting (w, h), with crop {zoom, ox, oy} in panel fractions. */
export function drawCoverFit(ctx, img, w, h, crop) {
  const zoom = crop && crop.zoom ? crop.zoom : 1;
  const ox = crop && crop.ox ? crop.ox : 0;
  const oy = crop && crop.oy ? crop.oy : 0;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2 + ox * w, (h - dh) / 2 + oy * h, dw, dh);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrain(ctx, W, H) {
  const rnd = mulberry32(20261119);
  const count = Math.round((W * H) / 260);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,2,16,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawHalftone(ctx, x, y, w, h) {
  const step = Math.max(9, Math.round(h / 5));
  ctx.fillStyle = 'rgba(255,120,90,0.55)';
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const px = x + col * step + (row % 2 ? step / 2 : 0);
      const py = y + row * step;
      const r = Math.max(1, step * 0.22 * (1 - (px - x) / w) + 0.6);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fitFont(ctx, text, family, weight, maxW, startSize) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Renders the whole cover. `state.photos` are {img, zoom, ox, oy} or null. */
export function drawCover(canvas, state, opts) {
  const options = opts || {};
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  const titleH = Math.round(H * 0.24);
  const bandY = H - titleH;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  panels.forEach((p, i) => {
    const slot = state.photos[p.slot] || null;
    const img = slot && slot.img ? slot.img : null;
    ctx.save();
    if (p.rot) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.translate(-p.w / 2, -p.h / 2);
    } else {
      ctx.translate(p.x, p.y);
    }
    if (p.polaroid) {
      ctx.fillStyle = FRAME;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      ctx.fillRect(-p.w * 0.045, -p.h * 0.05, p.w * 1.09, p.h * 1.14);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(0, 0, p.w, p.h);
    ctx.clip();
    if (img) {
      const graded = gradeImage(img, p.w, p.h, grade, slot);
      ctx.drawImage(graded, 0, 0, p.w, p.h);
    } else {
      const g = ctx.createLinearGradient(0, 0, p.w, p.h);
      g.addColorStop(0, '#3a1c52');
      g.addColorStop(1, '#1c0f30');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.round(p.h * 0.09)}px "Bebas Neue", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', p.w / 2, p.h / 2);
    }
    ctx.restore();
    if (!p.polaroid) {
      ctx.save();
      ctx.strokeStyle = FRAME;
      ctx.lineWidth = Math.max(2, Math.round(Math.min(W, H) * 0.004));
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    }
    if (options.select === i) {
      ctx.save();
      ctx.strokeStyle = '#ff5e8a';
      ctx.lineWidth = Math.max(3, Math.round(Math.min(W, H) * 0.006));
      ctx.setLineDash([14, 8]);
      ctx.strokeRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
      ctx.restore();
    }
  });

  // Title band: dark scrim, halftone strip, big Anton title, neon Pacifico subtitle.
  const scrim = ctx.createLinearGradient(0, bandY - titleH * 0.35, 0, H);
  scrim.addColorStop(0, 'rgba(22,10,38,0)');
  scrim.addColorStop(0.35, 'rgba(22,10,38,0.88)');
  scrim.addColorStop(1, 'rgba(22,10,38,0.96)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - titleH * 0.35, W, titleH * 1.35);
  drawHalftone(ctx, W * 0.04, bandY + titleH * 0.08, W * 0.2, titleH * 0.5);

  const pad = W * 0.045;
  const title = (state.title || '').trim().toUpperCase() || 'VICE COVER LAB';
  const titleSize = fitFont(ctx, title, '"Anton", sans-serif', 400, W - pad * 2 - W * 0.22, Math.round(titleH * 0.52));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = bandY + titleH * 0.56;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a26';
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeText(title, pad, titleY);
  if (state.gradientTitle) {
    const tg = ctx.createLinearGradient(pad, titleY - titleSize, pad, titleY);
    tg.addColorStop(0, '#ffe259');
    tg.addColorStop(0.45, '#ff7e5f');
    tg.addColorStop(1, '#ff2e88');
    ctx.fillStyle = tg;
  } else {
    ctx.fillStyle = '#ffffff';
  }
  ctx.fillText(title, pad, titleY);

  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.round(titleH * 0.26);
    ctx.font = `${subSize}px "Pacifico", cursive`;
    ctx.fillStyle = '#ff8fd0';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(subSize * 0.55);
    ctx.fillText(subtitle, pad, bandY + titleH * 0.88);
    ctx.shadowBlur = 0;
  }

  // Badge ribbon, top right.
  const badgeText = 'VICE COVER LAB \u2022 2026';
  const badgeSize = Math.round(Math.min(W, H) * 0.026);
  ctx.font = `${badgeSize}px "Bebas Neue", sans-serif`;
  const bw = ctx.measureText(badgeText).width + badgeSize * 1.6;
  const bh = badgeSize * 1.9;
  ctx.save();
  ctx.translate(W - bw / 2 - W * 0.02, bh * 0.9);
  ctx.rotate(0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 0, 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  // Heat meter: five stars, filled to state.heat.
  const heat = Math.max(0, Math.min(5, state.heat || 5));
  const starSize = Math.round(titleH * 0.2);
  const starY = bandY + titleH * 0.82;
  let starX = W - pad - starSize * 5 - 4 * 6;
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < heat ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('\u2605', starX + i * (starSize + 6), starY);
  }

  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);

  // Thin outer frame.
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = Math.max(3, Math.round(Math.min(W, H) * 0.006));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}
