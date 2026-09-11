// Mounts the real Paper Shaders "Static Mesh Gradient" on the footer,
// using the vendored vanilla-JS build of @paper-design/shaders (Apache-2.0,
// see ./LICENSE and ./NOTICE) — the exact same shader the React
// `<StaticMeshGradient>` component renders, since this site has no
// npm/build step to install the React package itself.
//
// Props below are exactly the ones given for this footer (this is in
// fact @paper-design/shaders-react's own "Default" preset):
//   colors: ["#ffad0a", "#6200ff", "#e2a3ff", "#ff99fd"]
//   positions: 2, waveX: 1, waveXShift: 0.6, waveY: 1, waveYShift: 0.21,
//   mixing: 0.93, grainMixer: 0, grainOverlay: 0, rotation: 270
//
// "Static" is literal: the shader has no time uniform at all — it only
// changes when `positions` changes. To animate it (as asked), this file
// drifts `positions` itself on a requestAnimationFrame loop instead of
// relying on ShaderMount's built-in speed/time system, which this
// particular shader doesn't use.
import { ShaderMount } from './shader-mount.js';
import { staticMeshGradientFragmentShader } from './shaders/static-mesh-gradient.js';
import { getShaderColorFromString } from './get-shader-color-from-string.js';
import { defaultObjectSizing, ShaderFitOptions } from './shader-sizing.js';

const footer = document.getElementById('siteFooter');
if (footer) {
  const colors = ['#ffad0a', '#6200ff', '#e2a3ff', '#ff99fd'];
  const basePositions = 2;

  const uniforms = {
    u_colors: colors.map(getShaderColorFromString),
    u_colorsCount: colors.length,
    u_positions: basePositions,
    u_waveX: 1,
    u_waveXShift: 0.6,
    u_waveY: 1,
    u_waveYShift: 0.21,
    u_mixing: 0.93,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    // Sizing uniforms — same defaults @paper-design/shaders-react uses,
    // with rotation overridden to the requested 270.
    u_fit: ShaderFitOptions[defaultObjectSizing.fit],
    u_rotation: 270,
    u_scale: defaultObjectSizing.scale,
    u_offsetX: defaultObjectSizing.offsetX,
    u_offsetY: defaultObjectSizing.offsetY,
    u_originX: defaultObjectSizing.originX,
    u_originY: defaultObjectSizing.originY,
    u_worldWidth: defaultObjectSizing.worldWidth,
    u_worldHeight: defaultObjectSizing.worldHeight,
  };

  let mount;
  try {
    mount = new ShaderMount(footer, staticMeshGradientFragmentShader, uniforms, undefined, 0, 0);
  } catch (e) {
    mount = null; // No WebGL2 — the footer just keeps its plain background.
  }

  if (mount) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      let rafId = null;
      let visible = true;
      function drift(now){
        mount.setUniforms({ u_positions: basePositions + now * 0.00006 });
        if (visible) rafId = requestAnimationFrame(drift);
        else rafId = null;
      }
      const io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible && rafId === null) rafId = requestAnimationFrame(drift);
      }, { threshold: 0 });
      io.observe(footer);
      rafId = requestAnimationFrame(drift);
    }
  }
}
