// Fixed scenes for screenshots.
// ?shot=editor shows the editor with the sample photos loaded.
// ?shot=cover shows the cover alone, full-bleed in the viewport, at the
// export size named by &size= (square, portrait or landscape).
// Optional overrides: &layout= &grade= &title= &subtitle=.
// window.__shotReady is set once the scene has painted with real fonts.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await hooks.loadSamples();
  hooks.apply({
    layout: query.get('layout') || undefined,
    grade: query.get('grade') || undefined,
    title: query.get('title') || undefined,
    subtitle: query.get('subtitle') || undefined,
    size: query.get('size') || (shot === 'cover' ? 'landscape' : undefined),
  });
  hooks.redraw();
  // Cover scene, four-panel landscape: the top-left panel holds pier.jpg
  // (slot 0), whose subject — the fisherman's face — sits at the top of
  // the photo, where the default centred cover-fit crops it out (only
  // chin/beard showed). Anchor that panel's crop to the top of the photo
  // so the face is fully in frame. Scoped to this scene, size and layout
  // so the editor scene and the other cover sizes keep their crops.
  if (shot === 'cover'
    && (query.get('size') || 'landscape') === 'landscape'
    && (query.get('layout') || 'four') === 'four'
    && hooks.anchorSlotTop) {
    hooks.anchorSlotTop(0);
  }
  hooks.redraw();
  try {
    await document.fonts.ready;
  } catch {
    // Fonts already failed or are unavailable; the painted cover still counts.
  }
  hooks.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
