// Fixed scenes for screenshots.
// ?shot=editor shows the editor with the sample cast loaded.
// ?shot=cover shows the cover alone, full-bleed in the viewport, at the
// export size named by &size= (square, portrait or landscape).
// Optional overrides: &layout= &grade= &title= &subtitle= &tagline=
// &quote= &titleStyle=.
// window.__shotReady is set once the scene has painted with real fonts
// and face-aware framing applied.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await hooks.loadSamples();
  hooks.apply({
    layout: query.get('layout') || 'cast',
    grade: query.get('grade') || undefined,
    title: query.get('title') || 'Neon Tide',
    subtitle: query.get('subtitle') || 'last light on the coast',
    tagline: query.get('tagline') || undefined,
    quote: query.get('quote') || undefined,
    titleStyle: query.get('titleStyle') || 'chrome',
    size: query.get('size') || (shot === 'cover' ? 'landscape' : undefined),
  });
  // Face-aware framing for the scene's own layout and size, so every
  // face is fully in frame in every panel of the screenshot.
  if (hooks.frameFaces) await hooks.frameFaces();
  hooks.redraw();
  try {
    await document.fonts.ready;
  } catch {
    // Fonts already failed or are unavailable; the painted cover still counts.
  }
  hooks.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
