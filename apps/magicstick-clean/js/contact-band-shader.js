// Animated Warp shader behind every ".contact-band" CTA section (the quote
// form's header, the careers "Ready to join" band, the gift-cards request
// band) — same technique and vendored library as the splash gate's shader,
// recolored to this site's ink/terracotta/amber palette instead of a flat
// orange fill. Mounts on every ".contact-band-shader-bg" container found;
// safe to include on any page, it simply does nothing if none exist.
(function () {
  const lib = window.PaperShadersWarp;
  if (!lib) return;

  const { ShaderMount, warpFragmentShader, WarpPatterns, getShaderColorFromString } = lib;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = ['#141414', '#D9531F', '#F2703F', '#E8A34D'].map(getShaderColorFromString);

  function mount(container) {
    if (container.dataset.shaderMounted) return;
    // A container hidden behind a not-yet-shown tab/route has zero size —
    // mounting then would initialize the shader at 0x0 and leave it blank
    // even once shown. Skip it for now; mountAll() gets called again once
    // it's actually visible (see the spa:pageshown listener below).
    if (!container.offsetWidth || !container.offsetHeight) return;
    container.dataset.shaderMounted = 'true';
    try {
      new ShaderMount(
        container,
        warpFragmentShader,
        {
          u_colors: colors,
          u_colorsCount: colors.length,
          u_proportion: 0.55,
          u_softness: 1,
          u_shape: WarpPatterns.checks,
          u_shapeScale: 0.08,
          u_distortion: 0.2,
          u_swirl: 0.6,
          u_swirlIterations: 8,
          u_fit: 0,
          u_scale: 1,
          u_rotation: 0,
          u_originX: 0.5,
          u_originY: 0.5,
          u_offsetX: 0,
          u_offsetY: 0,
          u_worldWidth: 0,
          u_worldHeight: 0,
        },
        undefined,
        reducedMotion ? 0 : 1
      );
    } catch (err) {
      // No WebGL — leave the solid fallback color (see .contact-band in styles.css).
    }
  }

  function mountAll() {
    document.querySelectorAll('.contact-band-shader-bg').forEach(mount);
  }

  mountAll();
  // On the real multi-page site every container above is already visible
  // by the time this runs, so mountAll() above is all that's needed. Inside
  // a bundled single-file preview that toggles pages with a `hidden`
  // attribute instead of separate documents, a page's container can still
  // be 0x0 at that point — retry once its page actually becomes visible.
  document.addEventListener('spa:pageshown', mountAll);
})();
