/**
 * 访客首页背景的轻量 WebGL 后期（不用 three.js）。
 *
 * 做法与 alche.studio 同一思路的简化版：一张全屏 quad，片元着色器里
 *   - 用 fbm 噪声生成流场，轻微扰动 UV（画面像隔着热气流动）
 *   - 边缘极轻的色散
 *   - 屏幕空间细网点（halftone）+ 暗角 + 颗粒
 * 参数 uScroll / uTime 由外部驱动。
 *
 * 失败时返回 null，页面回落到 CSS 背景图，不会出现空白。
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2  uRes;      // 画布像素尺寸
uniform vec2  uCssRes;   // 画布 CSS 尺寸（网点按 CSS 像素算，避免高清屏网点过密）
uniform vec2  uImgRes;   // 图片像素尺寸
uniform float uTime;
uniform float uScroll;   // 0..1 首屏滚动进度
uniform vec2  uMouse;    // -0.5..0.5
uniform float uAmount;   // 扭曲强度
uniform float uDots;     // 网点权重

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  // cover 适配：保持比例铺满，超出部分裁掉
  vec2 s = uRes / uImgRes;
  float cover = max(s.x, s.y);
  vec2 uv = (vUv - 0.5) * (s / cover) + 0.5;

  // 流场扰动
  float t = uTime * 0.055;
  vec2 p = uv * 2.6;
  vec2 flow = vec2(
    fbm(p + vec2(0.0, t)),
    fbm(p + vec2(4.7, -t))
  ) - 0.5;

  float amt = uAmount * (0.55 + 0.45 * uScroll);
  vec2 duv = uv + flow * amt + uMouse * 0.006;
  duv = clamp(duv, 0.002, 0.998);

  // 边缘轻微色散
  float d = length(vUv - 0.5);
  float ca = 0.0016 * d * (0.6 + uScroll);
  vec3 col;
  col.r = texture2D(uTex, duv + vec2(ca, 0.0)).r;
  col.g = texture2D(uTex, duv).g;
  col.b = texture2D(uTex, duv - vec2(ca, 0.0)).b;

  // 屏幕空间细网点（按 CSS 像素，~7px 一格）
  if (uDots > 0.001) {
    vec2 cellUv = vUv * uCssRes / 7.0;
    vec2 g = fract(cellUv) - 0.5;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float radius = sqrt(clamp(lum, 0.0, 1.0)) * 0.52;
    float mask = smoothstep(radius, radius - 0.12, length(g));
    vec3 dotted = col * (0.86 + 0.14 * mask);
    col = mix(col, dotted, uDots);
  }

  // 暗角
  float vig = smoothstep(1.25, 0.28, d);
  col *= mix(0.80, 1.0, vig);

  // 极轻颗粒，避免渐变出现色带
  col += (hash(vUv * uRes + uTime) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

export interface HeroFluidHandle {
  setScroll(p: number): void
  dispose(): void
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[heroFluid] shader 编译失败:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/** 创建背景后期。返回 null 表示不支持/失败，调用方应回落到 CSS 背景。 */
export function createHeroFluid(canvas: HTMLCanvasElement, imageUrl: string): HeroFluidHandle | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  }) as WebGLRenderingContext | null
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[heroFluid] program 链接失败:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

  // 全屏三角形
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const U = {
    uTex: gl.getUniformLocation(prog, 'uTex'),
    uRes: gl.getUniformLocation(prog, 'uRes'),
    uCssRes: gl.getUniformLocation(prog, 'uCssRes'),
    uImgRes: gl.getUniformLocation(prog, 'uImgRes'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uScroll: gl.getUniformLocation(prog, 'uScroll'),
    uMouse: gl.getUniformLocation(prog, 'uMouse'),
    uAmount: gl.getUniformLocation(prog, 'uAmount'),
    uDots: gl.getUniformLocation(prog, 'uDots'),
  }

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

  let imgW = 1
  let imgH = 1
  let ready = false
  let disposed = false
  let raf = 0
  let scroll = 0
  let mx = 0
  let my = 0
  let tmx = 0
  let tmy = 0
  const start = performance.now()

  const MAX_PIXELS = 2_200_000

  function resize() {
    const cssW = Math.max(1, canvas.clientWidth)
    const cssH = Math.max(1, canvas.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let scale = dpr
    if (cssW * cssH * dpr * dpr > MAX_PIXELS) {
      scale = Math.sqrt(MAX_PIXELS / (cssW * cssH))
    }
    const w = Math.max(1, Math.round(cssW * scale))
    const h = Math.max(1, Math.round(cssH * scale))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(U.uRes, w, h)
    gl.uniform2f(U.uCssRes, cssW, cssH)
  }

  function draw(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(draw)
    if (!ready || document.hidden) return

    // 面板已经缩小到几乎看不见时省掉渲染
    if (scroll > 0.995) return

    mx += (tmx - mx) * 0.06
    my += (tmy - my) * 0.06

    gl.useProgram(prog)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(U.uTex, 0)
    gl.uniform1f(U.uTime, (now - start) / 1000)
    gl.uniform1f(U.uScroll, scroll)
    gl.uniform2f(U.uMouse, mx, my)
    gl.uniform1f(U.uAmount, 0.016)
    gl.uniform1f(U.uDots, 0.18)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)

  const onPointer = (e: PointerEvent) => {
    tmx = e.clientX / window.innerWidth - 0.5
    tmy = e.clientY / window.innerHeight - 0.5
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    if (disposed) return
    imgW = img.naturalWidth || 1
    imgH = img.naturalHeight || 1
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.uniform2f(U.uImgRes, imgW, imgH)
    resize()
    ready = true
  }
  img.onerror = () => {
    console.warn('[heroFluid] 背景图加载失败，回落到 CSS 背景')
  }
  img.src = imageUrl

  raf = requestAnimationFrame(draw)

  return {
    setScroll(p: number) {
      scroll = Math.min(1, Math.max(0, p))
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointer)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      const lose = gl.getExtension('WEBGL_lose_context')
      lose?.loseContext()
    },
  }
}
