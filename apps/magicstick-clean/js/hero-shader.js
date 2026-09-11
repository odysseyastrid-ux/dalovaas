// Animated Warp shader behind the hero's text and CTAs, in the site's own
// teal/gold palette. Built with Paper Shaders' vanilla (non-React) package,
// vendored as a single pre-bundled, tree-shaken file (js/vendor/paper-
// shaders-warp.min.js — just ShaderMount + the warp shader + its color
// parser, built with esbuild) so there's no runtime CDN fetch or ES module
// import chain to depend on.
(function () {
  const container = document.getElementById('heroShaderBg');
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
    // No WebGL — leave the solid fallback color (see .hero in styles.css).
  }
})();
