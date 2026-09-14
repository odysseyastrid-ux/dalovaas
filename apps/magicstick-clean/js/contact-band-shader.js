// Animated Warp shader behind every ".contact-band" CTA section (the quote
// form's header, the careers "Ready to join" band, the gift-cards request
// band) — same technique and vendored library as the splash gate's shader,
// recolored to this site's ink/terracotta/amber palette instead of a flat
// orange fill. Mounts on every ".contact-band-shader-bg" container found;
// safe to include on any page, it simply does nothing if none exist.
(function () {
  const containers = document.querySelectorAll('.contact-band-shader-bg');
  const lib = window.PaperShadersWarp;
  if (!containers.length || !lib) return;

  const { ShaderMount, warpFragmentShader, WarpPatterns, getShaderColorFromString } = lib;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = ['#141414', '#D9531F', '#F2703F', '#E8A34D'].map(getShaderColorFromString);

  containers.forEach((container) => {
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
  });
})();
