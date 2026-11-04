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
uniform float uSparks;   // 火星强度（0 = 关闭）
uniform vec2  uCam;      // 镜头位移（uv 空间）

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

/** 飘火星：按格子分布，每格一颗，向上飘 + 左右摆动 + 闪烁。
 *  returns (亮度, 暖色权重) */
vec2 sparks(vec2 uv, float t, float amt) {
  float acc = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    float fl = float(layer);
    // 两层不同尺度，避免看出网格
    vec2 g = uv * vec2(16.0 + fl * 9.0, 8.0 + fl * 4.5);
    g.y += t * (0.055 + fl * 0.035);          // 向上飘
    g.x += sin(t * 0.35 + fl * 2.1) * 0.20;   // 整体轻微摆动

    vec2 cell = floor(g);
    vec2 f = fract(g);
    float rnd = hash(cell + fl * 37.0);

    // 每格只有一部分是火星
    if (rnd > 0.24) continue;

    vec2 center = vec2(0.30 + hash(cell + 11.0) * 0.40,
                       0.25 + hash(cell + 23.0) * 0.50);
    // 每颗自己的横向漂移
    center.x += sin(t * (0.5 + rnd) + rnd * 6.28) * 0.06;

    float d = length(f - center);
    float size = mix(0.070, 0.028, hash(cell + 5.0));
    float core = smoothstep(size, 0.0, d);

    // 闪烁
    float twinkle = 0.55 + 0.45 * sin(t * (1.4 + rnd * 2.2) + rnd * 6.28);

    // 越靠上方越淡（像飘散）；也会在顶部淡出
    float fade = smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.72, uv.y);

    acc += core * twinkle * fade;
  }
  return vec2(clamp(acc, 0.0, 1.6), amt);
}

void main() {
  // cover 适配：保持比例铺满，超出裁掉
  vec2 s = uRes / uImgRes;
  float cover = max(s.x, s.y);
  vec2 uvScale = s / cover;

  // 镜头余量：画面先放大 OVERSCAN 倍，剩下的空间才够平移。
  // 必须满足 (OVERSCAN - 1) / 2 >= 最大平移量，否则平移时就会露出原图边界之外。
  // 放大得越多，画面看起来就越"贴脸"，所以余量取到刚好够用即可。
  const float OVERSCAN = 1.09;
  vec2 uv = (vUv - 0.5) * uvScale / OVERSCAN + 0.5 + uCam;

  // ---- 1. 全局流场 ----
  float t = uTime * 0.20;
  vec2 p = uv * 3.1;
  vec2 flow = vec2(
    fbm(p + vec2(0.0, t)),
    fbm(p + vec2(4.7, -t))
  ) - 0.5;
  vec2 base = uv + flow * (uAmount * (0.7 + 0.6 * uScroll));

  // ---- 2. 光标透镜：按比例缩放（真放大镜）。m=0 处等于原图，边缘不撕裂 ----
  float aspect = uCssRes.x / max(uCssRes.y, 1.0);
  vec2 uvMouse = (uMouse - 0.5) * uvScale + 0.5;
  float rr = length((vUv - uMouse) * vec2(aspect, 1.0));
  float m = smoothstep(0.30, 0.05, rr) * uPointer;
  vec2 relUv = base - uvMouse;
  float zoom = 1.0 + uLens * m;
  vec2 duv = uvMouse + relUv / zoom;
  duv = clamp(duv, 0.002, 0.998);

  // ---- 3. 采样 + 边缘色散 ----
  // 采样 UV 必须先夹到 [0,1]，否则平移/透镜/流场把 UV 推出边界后
  // GL_CLAMP_TO_EDGE 会把边缘像素拉成条纹，看起来像"画面外面还有东西"
  vec2 suv = clamp(duv, 0.0015, 0.9985);
  float dc = length(vUv - 0.5);
  float ca = 0.0015 * dc * (0.7 + uScroll);
  vec3 col;
  col.r = texture2D(uTex, clamp(suv + vec2(ca, 0.0), 0.0015, 0.9985)).r;
  col.g = texture2D(uTex, suv).g;
  col.b = texture2D(uTex, clamp(suv - vec2(ca, 0.0), 0.0015, 0.9985)).b;

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

  // ---- 6. 飘火星（叠在背景之上、字标之下——字标是 DOM，天然在上层）----
  if (uSparks > 0.001) {
    vec2 sp = sparks(uv, uTime, uSparks);
    float b = sp.x * uSparks;
    // 暖色：核心偏白黄，外侧橙红
    vec3 warm = mix(vec3(1.0, 0.42, 0.12), vec3(1.0, 0.92, 0.72), clamp(b, 0.0, 1.0));
    col += warm * b * 1.15;
  }

  // ---- 6. 超出原图的范围：镜像补边，而不是留黑/拉条纹 ----
  // 透镜、流场、镜头平移都可能把 UV 推出 [0,1]，这里把它折回画面内
  // （triangle wave），边缘会无缝延续，看不出"画面之外"
  if (duv.x < 0.0 || duv.x > 1.0 || duv.y < 0.0 || duv.y > 1.0) {
    vec3 mirrored;
    vec2 muv = clamp(abs(fract(duv * 0.5) * 2.0 - 1.0), 0.0015, 0.9985);
    mirrored.r = texture2D(uTex, muv).r;
    mirrored.g = texture2D(uTex, muv).g;
    mirrored.b = texture2D(uTex, muv).b;
    col = mix(col, mirrored, 0.85);
  }

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
  opts?: { ambient?: boolean; pixelRatio?: number },
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
    uSparks: gl.getUniformLocation(prog, 'uSparks'),
    uCam: gl.getUniformLocation(prog, 'uCam'),
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
  /** 最近一次移动的时间：静止一段时间后镜头自动归位 */
  let lastMoveAt = 0
  /** 镜头位移（uv 空间），平滑跟随光标 */
  let camX = 0
  let camY = 0
  const start = performance.now()

  /** 鼠标停下多久后开始回中（毫秒） */
  const RECENTER_AFTER_MS = 1400
  /** 每帧向中心靠拢的比例（越小越慢） */
  const RECENTER_RATE = 0.022

  const MAX_PIXELS = 2_200_000

  function resize() {
    const cssW = Math.max(1, canvas.clientWidth)
    const cssH = Math.max(1, canvas.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // pixelRatio 是使用方给的额外缩放系数（<1 表示降分辨率换性能）。
    // 内嵌在影院屏幕里时用 0.75：画面看不出差别，填充率省一半。
    let scale = dpr * (opts?.pixelRatio ?? 1)
    if (cssW * cssH * dpr * dpr * (opts?.pixelRatio ?? 1) * (opts?.pixelRatio ?? 1) > MAX_PIXELS) {
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

    // 鼠标静止一段时间后，目标点缓缓回到画面中心，像镜头自动回正
    if (lastMoveAt && now - lastMoveAt > RECENTER_AFTER_MS) {
      tmx += (0.5 - tmx) * RECENTER_RATE
      tmy += (0.5 - tmy) * RECENTER_RATE
      // 归位过程中逐渐淡出透镜，避免停在某个位置时一直鼓着一块
      tPointer = 0
    }

    // 光标偏移驱动镜头缓慢移动。方向与鼠标一致（画面跟着鼠标走）。
    // 最大值必须小于 shader 里的余量 (OVERSCAN - 1) / 2 = 0.045，这里留安全系数。
    // 注意采样坐标减去偏移量，视觉上画面才会朝 offset 的方向平移。
    const CAMERA_SHIFT = 0.035
    // 采样坐标加上 +offset 时画面会往 -offset 方向移动，
    // 取负号后画面就与鼠标同向：鼠标往右，画面往右。
    const cx = -(0.5 - mx) * 2 * CAMERA_SHIFT
    const cy = -(0.5 - my) * 2 * CAMERA_SHIFT
    // 0.035 的跟随系数 = 很慢的镜头推移，鼠标停下后会继续滑行一小段
    camX += (cx - camX) * 0.035
    camY += (cy - camY) * 0.035
    pointer += (tPointer - pointer) * 0.08

    gl.useProgram(prog)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.uniform1i(U.uTex, 0)
    gl.uniform1f(U.uTime, ambient ? (now - start) / 1000 : 0)
    gl.uniform1f(U.uScroll, scroll)
    gl.uniform2f(U.uMouse, mx, my)
    gl.uniform1f(U.uPointer, pointer)
    gl.uniform1f(U.uAmount, ambient ? 0.018 : 0)
    gl.uniform1f(U.uLens, 0.45)
    gl.uniform1f(U.uDots, 0.20)
    gl.uniform1f(U.uSparks, ambient ? 1.0 : 0.0)
    gl.uniform2f(U.uCam, camX, camY)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)

  const onPointer = (e: PointerEvent) => {
    tmx = e.clientX / Math.max(1, window.innerWidth)
    tmy = 1 - e.clientY / Math.max(1, window.innerHeight)
    tPointer = 1
    lastMoveAt = performance.now()
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
