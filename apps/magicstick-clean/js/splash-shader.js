// Animated Warp shader filling the space around the splash's before/after
// photo (which is shown uncropped via object-fit:contain, so it doesn't
// fill the whole screen on every aspect ratio). Same teal/gold palette as
// the rest of the site. Built with Paper Shaders' vanilla package, vendored
// as a single pre-bundled file (js/vendor/paper-shaders-warp.min.js) so
// there's no runtime CDN fetch to depend on.
(function () {
  const container = document.getElementById('splashShaderBg');
  const lib = window.PaperShadersWarp;
  if (!container || !lib) return;

  try {
    const { ShaderMount, warpFragmentShader, WarpPatterns, getShaderColorFromString } = lib;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['#0A211D', '#0B5D52', '#127A6C', '#C9A227'].map(getShaderColorFromString);

    new ShaderMount(
      container,
      warpFragmentShader,
      {
        u_colors: colors,
        u_colorsCount: colors.length,
        u_proportion: 0.45,
        u_softness: 1,
        u_shape: WarpPatterns.checks,
        u_shapeScale: 0.1,
        u_distortion: 0.25,
        u_swirl: 0.8,
        u_swirlIterations: 10,
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
    // No WebGL — leave the solid fallback color (see .splash-gate in styles.css).
  }
})();
