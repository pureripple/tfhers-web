<template>
  <div ref="rootEl" class="guest-home" role="main" :class="{ 'guest-home--fx-ready': fxReady }">
    <header
      class="guest-home-top"
      :style="{ backgroundColor: `rgba(0, 0, 0, ${topBarAlpha})` }"
    >
      <RouterLink :to="{ name: 'home' }" class="guest-home-brand" aria-label="TFHers 首页">
        <img src="/images/logo.png" alt="" class="guest-home-logo" width="40" height="40" />
        <span class="guest-home-brand-text">TFHers</span>
      </RouterLink>
      <button type="button" class="guest-home-login" @click="goLogin">登录</button>
    </header>
            <!-- corridor: 4 walls around hero; lines converge to panel; denser as you walk back -->
            <div ref="spaceLayerEl" class="guest-home-space guest-home-space--corridor" :style="spaceLayerStyle" aria-hidden="true">
        <svg
          class="guest-home-corridor-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path ref="ringPathEl" class="guest-home-corridor-ring" fill="none" />
          <path ref="rayPathEl" class="guest-home-corridor-ray" fill="none" />
        </svg>
      </div>

<!--
      sticky rails: phase1 scale to ~25%, phase2 lift up (no -100vh sync);
      corridor lines on L/R/ceil/floor densify with p; transform only on .guest-home-panel-fx
    -->
    <div ref="rail1El" class="guest-home-rail guest-home-rail--hero">
      <section class="guest-home-panel guest-home-panel--hero" aria-label="首页">
        <div class="guest-home-panel-fx" :style="heroFxStyle">
          <div class="guest-home-hero-bg" aria-hidden="true" />
          <div class="guest-home-center">
            <h1 class="guest-home-title">
              <!-- 马克笔手写风 wordmark：白字 + 黑描边，居中偏上，小字跟下面 -->
              <svg class="guest-home-wordmark" viewBox="0 0 700 190" role="img" aria-label="TFHers">
                <text
                  x="350"
                  y="158"
                  text-anchor="middle"
                  font-family="'Permanent Marker', 'Plus Jakarta Sans', system-ui, sans-serif"
                  font-size="150"
                  letter-spacing="1"
                  fill="#ffffff"
                  stroke="#000000"
                  stroke-width="12"
                  stroke-linejoin="round"
                  paint-order="stroke"
                >TFHers</text>
              </svg>
            </h1>
            <p class="guest-home-tagline">Them&apos;s Fightin&apos; Herds 玩家们的社区</p>
          </div>
          <p class="guest-home-scroll-hint" aria-hidden="true">向下滚动</p>
        </div>
      </section>
    </div>

    <div ref="rail2El" class="guest-home-rail guest-home-rail--more">
      <section class="guest-home-panel guest-home-panel--more" aria-label="关于与预览">
        <div class="guest-home-panel-fx guest-home-panel-fx--more" :style="moreFxStyle">
          <div class="guest-home-roster">
            <div
              ref="floatArenaEl"
              class="guest-home-float-arena"
              role="list"
              aria-label="角色漂浮展示"
              @mouseleave="clearFloatHover"
            >
              <button
                v-for="(item, i) in gallery"
                :key="item.src"
                :ref="(el) => setFloatOrbRef(i, el)"
                type="button"
                class="guest-home-float-orb"
                :class="{ 'is-active': floatHoverIndex === i }"
                role="listitem"
                :aria-pressed="floatHoverIndex === i"
                :aria-label="`${item.alt}：${item.blurb}`"
                @mouseenter="setFloatHover(i)"
                @focusin="setFloatHover(i)"
              >
                <img
                  :src="item.src"
                  :alt="item.alt"
                  width="160"
                  height="160"
                  loading="eager"
                  decoding="async"
                  draggable="false"
                />
                <span class="guest-home-float-name">{{ item.alt }}</span>
                <div class="guest-home-float-info" aria-hidden="true">
                  <strong>{{ item.alt }}</strong>
                  <p>{{ item.blurb }}</p>
                </div>
              </button>
            </div>
            <p class="guest-home-roster-hint">漂浮碰撞 · 悬停查看角色信息</p>
          </div>
          <footer class="guest-home-footer">
            <h2 class="guest-home-about-title">关于 TFHers</h2>
            <p class="guest-home-about-body">
              TFHers 是蹄斗族群玩家们自己的社区，汇集资讯、教程、赛事与玩家交流。文案占位，后续可再改。
            </p>
          </footer>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/** 站内静态立绘（与 CreateCombo / 角色页同套 CSel3）；不请求 /api/characters */
const gallery = [
  { src: '/images/CSel3_LargePortArizona.png', alt: 'Arizona', blurb: '沙漠狼 · 稳健突击手' },
  { src: '/images/CSel3_LargePortVelvet.png', alt: 'Velvet', blurb: '黑兔 · 连段与节奏压制' },
  { src: '/images/CSel3_LargePortTianhuo.png', alt: 'Tianhuo', blurb: '天火 · 爆发与空间切割' },
  { src: '/images/CSel3_LargePortOleander.png', alt: 'Oleander', blurb: '夹竹桃 · 灵活花式连携' },
  { src: '/images/CSel3_LargePortPaprika.png', alt: 'Paprika', blurb: '辣椒 · 近身压迫专家' },
  { src: '/images/CSel3_LargePortPom.png', alt: 'Pom', blurb: '波姆 · 辅助与场地控制' },
  { src: '/images/CSel3_LargePortTexas.png', alt: 'Texas', blurb: '德州 · 重击与防守反击' },
  { src: '/images/CSel3_LargePortShantyP2.png', alt: 'Shanty', blurb: '香缇 · 海盗式奇袭流' },
  { src: '/images/CSel3_LargePortBaihe.png', alt: 'Baihe', blurb: '白鹤 · 飘逸连招大师' },
  { src: '/images/CSel3_LargePortNidra.png', alt: 'Nidra', blurb: '尼德拉 · 暗影突袭' },
  { src: '/images/CSel3_LargePortStronghoof.png', alt: 'Stronghoof', blurb: '强蹄 · 力量型前排' },
]

type FloatBody = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  baseR: number
  el: HTMLElement | null
}

const floatArenaEl = ref<HTMLElement | null>(null)
const floatHoverIndex = ref(-1)
const floatOrbEls: Array<HTMLElement | null> = Array.from({ length: gallery.length }, () => null)
let floatBodies: FloatBody[] = []
let floatRaf = 0
let floatLastTs = 0
let floatReduceMotion = false
let floatRo: ResizeObserver | null = null

function setFloatOrbRef(i: number, el: unknown) {
  floatOrbEls[i] = el instanceof HTMLElement ? el : null
}

function setFloatHover(i: number) {
  floatHoverIndex.value = i
}

function clearFloatHover() {
  floatHoverIndex.value = -1
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function prefersFloatReduce() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

/** 肉眼可见慢漂速度（px/s）；reduce 只减速，绝不冻成 0 */
function floatSpeedRange() {
  return floatReduceMotion ? ([16, 28] as const) : ([32, 58] as const)
}

function ensureMinSpeed(b: FloatBody, minSp: number) {
  const sp = Math.hypot(b.vx, b.vy)
  if (sp >= minSp) return
  if (sp < 1e-3) {
    const ang = rand(0, Math.PI * 2)
    b.vx = Math.cos(ang) * minSp
    b.vy = Math.sin(ang) * minSp
    return
  }
  b.vx = (b.vx / sp) * minSp
  b.vy = (b.vy / sp) * minSp
}

function layoutFloatBodies(resetVel = true) {
  const arena = floatArenaEl.value
  if (!arena) return false
  const W = arena.clientWidth
  const H = arena.clientHeight
  // arena 尚未铺开时先别初始化成「冻住」
  if (W < 80 || H < 80) return false

  const n = gallery.length
  const baseR = Math.min(52, Math.max(30, Math.min(W, H) / (n > 8 ? 12.5 : 10)) )
  const pad = 6
  const bodies: FloatBody[] = []
  const [spMin, spMax] = floatSpeedRange()

  for (let i = 0; i < n; i++) {
    let x = W / 2
    let y = H / 2
    for (let attempt = 0; attempt < 80; attempt++) {
      x = rand(baseR + pad, Math.max(baseR + pad + 1, W - baseR - pad))
      y = rand(baseR + pad, Math.max(baseR + pad + 1, H - baseR - pad))
      const ok = bodies.every((b) => {
        const dx = b.x - x
        const dy = b.y - y
        return dx * dx + dy * dy > (b.baseR + baseR + 10) ** 2
      })
      if (ok) break
    }
    const speed = rand(spMin, spMax)
    const ang = rand(0, Math.PI * 2)
    const prev = floatBodies[i]
    const keep = !resetVel && prev && Math.hypot(prev.vx, prev.vy) > 1
    bodies.push({
      x,
      y,
      vx: keep ? prev.vx : Math.cos(ang) * speed,
      vy: keep ? prev.vy : Math.sin(ang) * speed,
      r: baseR,
      baseR,
      el: floatOrbEls[i],
    })
  }
  floatBodies = bodies
  paintFloatOrbs()
  return true
}

function paintFloatOrbs() {
  const hover = floatHoverIndex.value
  for (let i = 0; i < floatBodies.length; i++) {
    const b = floatBodies[i]
    const el = b.el || floatOrbEls[i]
    if (!el) continue
    b.el = el
    const active = hover === i
    const scale = active ? 1.34 : 1
    el.style.zIndex = active ? '30' : '1'
    el.style.width = `${b.baseR * 2}px`
    el.style.height = `${b.baseR * 2}px`
    el.style.transform = `translate3d(${(b.x - b.baseR).toFixed(2)}px, ${(b.y - b.baseR).toFixed(2)}px, 0) scale(${scale})`
    el.classList.toggle('is-active', active)
  }
}

function separatePair(a: FloatBody, b: FloatBody, push = 1) {
  let dx = b.x - a.x
  let dy = b.y - a.y
  let dist = Math.hypot(dx, dy)
  const minDist = a.r + b.r + 0.5
  if (dist < 1e-6) {
    dx = rand(-1, 1)
    dy = rand(-1, 1)
    dist = Math.hypot(dx, dy) || 1
  }
  if (dist >= minDist) return
  const nx = dx / dist
  const ny = dy / dist
  const overlap = (minDist - dist) * push
  const ma = a.r * a.r
  const mb = b.r * b.r
  const sum = ma + mb || 1
  a.x -= ((overlap * mb) / sum) * nx
  a.y -= ((overlap * mb) / sum) * ny
  b.x += ((overlap * ma) / sum) * nx
  b.y += ((overlap * ma) / sum) * ny

  const rvx = b.vx - a.vx
  const rvy = b.vy - a.vy
  const velN = rvx * nx + rvy * ny
  if (velN < 0) {
    const e = 0.94
    const j = (-(1 + e) * velN) / sum
    const ix = j * nx
    const iy = j * ny
    a.vx -= ix * mb
    a.vy -= iy * mb
    b.vx += ix * ma
    b.vy += iy * ma
  }
}

function floatStep(dt: number) {
  const arena = floatArenaEl.value
  if (!arena || !floatBodies.length) return
  const W = arena.clientWidth
  const H = arena.clientHeight
  if (W < 40 || H < 40) return

  const hover = floatHoverIndex.value
  // 轻阻尼，保持慢漂；reduce 也不冻死
  const damp = floatReduceMotion ? 0.994 : 0.998
  const speedMul = floatReduceMotion ? 0.55 : 1
  const minSp = floatReduceMotion ? 14 : 22
  const maxSp = floatReduceMotion ? 36 : 72

  for (let i = 0; i < floatBodies.length; i++) {
    const b = floatBodies[i]
    const active = hover === i
    b.r = active ? b.baseR * 1.42 : b.baseR

    // 持续微扰，避免共线停住
    if (!active) {
      b.vx += rand(-18, 18) * dt
      b.vy += rand(-18, 18) * dt
    } else {
      b.vx *= 0.92
      b.vy *= 0.92
    }

    b.vx *= damp
    b.vy *= damp
    ensureMinSpeed(b, active ? Math.max(8, minSp * 0.45) : minSp)
    const sp = Math.hypot(b.vx, b.vy)
    if (sp > maxSp) {
      b.vx = (b.vx / sp) * maxSp
      b.vy = (b.vy / sp) * maxSp
    }

    b.x += b.vx * speedMul * dt
    b.y += b.vy * speedMul * dt

    if (b.x < b.r) {
      b.x = b.r
      b.vx = Math.abs(b.vx) * 0.98
    } else if (b.x > W - b.r) {
      b.x = W - b.r
      b.vx = -Math.abs(b.vx) * 0.98
    }
    if (b.y < b.r) {
      b.y = b.r
      b.vy = Math.abs(b.vy) * 0.98
    } else if (b.y > H - b.r) {
      b.y = H - b.r
      b.vy = -Math.abs(b.vy) * 0.98
    }
  }

  for (let i = 0; i < floatBodies.length; i++) {
    for (let j = i + 1; j < floatBodies.length; j++) {
      const a = floatBodies[i]
      const b = floatBodies[j]
      const extra = hover === i || hover === j ? 1.3 : 1
      separatePair(a, b, extra)
      if (hover === i || hover === j) {
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const want = a.r + b.r + 20
        if (dist < want) {
          const f = ((want - dist) / want) * 220 * dt
          const nx = dx / dist
          const ny = dy / dist
          if (hover === i) {
            b.vx += nx * f
            b.vy += ny * f
          } else {
            a.vx -= nx * f
            a.vy -= ny * f
          }
        }
      }
    }
  }

  paintFloatOrbs()
}

function floatLoop(ts: number) {
  if (!floatLastTs) floatLastTs = ts
  let dt = (ts - floatLastTs) / 1000
  floatLastTs = ts
  dt = Math.min(0.034, Math.max(0.001, dt))
  floatStep(dt)
  floatRaf = window.requestAnimationFrame(floatLoop)
}

function startFloatSim() {
  stopFloatSim()
  floatReduceMotion = prefersFloatReduce()

  const tryStart = (attempt: number) => {
    // 同步 orb 引用（v-for ref 回调可能稍晚）
    for (let i = 0; i < gallery.length; i++) {
      if (!floatOrbEls[i] && floatArenaEl.value) {
        const btn = floatArenaEl.value.querySelectorAll('.guest-home-float-orb')[i]
        if (btn instanceof HTMLElement) floatOrbEls[i] = btn
      }
    }
    const ok = layoutFloatBodies(true)
    if (!ok) {
      if (attempt < 40) {
        window.setTimeout(() => tryStart(attempt + 1), 50)
      }
      return
    }
    floatLastTs = 0
    if (!floatRaf) floatRaf = window.requestAnimationFrame(floatLoop)
  }

  requestAnimationFrame(() => tryStart(0))
}

function stopFloatSim() {
  if (floatRaf) {
    window.cancelAnimationFrame(floatRaf)
    floatRaf = 0
  }
  floatLastTs = 0
}

const rootEl = ref<HTMLElement | null>(null)
const rail1El = ref<HTMLElement | null>(null)
const rail2El = ref<HTMLElement | null>(null)
const spaceLayerEl = ref<HTMLElement | null>(null)
const ringPathEl = ref<SVGPathElement | null>(null)
const rayPathEl = ref<SVGPathElement | null>(null)

const fxReady = ref(false)
const rail1Progress = ref(0)
const rail2Progress = ref(0)
const topBarAlpha = ref(0)
/** 每帧写入：避免 p 饱和后 computed 不刷新导致走廊停半路 */
const corridorLiftVh = ref(0)

/** 走远：scale 1→0；translateZ 负向加深「退入景深」 */
/** 阶段1：只缩放到 SCALE_HOLD；阶段2：保持该缩放并整体上移（倒楼梯） */
const SCALE_HOLD = 0.25
const PHASE1_END = 0.5
const PERSPECTIVE_PX = 1200
const Z_END_PX = -900
/** 阶段1结束时 translateZ 锁定，阶段2不再加深（避免继续「缩小」） */
const Z_HOLD = Z_END_PX * 0.55
/** 阶段2 满屏上移；hero rail 300vh → travel 200vh，phase2≈100vh 与之对齐 */
const LIFT_VH = 100
/** more 顶贴最外环底（≈视口底）；CSS margin-top:-100vh（300vh hero + phase2 起点） */
const JOIN_TOP_VH = 100

let raf = 0
let scrollTargets: Array<Window | Document | HTMLElement> = []

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** 本轨进度 0→1（上滚自然回退） */
function measureRailProgress(rail: HTMLElement | null): number {
  if (!rail) return 0
  const rect = rail.getBoundingClientRect()
  const railH = Math.max(1, rect.height)
  const vh = Math.max(1, window.innerHeight || 1)
  const travel = Math.max(1, railH - vh)
  const scrolled = clamp(-rect.top, 0, travel)
  return clamp(scrolled / travel, 0, 1)
}

function collectScrollTargets(from: HTMLElement | null): Array<Window | Document | HTMLElement> {
  const out: Array<Window | Document | HTMLElement> = [window, document]
  const se = document.scrollingElement
  if (se instanceof HTMLElement) out.push(se)
  if (document.body) out.push(document.body)
  if (document.documentElement) out.push(document.documentElement)

  let el: HTMLElement | null = from
  while (el) {
    const st = getComputedStyle(el)
    const oy = st.overflowY
    const ox = st.overflowX
    if (
      oy === 'auto' || oy === 'scroll' || oy === 'overlay' ||
      ox === 'auto' || ox === 'scroll' || ox === 'overlay' ||
      ox === 'hidden' || ox === 'clip'
    ) {
      out.push(el)
    }
    el = el.parentElement
  }
  return Array.from(new Set(out))
}

/** 阶段2 共用上移量（vh，负=上）；panel / corridor 必须同值同序 */
function phaseLiftVh(p: number): number {
  if (p <= PHASE1_END) return 0
  const t = (p - PHASE1_END) / Math.max(0.001, 1 - PHASE1_END)
  return -t * LIFT_VH
}

/** sticky 行程用尽后 panel 随文档上移；fixed 走廊必须跟上，否则停在半屏 */
function stickyReleaseLiftVh(rail: HTMLElement | null): number {
  if (!rail) return 0
  const panel = rail.querySelector('.guest-home-panel') as HTMLElement | null
  if (!panel) return 0
  const top = panel.getBoundingClientRect().top
  const vh = Math.max(1, window.innerHeight || 1)
  return top < 0 ? (top / vh) * 100 : 0
}

function corridorLiftFor(p1: number, p2: number): number {
  if (p2 > 0.001) return phaseLiftVh(p2) + stickyReleaseLiftVh(rail2El.value)
  return phaseLiftVh(p1) + stickyReleaseLiftVh(rail1El.value)
}

/** 屏上目标可视比例 1→SCALE_HOLD（走廊内框与面板外缘共用） */
function visualScaleForProgress(p: number) {
  if (p <= 0) return 1
  if (p <= PHASE1_END) return 1 - (p / PHASE1_END) * (1 - SCALE_HOLD)
  return SCALE_HOLD
}

function zForProgress(p: number) {
  if (p <= 0) return 0
  if (p <= PHASE1_END) return (p / PHASE1_END) * Z_HOLD
  return Z_HOLD
}

/** visual ≈ css * P/(P-z) → css = visual*(P-z)/P，抵消 translateZ 透视缩小 */
function cssScaleForVisual(visual: number, z: number) {
  const denom = Math.max(1, PERSPECTIVE_PX - z)
  return visual * denom / PERSPECTIVE_PX
}

/**
 * 倒楼梯：
 * 阶段1 p∈[0,0.5]：只 scale 1→SCALE_HOLD + Z 到 Z_HOLD
 * 阶段2：scale/Z 锁定；屏上 translateY 上移（写在 perspective 左侧，与走廊同速）
 */
function walkAwayStyle(p: number, opts?: { incomingLift?: boolean }) {
  if (!fxReady.value || p <= 0.001) {
    if (opts?.incomingLift) {
      return {
        transform: 'perspective(1200px) translate3d(0, 18vh, 0) scale(1)',
        opacity: '1',
      }
    }
    return {
      transform: 'none',
      opacity: '1',
    }
  }
  if (p <= PHASE1_END) {
    const t = p / PHASE1_END
    const visual = visualScaleForProgress(p)
    const z = zForProgress(p)
    const cssScale = cssScaleForVisual(visual, z)
    const opacity = Math.max(0.72, 1 - t * 0.18)
    return {
      transform: `perspective(${PERSPECTIVE_PX}px) translate3d(0, 0, ${z}px) scale(${Math.max(0.04, cssScale)})`,
      opacity: String(opacity),
    }
  }
  const lift = phaseLiftVh(p)
  // 可视比例锁 SCALE_HOLD；CSS scale 补偿 Z，保证屏上仍是 SCALE_HOLD
  const visual = SCALE_HOLD
  const z = Z_HOLD
  const cssScale = cssScaleForVisual(visual, z)
  const opacity = Math.max(0.25, 0.85 * (1 - ((p - PHASE1_END) / (1 - PHASE1_END)) * 0.55))
  return {
    transform: `translate3d(0, ${lift}vh, 0) perspective(${PERSPECTIVE_PX}px) translate3d(0, 0, ${z}px) scale(${Math.max(0.04, cssScale)})`,
    opacity: String(opacity),
  }
}

/** corridor：用每帧 corridorLiftVh（含 sticky 离场），与面板同速整段上移 */
function spaceStyle(p1: number, p2: number) {
  const pActive = p2 > 0.001 ? p2 : p1
  if (!fxReady.value || pActive <= 0.001) {
    return {
      opacity: '0',
      ['--stroke-a' as string]: '0',
      transform: 'none',
    }
  }
  const op = Math.min(0.88, 0.28 + Math.min(1, p1 + p2) * 0.58)
  const strokeA = Math.min(0.48, 0.2 + Math.min(1, pActive) * 0.3)
  const lift = corridorLiftVh.value
  return {
    opacity: String(op),
    ['--stroke-a' as string]: String(strokeA),
    transform: lift === 0 ? 'none' : `translate3d(0, ${lift}vh, 0)`,
  }
}



function updateScrollFx() {
  raf = 0
  if (!fxReady.value) {
    rail1Progress.value = 0
    rail2Progress.value = 0
    topBarAlpha.value = 0
    corridorLiftVh.value = 0
    const spaceEl = spaceLayerEl.value
    if (spaceEl) spaceEl.style.transform = 'none'
    paintCorridor(0, 0)
    return
  }
  const p1 = measureRailProgress(rail1El.value)
  const p2 = measureRailProgress(rail2El.value)
  rail1Progress.value = p1
  rail2Progress.value = p2
  // 顶栏：轨1走远后保持偏黑，轨2再加深
  topBarAlpha.value = clamp(Math.max(p1, p2) * 1.15, 0, 1)
  // 每帧更新 lift（含 sticky 松绑后的 panel.top），防止 p 饱和后走廊停住
  const lift = corridorLiftFor(p1, p2)
  corridorLiftVh.value = lift
  const spaceEl = spaceLayerEl.value
  if (spaceEl) {
    spaceEl.style.transform = lift === 0 ? 'none' : `translate3d(0, ${lift}vh, 0)`
  }
  paintCorridor(p1, p2)
}

const heroFxStyle = computed(() => walkAwayStyle(rail1Progress.value))

/** 走廊：pDrive=p1+p2 续页继续滑；rAF 直写 path d（少 Vue 重建） */
const CORRIDOR_A0 = 1
const CORRIDOR_S_NEAR = 0.975
const CORRIDOR_DZ = 0.16
const CORRIDOR_MAX_RINGS = 28

function panelDistFromScale(s: number) {
  const sClamped = Math.max(0.04, s)
  return CORRIDOR_A0 / sClamped
}

function scaleForCorridor(p: number) {
  return visualScaleForProgress(p)
}


function buildCorridorPaths(p1: number, p2: number) {
  const pDrive = p1 + p2
  if (pDrive <= 0.001) {
    return { ringsD: '', raysD: '', opacityP: 0 }
  }
  const pPanel = p2 > 0.001 ? p2 : p1
  // 内框用屏上可视比例，与面板外缘对齐（含 SCALE_HOLD 锁定）
  const sPanel = Math.max(0.04, visualScaleForProgress(pPanel))
  const dist = panelDistFromScale(sPanel)
  // 同速：按可视比例累计 traveled；阶段2 visual 锁定则 phase 停，只靠图层上移
  const traveled1 = Math.max(0, panelDistFromScale(visualScaleForProgress(p1)) - CORRIDOR_A0)
  const traveled2 = p2 > 0.001 ? Math.max(0, panelDistFromScale(visualScaleForProgress(p2)) - CORRIDOR_A0) : 0
  const traveled = traveled1 + traveled2
  const zNear = CORRIDOR_A0 / CORRIDOR_S_NEAR
  const phase = traveled % CORRIDOR_DZ

  const half = 50 * sPanel
  const ix = 50 - half
  const iy = 50 - half
  const iw = half * 2
  const ih = half * 2
  const mx = ix + iw * 0.5
  const my = iy + ih * 0.5
  const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
  const raysD =
    `M0 0L${r2(ix)} ${r2(iy)}` +
    `M100 0L${r2(ix + iw)} ${r2(iy)}` +
    `M0 100L${r2(ix)} ${r2(iy + ih)}` +
    `M100 100L${r2(ix + iw)} ${r2(iy + ih)}` +
    `M50 0L${r2(mx)} ${r2(iy)}` +
    `M50 100L${r2(mx)} ${r2(iy + ih)}` +
    `M0 50L${r2(ix)} ${r2(my)}` +
    `M100 50L${r2(ix + iw)} ${r2(my)}`

  if (zNear >= dist - 0.02) {
    return { ringsD: '', raysD, opacityP: pDrive }
  }

  let ringsD = ''
  // 最内环：精确贴面板外缘，消掉页与线之间空白
  ringsD += `M${r2(ix)} ${r2(iy)}h${r2(iw)}v${r2(ih)}h${r2(-iw)}z`
  let count = 1
  for (let k = 0; k < 72 && count < CORRIDOR_MAX_RINGS; k++) {
    const depth = zNear + phase + k * CORRIDOR_DZ
    if (depth >= dist - 0.012) break
    const s = CORRIDOR_A0 / depth
    if (s >= CORRIDOR_S_NEAR - 0.002) continue
    // 紧贴内框：只跳过几乎重合的环，不再留 0.008 缝
    if (s <= sPanel + 0.0015) continue
    const x = 50 - 50 * s
    const y = x
    const w = 100 * s
    ringsD += `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(w)}h${r2(-w)}z`
    count++
  }
  return { ringsD, raysD, opacityP: pDrive }
}

function paintCorridor(p1: number, p2: number) {
  const { ringsD, raysD } = buildCorridorPaths(p1, p2)
  const rp = ringPathEl.value
  const yp = rayPathEl.value
  if (rp && rp.getAttribute('d') !== ringsD) rp.setAttribute('d', ringsD)
  if (yp && yp.getAttribute('d') !== raysD) yp.setAttribute('d', raysD)
}

const spaceLayerStyle = computed(() =>
  spaceStyle(rail1Progress.value, rail2Progress.value),
)

/** 续页：随轨1被上推盖住；轨2 进度增大时同样走远。上滚可逆。 */
const moreFxStyle = computed(() => {
  const p2 = rail2Progress.value
  // 续页同样两阶段：先缩到 SCALE_HOLD 再上移
  return walkAwayStyle(p2)
})

function onScroll() {
  if (!fxReady.value) return
  if (raf) return
  raf = window.requestAnimationFrame(updateScrollFx)
}

/** 滚轮吸附：一次意图 ~900ms rAF 插值滚动到 hero/more；勿用 reduced-motion 瞬切 */
const SNAP_DURATION_MS = 900
const SNAP_COOLDOWN_MS = 280
const SNAP_DELTA_MIN = 6
const SNAP_MIN_DIST_PX = 24
let snapAnimating = false
let snapRaf = 0
let snapCooldownUntil = 0
let snapBehaviorPrevHtml = ''
let snapBehaviorPrevBody = ''

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

type SnapScroller = {
  el: HTMLElement
  getY: () => number
  setY: (y: number) => void
}

/**
 * GuestHome 文档滚动在 html（见 main.css overflow-y:scroll）。
 * 必须直写 scrollTop，并临时关掉 CSS scroll-behavior:smooth，
 * 否则浏览器会把逐帧赋值合成「一下到底」。
 */
function resolveSnapScroller(): SnapScroller {
  const html = document.documentElement
  const body = document.body
  const el =
    (document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null) || html

  return {
    el,
    getY: () => {
      const y = el.scrollTop || html.scrollTop || body?.scrollTop || window.scrollY || 0
      return y
    },
    setY: (y) => {
      const v = Math.max(0, y)
      // 强制即时赋值，禁止 behavior:smooth / scrollTo smooth
      html.scrollTop = v
      if (body) body.scrollTop = v
      if (el !== html && el !== body) el.scrollTop = v
    },
  }
}

function lockScrollBehaviorAuto() {
  const html = document.documentElement
  const body = document.body
  snapBehaviorPrevHtml = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  if (body) {
    snapBehaviorPrevBody = body.style.scrollBehavior
    body.style.scrollBehavior = 'auto'
  }
}

function restoreScrollBehavior() {
  const html = document.documentElement
  const body = document.body
  html.style.scrollBehavior = snapBehaviorPrevHtml
  if (body) body.style.scrollBehavior = snapBehaviorPrevBody
}

/** 两段锚点：hero 顶、more 顶（rail2 贴顶 = 第二页） */
function sectionAnchorYs(scroller: SnapScroller): number[] {
  const r1 = rail1El.value
  const r2 = rail2El.value
  if (!r1 || !r2) return [0]
  const yNow = scroller.getY()
  const y1 = Math.max(0, Math.round(yNow + r1.getBoundingClientRect().top))
  const y2 = Math.max(0, Math.round(yNow + r2.getBoundingClientRect().top))
  if (Math.abs(y2 - y1) < SNAP_MIN_DIST_PX) {
    // 锚点异常接近时，按 hero 轨行程推算第二页，避免 dist≈0 导致「瞬切」错觉
    const vh = Math.max(1, window.innerHeight || 1)
    const travel = Math.max(vh, Math.round(r1.getBoundingClientRect().height - vh))
    return [y1, y1 + travel]
  }
  return [y1, y2]
}

function currentSectionIndex(anchors: number[], y: number): number {
  if (anchors.length <= 1) return 0
  const mid = (anchors[0] + anchors[1]) / 2
  return y >= mid - 1 ? 1 : 0
}

function cancelSnapAnim() {
  if (snapRaf) {
    window.cancelAnimationFrame(snapRaf)
    snapRaf = 0
  }
  if (snapAnimating) restoreScrollBehavior()
  snapAnimating = false
}

function animateSnapTo(targetY: number) {
  const scroller = resolveSnapScroller()
  const startY = scroller.getY()
  const dist = targetY - startY
  if (Math.abs(dist) < SNAP_MIN_DIST_PX) {
    snapCooldownUntil = performance.now() + SNAP_COOLDOWN_MS
    return
  }

  cancelSnapAnim()
  lockScrollBehaviorAuto()
  snapAnimating = true
  // 固定可见时长；不因 prefers-reduced-motion 改为 1ms 瞬切
  const duration = SNAP_DURATION_MS
  const t0 = performance.now()

  const step = (now: number) => {
    if (!snapAnimating) return
    const elapsed = now - t0
    const t = Math.min(1, elapsed / duration)
    const y = startY + dist * easeInOutCubic(t)
    scroller.setY(y)
    if (fxReady.value) updateScrollFx()
    if (t < 1) {
      snapRaf = window.requestAnimationFrame(step)
      return
    }
    snapRaf = 0
    scroller.setY(targetY)
    if (fxReady.value) updateScrollFx()
    snapAnimating = false
    restoreScrollBehavior()
    snapCooldownUntil = performance.now() + SNAP_COOLDOWN_MS
  }
  snapRaf = window.requestAnimationFrame(step)
}

function onWheelSnap(e: WheelEvent) {
  if (!fxReady.value) return
  if (e.ctrlKey) return // 保留浏览器缩放手势
  // more 固定一屏、无页内滚动，滚轮一律交给段吸附

  const dy = e.deltaY
  if (Math.abs(dy) < SNAP_DELTA_MIN) return

  // 动画中或冷却中：吞掉连触，避免连跳
  if (snapAnimating || performance.now() < snapCooldownUntil) {
    e.preventDefault()
    return
  }

  const scroller = resolveSnapScroller()
  const anchors = sectionAnchorYs(scroller)
  if (anchors.length < 2) return

  const idx = currentSectionIndex(anchors, scroller.getY())
  const nextIdx = dy > 0 ? Math.min(anchors.length - 1, idx + 1) : Math.max(0, idx - 1)
  if (nextIdx === idx) {
    // 已在端点：不拦截，避免卡死
    return
  }

  e.preventDefault()
  animateSnapTo(anchors[nextIdx])
}

function goLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : route.fullPath || '/'
  router.push({ name: 'login', query: { redirect } })
}

try {
  document.documentElement.classList.add('tfhers-guest-home')
} catch { /* ignore */ }

onMounted(() => {
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  } catch { /* ignore */ }

  document.documentElement.classList.add('tfhers-guest-home')
  fxReady.value = false
  rail1Progress.value = 0
  rail2Progress.value = 0
  topBarAlpha.value = 0

  try { window.scrollTo(0, 0) } catch { /* ignore */ }
  try { document.documentElement.scrollTop = 0 } catch { /* ignore */ }

  scrollTargets = collectScrollTargets(rootEl.value)
  for (const t of scrollTargets) {
    t.addEventListener('scroll', onScroll, { passive: true, capture: true } as AddEventListenerOptions)
  }
  window.addEventListener('resize', onScroll, { passive: true })
  // wheel 需 preventDefault，不能 passive
  window.addEventListener('wheel', onWheelSnap, { passive: false, capture: true })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fxReady.value = true
      updateScrollFx()
      startFloatSim()
      if (floatArenaEl.value && typeof ResizeObserver !== 'undefined') {
        let lastW = 0
        let lastH = 0
        floatRo = new ResizeObserver(() => {
          const a = floatArenaEl.value
          if (!a) return
          if (Math.abs(a.clientWidth - lastW) < 8 && Math.abs(a.clientHeight - lastH) < 8) return
          lastW = a.clientWidth
          lastH = a.clientHeight
          layoutFloatBodies(false)
          if (!floatRaf) startFloatSim()
        })
        floatRo.observe(floatArenaEl.value)
      }
    })
  })
})

onUnmounted(() => {
  for (const t of scrollTargets) {
    t.removeEventListener('scroll', onScroll, true)
  }
  window.removeEventListener('resize', onScroll)
  window.removeEventListener('wheel', onWheelSnap, true)
  cancelSnapAnim()
  stopFloatSim()
  if (floatRo) {
    floatRo.disconnect()
    floatRo = null
  }
  if (raf) window.cancelAnimationFrame(raf)
})
</script>
