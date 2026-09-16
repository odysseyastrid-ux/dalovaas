import { useEffect, useRef } from 'react'

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.35;

  // Turbulence flowing upward, two octaves, like rising heat/flame.
  vec2 flowUv = vec2(p.x * 1.6, p.y * 2.2 - t * 1.2);
  float n1 = noise(flowUv * 2.0);
  float n2 = noise(flowUv * 4.0 + 10.0) * 0.5;
  float turbulence = n1 + n2;

  float grad = 1.0 - uv.y;
  float flicker = 0.94 + 0.06 * sin(t * 6.0 + turbulence * 3.0);
  float mixVal = clamp((grad * 0.5 + turbulence * 0.5) * flicker + 0.15, 0.0, 1.0);

  vec3 red = vec3(0.847, 0.204, 0.161);
  vec3 gold = vec3(0.961, 0.651, 0.137);
  vec3 yellow = vec3(1.0, 0.839, 0.4);

  vec3 color = mix(red, gold, smoothstep(0.15, 0.65, mixVal));
  color = mix(color, yellow, smoothstep(0.7, 1.0, mixVal));

  // Rising ember sparks.
  float emberField = noise(vec2(p.x * 8.0, p.y * 10.0 - t * 3.0));
  float embers = smoothstep(0.86, 0.98, emberField) * smoothstep(0.0, 0.6, grad);
  color += embers * vec3(1.0, 0.9, 0.6) * 0.8;

  // Soft vignette for depth.
  float vign = smoothstep(1.3, 0.3, length(p));
  color *= mix(0.75, 1.0, vign);

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export function FlameShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return
    const glContext = gl as WebGLRenderingContext

    const program = glContext.createProgram()!
    glContext.attachShader(program, compileShader(glContext, glContext.VERTEX_SHADER, VERTEX_SRC))
    glContext.attachShader(program, compileShader(glContext, glContext.FRAGMENT_SHADER, FRAGMENT_SRC))
    glContext.linkProgram(program)
    glContext.useProgram(program)

    const buffer = glContext.createBuffer()
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer)
    glContext.bufferData(
      glContext.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      glContext.STATIC_DRAW,
    )
    const posLoc = glContext.getAttribLocation(program, 'a_position')
    glContext.enableVertexAttribArray(posLoc)
    glContext.vertexAttribPointer(posLoc, 2, glContext.FLOAT, false, 0, 0)

    const timeLoc = glContext.getUniformLocation(program, 'u_time')
    const resLoc = glContext.getUniformLocation(program, 'u_resolution')

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth * dpr
      const h = canvas.clientHeight * dpr
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        glContext.viewport(0, 0, w, h)
      }
    }

    const render = (now: number) => {
      resize()
      glContext.uniform1f(timeLoc, (now - start) / 1000)
      glContext.uniform2f(resLoc, canvas.width, canvas.height)
      glContext.drawArrays(glContext.TRIANGLES, 0, 6)
      if (!reducedMotion) raf = requestAnimationFrame(render)
    }

    render(start)

    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
