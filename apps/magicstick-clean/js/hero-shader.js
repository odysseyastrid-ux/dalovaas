// Animated Warp shader behind the hero's text and CTAs, built with Paper
// Shaders' vanilla (non-React) package, loaded straight from a CDN since
// this site has no bundler. Runs entirely on top of the hero's solid dark
// fallback background (see .hero in styles.css), so a network hiccup or a
// browser without WebGL just leaves that flat color in place.
const container = document.getElementById('heroShaderBg');

if (container) {
  try {
    const { ShaderMount, warpFragmentShader, WarpPatterns, getShaderColorFromString } = await import(
      'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.80/dist/index.js'
    );

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['#121212', '#9470ff', '#121212', '#8838ff'].map(getShaderColorFromString);

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
    // Offline, CDN blocked, or no WebGL — leave the solid fallback color.
  }
}
