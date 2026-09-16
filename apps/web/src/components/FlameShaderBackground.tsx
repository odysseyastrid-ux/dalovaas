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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.25;
  float n = sin(p.x * 3.0 + t) + sin(p.y * 4.0 - t * 1.3) + sin((p.x + p.y) * 5.0 + t * 0.8);
  n = n / 3.0;

  float grad = 1.0 - uv.y;
  float mixVal = clamp(grad * 0.55 + n * 0.35 + 0.32, 0.0, 1.0);

  vec3 red = vec3(0.847, 0.204, 0.161);
  vec3 gold = vec3(0.961, 0.651, 0.137);
  vec3 yellow = vec3(1.0, 0.839, 0.4);

  vec3 color = mix(red, gold, smoothstep(0.0, 0.6, mixVal));
  color = mix(color, yellow, smoothstep(0.65, 1.0, mixVal));

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
