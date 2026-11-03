/**
 * 访客首页背景的轻量 WebGL 后期（不用 three.js）。
 *
 * 效果分三层：
 *   1. 全局流场 —— fbm 噪声缓慢推进，画面像隔着热气漂移
 *   2. 光标透镜 —— 鼠标附近画面轻微放大，一眼能看出"这层是活的"
 *   3. 质感 —— 边缘轻微色散、屏幕空间细网点、暗角、颗粒
 *
 * 参数由外部驱动：uScroll（首屏滚动进度）、uTime、光标位置。
 * 失败时返回 null 且画布保持透明，页面回落到 CSS 背景图。
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
uniform vec2  uCssRes;   // 画布 CSS 尺寸
uniform vec2  uImgRes;   // 图片像素尺寸
uniform float uTime;
uniform float uScroll;   // 0..1 首屏滚动进度
uniform vec2  uMouse;    // 0..1，屏幕空间，y 向上
uniform float uPointer;  // 0..1 光标是否已激活（触屏保持 0）
uniform float uAmount;   // 流场强度
uniform float uLens;     // 透镜强度
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
  // cover 适配：保持比例铺满，超出裁掉
  vec2 s = uRes / uImgRes;
  float cover = max(s.x, s.y);
  vec2 uvScale = s / cover;
  vec2 uv = (vUv - 0.5) * uvScale + 0.5;

  // ---- 1. 全局流场 ----
  float t = uTime * 0.14;
  vec2 p = uv * 3.1;
  vec2 flow = vec2(
    fbm(p + vec2(0.0, t)),
    fbm(p + vec2(4.7, -t))
  ) - 0.5;
  vec2 duv = uv + flow * (uAmount * (0.7 + 0.6 * uScroll));

  // ---- 2. 光标透镜：位移与距离成正比 → 纯放大（不会出现环形漩涡）----
  float aspect = uCssRes.x / max(uCssRes.y, 1.0);
  vec2 rel = vUv - uMouse;
  float rr = length(rel * vec2(aspect, 1.0));
  float m = smoothstep(0.22, 0.02, rr) * uPointer;
  vec2 screenOff = -rel * uLens * m;
  // 屏幕位移换算回 uv 空间（cover 是等比变换，方向不变，只缩放幅度）
  duv += screenOff * uvScale;
  duv = clamp(duv, 0.002, 0.998);

  // ---- 3. 采样 + 边缘色散 ----
  float dc = length(vUv - 0.5);
  float ca = 0.0015 * dc * (0.7 + uScroll);
  vec3 col;
  col.r = texture2D(uTex, duv + vec2(ca, 0.0)).r;
  col.g = texture2D(uTex, duv).g;
  col.b = texture2D(uTex, duv - vec2(ca, 0.0)).b;

  // ---- 4. 屏幕空间细网点（按 CSS 像素，约 8px 一格）----
  if (uDots > 0.001) {
    vec2 g = fract(vUv * uCssRes / 8.0) - 0.5;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float radius = sqrt(clamp(lum, 0.0, 1.0)) * 0.5;
    float mask = smoothstep(radius, radius - 0.14, length(g));
    col = mix(col, col * (0.88 + 0.12 * mask), uDots);
  }

  // ---- 5. 暗角 + 颗粒 ----
  col *= mix(0.78, 1.0, smoothstep(1.25, 0.25, dc));
  col += (hash(vUv * uRes + uTime) - 0.5) * 0.014;

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
    console.warn('[heroFluid] shader compile failed:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/** 创建背景后期。返回 null 表示不支持或失败，调用方应回落到 CSS 背景。
 *
 * opts.ambient = false 时关闭「自动流动」（uAmount 归零、时间冻结），
 * 只保留用户主动移动鼠标触发的透镜 —— 用于 prefers-reduced-motion 场景：
 * 尊重"不要自动播放动效"，但保留由用户操作驱动的反馈。
 */
export function createHeroFluid(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  opts?: { ambient?: boolean },
): HeroFluidHandle | null {
  const ambient = opts?.ambient !== false
  // alpha: true —— 未绘制时画布透明，失败不会盖成黑块
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  }) as WebGLRenderingContext | null
  if (!gl) return null

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[heroFluid] program link failed:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

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
    uPointer: gl.getUniformLocation(prog, 'uPointer'),
    uAmount: gl.getUniformLocation(prog, 'uAmount'),
    uLens: gl.getUniformLocation(prog, 'uLens'),
    uDots: gl.getUniformLocation(prog, 'uDots'),
  }

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)

  let ready = false
  let disposed = false
  let raf = 0
  let scroll = 0
  let mx = 0.5
  let my = 0.5
  let tmx = 0.5
  let tmy = 0.5
  let pointer = 0
  let tPointer = 0
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
    if (scroll > 0.995) return

    mx += (tmx - mx) * 0.12
    my += (tmy - my) * 0.12
    pointer += (tPointer - pointer) * 0.08

    gl.useProgram(prog)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(U.uTex, 0)
    gl.uniform1f(U.uTime, ambient ? (now - start) / 1000 : 0)
    gl.uniform1f(U.uScroll, scroll)
    gl.uniform2f(U.uMouse, mx, my)
    gl.uniform1f(U.uPointer, pointer)
    gl.uniform1f(U.uAmount, ambient ? 0.010 : 0)
    gl.uniform1f(U.uLens, 0.22)
    gl.uniform1f(U.uDots, 0.20)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)

  const onPointer = (e: PointerEvent) => {
    tmx = e.clientX / Math.max(1, window.innerWidth)
    tmy = 1 - e.clientY / Math.max(1, window.innerHeight)
    tPointer = 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    if (disposed) return
    const iw = img.naturalWidth || 1
    const ih = img.naturalHeight || 1
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.uniform2f(U.uImgRes, iw, ih)
    resize()
    ready = true
  }
  img.onerror = () => {
    console.warn('[heroFluid] background image failed to load; falling back to CSS background')
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
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
