<template>
  <div
    ref="rootEl"
    class="cine-home"
    :class="{ 'is-switching': switching }"
    role="main"
  >
    <!-- 训练场背景 -->
    <div ref="bgEl" class="cine-bg" aria-hidden="true" />


    <!-- 环境光染色 -->
    <div class="cine-stage-gradient" aria-hidden="true" />

    <!-- 屏幕溢光 + 环境光（颜色由脚本按幕布内容采样） -->
    <div
      ref="ambientEl"
      class="cine-ambient"
      :style="ambientStyle"
      aria-hidden="true"
    />


    <!-- 暗角 -->
    <div class="cine-veil" aria-hidden="true" />

    <!-- 顶栏 -->
    <header class="cine-topbar">
      <span class="cine-brand">TFHERS</span>
      <button type="button" class="cine-login" @click="goLogin">登录</button>
    </header>

    <!-- ========== 屏幕：里面是网站的真实页面 ========== -->
    <div ref="screenWrapEl" class="cine-screen-wrap">
      <div class="cine-screen">
        <div
          ref="screenShapeEl"
          class="cine-screen-shape"
          :style="screenShapeStyle"
        >
          <!-- 首页：网站真实的未登录首页 -->
          <div class="cine-page" :data-active="pageIndex === 0 ? 'true' : 'false'">
            <div class="cine-page-raw">
              <GuestHomeView embedded />
            </div>
          </div>

          <!-- 选角色：页面本身仍在屏幕里 -->
          <div class="cine-page" :data-active="pageIndex === 1 ? 'true' : 'false'">
            <iframe
              class="cine-iframe"
              src="/second/index.html"
              title="选角色"
            ></iframe>
          </div>

          <!-- 换屏效果层 -->
          <div class="cine-blackout" aria-hidden="true" />
          <div class="cine-scanlines" :class="{ 'is-flash': scanFlash }" aria-hidden="true" />
          <div class="cine-scanline" :class="{ 'is-sweeping': scanSweep }" aria-hidden="true" />
        </div>

        <!--
          角色跳出屏幕 —— 暂时停用，等确定方案后再开。
          立绘资源与 postMessage 通道已就绪，取消下面注释即可恢复。
        -->
        <!--
        <div
          class="cine-jumpout"
          :class="{ 'is-on': pageIndex === 1 && !!activeChar }"
          aria-hidden="true"
        >
          <img
            v-if="activeChar"
            class="cine-jumpout-char cine-jumpout-char--left"
            :src="charSrc(activeChar)"
            :alt="activeChar.name || ''"
            draggable="false"
          />
        </div>
        -->

        <div class="cine-bloom" :style="bloomStyle" aria-hidden="true" />
        <div class="cine-sheen" :style="sheenStyle" aria-hidden="true" />
        <div class="cine-shadow" aria-hidden="true" />

        <!-- 页面指示器 -->
        <div class="cine-screen-ui">
          <div class="cine-dots">
            <button
              v-for="(page, i) in PAGES"
              :key="page.key"
              type="button"
              class="cine-dot"
              :class="{ 'is-active': pageIndex === i }"
              :title="page.label"
              :aria-label="page.label"
              @click.stop="switchPage(i)"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="cine-hud">
      scroll to switch · {{ PAGES[pageIndex].label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GuestHomeView from '@/views/user/GuestHomeView.vue'

const route = useRoute()
const router = useRouter()

/* ---------------- 屏幕里轮播的真实页面 ---------------- */
/*
 * 页面 1「首页」：GuestHomeView 以 embedded 模式渲染在屏幕内部（不吃滚轮）。
 * 页面 2「选角色」：页面本身在屏幕里，
 *                  屏幕内容仍是选角色页；另外叠一层比屏幕更大的立绘图层，
 */
const PAGES = [
  { key: 'home', label: '首页' },
  { key: 'character-select', label: '选角色' },
] as const

/* ---------------- 状态 ---------------- */
const rootEl = ref<HTMLElement | null>(null)
const bgEl = ref<HTMLElement | null>(null)
const screenWrapEl = ref<HTMLElement | null>(null)
const screenShapeEl = ref<HTMLElement | null>(null)
const ambientEl = ref<HTMLElement | null>(null)

const switching = ref(false)
const pageIndex = ref(0)
const scanFlash = ref(false)
const scanSweep = ref(false)

/* 换屏时的亮度 / 抖动由脚本直接写 CSS 变量，不走响应式 */

const ambA = ref('255, 90, 80')
const ambB = ref('255, 160, 90')
const ambLeft = ref('110, 170, 240')
const ambRight = ref('255, 150, 90')

const ambientStyle = computed(() => ({
  '--amb-a': ambA.value,
  '--amb-b': ambB.value,
  '--amb-left': ambLeft.value,
  '--amb-right': ambRight.value,
}))

/* ---------------- 相机视差 ---------------- */
let panX = 0
let panY = 0
let targetPanX = 0
let targetPanY = 0
let rafId = 0
let lastMoveAt = 0
const RECENTER_AFTER = 1200
const RECENTER_RATE = 0.02
const CAMERA_PAN_PX = 22
const CAMERA_PAN_Y = 14

/* 屏幕外观是固定的（已取消推进进入，不需要随进度缩放） */
const screenShapeStyle = computed(() => ({ transform: 'scale(1)', borderRadius: '6px' }))
const bloomStyle = computed(() => ({ opacity: '1' }))
const sheenStyle = computed(() => ({ opacity: '1' }))

/* ---------------- 相机循环 ---------------- */
function tick() {
  const now = performance.now()
  if (lastMoveAt && now - lastMoveAt > RECENTER_AFTER) {
    targetPanX += (0 - targetPanX) * RECENTER_RATE
    targetPanY += (0 - targetPanY) * RECENTER_RATE
  }
  panX += (targetPanX - panX) * 0.07
  panY += (targetPanY - panY) * 0.07

  const screenEl = screenShapeEl.value?.parentElement
  if (screenEl) {
    screenEl.style.transform =
      `translate3d(${panX.toFixed(2)}px, ${panY.toFixed(2)}px, 0) ` +
      `rotateY(${(-panX * 0.32).toFixed(2)}deg) rotateX(${(panY * 0.29).toFixed(2)}deg)`
  }
  if (bgEl.value) {
    bgEl.value.style.transform =
      `translate3d(${(panX * 0.7).toFixed(2)}px, ${(panY * 0.7).toFixed(2)}px, 0)`
  }

  const settled = Math.abs(targetPanX - panX) < 0.01 && Math.abs(targetPanY - panY) < 0.01
  rafId = settled ? 0 : requestAnimationFrame(tick)
}

function onPointerMove(e: PointerEvent) {
  targetPanX = (e.clientX / window.innerWidth - 0.5) * 2 * CAMERA_PAN_PX
  targetPanY = (e.clientY / window.innerHeight - 0.5) * 2 * CAMERA_PAN_Y
  lastMoveAt = performance.now()
  if (!rafId) rafId = requestAnimationFrame(tick)
}

/* ---------------- 换屏：CRT 信号切换 ---------------- */
const SWITCH_COOLDOWN = 700
let switchCooldownUntil = 0

function switchPage(target: number) {
  if (switching.value) return
  if (target < 0 || target >= PAGES.length || target === pageIndex.value) return

  switching.value = true
  scanFlash.value = true
  scanSweep.value = false
  void screenShapeEl.value?.offsetWidth
  scanSweep.value = true

  const t0 = performance.now()
  const DARK_AT = 190
  const TOTAL = 560
  let swapped = false

  /*
   * 关键：直接写 DOM 的 CSS 变量，不走 Vue 响应式。
   * 原先每帧改 ref → 触发组件重新渲染 → 整块屏幕重算样式，
   * 16ms 内做不完，扫描就掉到 13fps。改成 setProperty 后只有合成层更新。
   */
  const shapeEl = screenShapeEl.value
  // 压暗值 0 = 全亮，0.94 = 接近全黑
  const setDark = (v: number) => {
    if (shapeEl) shapeEl.style.setProperty('--screen-dark', v.toFixed(3))
  }
  const setJitter = (px: number) => {
    if (shapeEl) shapeEl.style.setProperty('--screen-jitter', `${px.toFixed(2)}px`)
  }

  function step(now: number) {
    const t = now - t0
    if (t < DARK_AT) {
      const k = t / DARK_AT
      setDark(k * 0.94)
      const jit = Math.sin(k * Math.PI) * 2.2
      setJitter((Math.random() - 0.5) * jit)
    } else {
      if (!swapped) {
        swapped = true
        pageIndex.value = target
      }
      const k = Math.min(1, (t - DARK_AT) / (TOTAL - DARK_AT))
      setDark(Math.max(0, 0.94 - k * 1.0))
      setJitter((Math.random() - 0.5) * (1 - k) * 1.6)
    }
    if (t < TOTAL) requestAnimationFrame(step)
    else {
      setDark(0)
      setJitter(0)
      scanFlash.value = false
      scanSweep.value = false
      switching.value = false
    }
  }
  requestAnimationFrame(step)
}

/* ---------------- 滚轮 / 触摸切页 ---------------- */
const WHEEL_THRESHOLD = 60
const TOUCH_THRESHOLD = 46
let wheelAccum = 0
let wheelResetTimer = 0
let touchStartY: number | null = null

function trySwitchByDirection(dir: 1 | -1) {
  const now = performance.now()
  if (now < switchCooldownUntil) return
  if (switching.value) return
  const target = pageIndex.value + dir
  if (target < 0 || target >= PAGES.length) return
  switchCooldownUntil = now + SWITCH_COOLDOWN
  wheelAccum = 0
  switchPage(target)
}

/**
 * 屏幕里的页面本身可能可以滚动（资讯列表、角色网格都长），
 * 所以滚轮优先交给页面内部；只有「已经滚到头」才触发切页。
 *
 * 注意：内容缩放后 scrollHeight 由内容撑开，这个判断按实际 DOM 尺寸算，
 * 不能假设一定没有滚动条。
 */
function innerCanScroll(dir: number): boolean {
  const pageEl = screenShapeEl.value?.querySelector('.cine-page[data-active="true"]') as HTMLElement | null
  if (!pageEl) return false
  const scroller = pageEl.querySelector('.cine-page-scale') as HTMLElement | null
  if (!scroller) return false
  const max = scroller.scrollHeight - scroller.clientHeight
  if (max <= 4) return false            // 内容一屏放得下 → 直接切页
  if (dir > 0) return scroller.scrollTop < max - 2
  return scroller.scrollTop > 2
}

function onWheel(e: WheelEvent) {
  if (switching.value) return
  if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return

  const dir = e.deltaY > 0 ? 1 : -1
  // 页面内部还能滚：交给它，不切页
  if (innerCanScroll(dir)) return

  e.preventDefault()
  wheelAccum += e.deltaY
  clearTimeout(wheelResetTimer)
  wheelResetTimer = window.setTimeout(() => { wheelAccum = 0 }, 220)
  if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return
  trySwitchByDirection(dir)
  wheelAccum = 0
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) { touchStartY = null; return }
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e: TouchEvent) {
  if (touchStartY === null) return
  const endY = e.changedTouches?.[0]?.clientY ?? touchStartY
  const dy = touchStartY - endY
  touchStartY = null
  if (Math.abs(dy) < TOUCH_THRESHOLD) return
  trySwitchByDirection(dy > 0 ? 1 : -1)
}

function goLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : route.fullPath || '/'
  router.push({ name: 'login', query: { redirect } })
}

/* ---------------- 生命周期 ---------------- */
function onKeydown(_e: KeyboardEvent) {
  // 已取消进入屏幕，键盘不再需要处理
}

/** 接收选角色页回传的当前角色 */
function onMessage(ev: MessageEvent) {
  const data = ev.data as {
    type?: string
    id?: string | null
    name?: string
    accent?: string
    confirmed?: boolean
    deltaY?: number
  } | null
  if (!data) return

  // 选角色页回传的滚轮：iframe 会吞掉 wheel 事件，必须由子页转发过来
  if (data.type === 'tfhers:wheel') {
    if (switching.value) return
    const dy = Number(data.deltaY) || 0
    if (Math.abs(dy) < 1) return
    const dir = dy > 0 ? 1 : -1
    wheelAccum += dy
    clearTimeout(wheelResetTimer)
    wheelResetTimer = window.setTimeout(() => { wheelAccum = 0 }, 220)
    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
      trySwitchByDirection(dir)
      wheelAccum = 0
    }
    return
  }

  // tfhers:character（角色跳出屏幕）暂时停用，忽略
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('message', onMessage)
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('message', onMessage)
  if (rafId) cancelAnimationFrame(rafId)
  clearTimeout(wheelResetTimer)
})
</script>

<style scoped>
/* ===== 训练场背景 ===== */
.cine-bg {
  position: fixed;
  inset: 0;
  background-image: url('/images/TrainingStageFullBG.webp');
  background-repeat: no-repeat;
  background-position: center 62%;
  background-size: 122% auto;
  transform-origin: 50% 50%;
  will-change: transform;
  z-index: 0;
}

.cine-stage-gradient {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: soft-light;
  opacity: 0.95;
  background:
    linear-gradient(180deg, rgba(24, 30, 72, 0.85) 0%, rgba(18, 20, 48, 0.35) 18%, transparent 42%),
    radial-gradient(72% 60% at 6% 62%, rgba(58, 120, 190, 0.55) 0%, rgba(34, 70, 130, 0.22) 42%, transparent 70%),
    radial-gradient(72% 60% at 94% 66%, rgba(196, 92, 44, 0.5) 0%, rgba(130, 54, 30, 0.2) 44%, transparent 72%),
    radial-gradient(60% 44% at 50% 96%, rgba(104, 66, 220, 0.48) 0%, transparent 68%);
}

.cine-ambient {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    radial-gradient(64% 60% at 50% 46%, rgba(var(--amb-a), 0.55) 0%, rgba(var(--amb-a), 0.275) 44%, transparent 76%),
    radial-gradient(58% 34% at 50% 74%, rgba(var(--amb-b), 0.4) 0%, transparent 74%),
    radial-gradient(30% 52% at 2% 48%, rgba(var(--amb-left), 0.42) 0%, transparent 78%),
    radial-gradient(30% 52% at 98% 48%, rgba(var(--amb-right), 0.42) 0%, transparent 78%);
  filter: blur(34px);
}

.cine-veil {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background:
    radial-gradient(120% 96% at 50% 44%, transparent 40%, rgba(4, 2, 8, 0.46) 74%, rgba(3, 1, 6, 0.82) 100%),
    linear-gradient(180deg, rgba(4, 2, 8, 0.6) 0%, transparent 24%, transparent 78%, rgba(6, 3, 16, 0.34) 100%);
}

/* ===== 顶栏 ===== */
.cine-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  pointer-events: none;
}

.cine-brand {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
}

.cine-login {
  pointer-events: auto;
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.94);
  font: inherit;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 8px 16px;
  border-radius: 9999px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.cine-login:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 122, 122, 0.45);
}

/* ===== 屏幕 ===== */
.cine-screen-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  padding-bottom: 9vh;
  perspective: 1400px;
  perspective-origin: 50% 50%;
  overflow: hidden;
}

.cine-screen {
  position: relative;
  width: min(1200px, 82vw);
  aspect-ratio: 16 / 9;
  transform-style: preserve-3d;
  transition: transform 0.3s ease-out;
  will-change: transform;
}

.cine-screen-shape {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
  background: #0a0710;

  transform-origin: 50% 46%;
  will-change: transform;
  translate: 0 var(--screen-jitter, 0px);
}

/* 屏幕里的真实页面 */
.cine-page {
  position: absolute;
  inset: 0;
  overflow: hidden;
  transform-origin: 50% 50%;
  animation: cine-page-in 0.34s cubic-bezier(0.2, 0.8, 0.25, 1);
}

.cine-page[data-active='false'] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* 非当前页彻底不参与渲染与动画 */
  content-visibility: hidden;
}

@keyframes cine-page-in {
  from { opacity: 0; transform: scale(1.01); filter: blur(2px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}

/* 网站页面原样铺满屏幕（页面自己带完整排版） */
.cine-page-raw {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/*
 * 屏幕内嵌 GuestHomeView 时的适配。
 *
 * GuestHomeView 是按「铺满整个视口」设计的（panel 用 100vh、sticky + 300vh 滚动行程），
 * 放进 16:9 的屏幕容器后，100vh 仍然是屏幕外的高度 → 画面被裁掉一大块。
 * 这里把它的所有尺寸都改成「跟随容器」：
 *   - panel 高度 100%（= 屏幕高度）
 *   - rail 不再用 300vh，直接 100%
 *   - 隐藏第二屏（选角色那屏由外壳自己管）
 */
.cine-page-raw :deep(.guest-home) {
  position: absolute;
  inset: 0;
  height: 100%;
  overflow: hidden;
}

.cine-page-raw :deep(.guest-home-rail) {
  height: 100% !important;
  min-height: 100% !important;
}

.cine-page-raw :deep(.guest-home-rail--more) {
  display: none;
}

.cine-page-raw :deep(.guest-home-panel) {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}

.cine-page-raw :deep(.guest-home-panel-fx) {
  height: 100%;
}

.cine-page-raw :deep(.guest-home-top) {
  position: absolute;
}

/* 屏幕比视口小，主页文字相应缩小，避免「贴脸」 */
.cine-page-raw :deep(.guest-home-wordmark-img) {
  width: min(64%, 520px);
}

/* WebGL 层会按 1.09 倍 OVERSCAN 放大画面，内嵌时关掉这种裁切感 */
.cine-page-raw :deep(.guest-home-hero-fx) {
  opacity: 0.92;
}

.cine-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #05040a;
}

/* ===== 屏幕装饰 ===== */
.cine-bloom {
  position: absolute;
  inset: -6%;
  border-radius: 24px;
  pointer-events: none;
  z-index: -1;
  box-shadow:
    0 0 60px 10px rgba(var(--amb-a), 0.55),
    0 0 140px 40px rgba(var(--amb-a), 0.3),
    0 0 260px 90px rgba(var(--amb-b), 0.16);
  transition: opacity 0.9s ease;
}

.cine-sheen {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  pointer-events: none;
  background: linear-gradient(108deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 16%, transparent 36%, transparent 100%);
  mix-blend-mode: screen;
}

.cine-shadow {
  position: absolute;
  left: 50%;
  bottom: -7%;
  width: 86%;
  height: 16%;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), transparent 72%);
  filter: blur(16px);
  pointer-events: none;
}

/* ===== 屏幕底部：页面指示器 ===== */
.cine-screen-ui {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  pointer-events: none;
}

.cine-dots {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.cine-dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  cursor: pointer;
  transition: background 0.25s ease, transform 0.25s ease;
}

.cine-dot.is-active {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.35);
}

/* 换屏压暗：只用 opacity 变化，纯合成层，不触发重绘 */
.cine-blackout {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: #000;
  opacity: var(--screen-dark, 0);
  will-change: opacity;
}

/* ===== 换屏：CRT 电视扫描 ===== */

/* 细横纹：常驻的 CRT 质感，换页瞬间更明显 */
.cine-scanlines {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: 0.22;
  background: repeating-linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.42) 0px,
    rgba(0, 0, 0, 0.42) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: multiply;
  transition: opacity 0.3s linear;
  will-change: opacity;
}

.cine-scanlines.is-flash {
  opacity: 0.62;
}

/* 扫描亮带：换页时从上往下扫过 */
/*
 * 扫描亮带。
 *
 * 流畅的关键：
 *   - 用 translateY 走「整屏高度」，而不是百分比（百分比是自身高度，会变速）
 *   - 只动 transform + opacity，两者都能上 GPU 合成层
 *   - 模糊固定在元素上、不随动画重算；辉光用 box-shadow 而非 drop-shadow
 *   - 线性缓动（linear），扫描本来就该是匀速的
 */
.cine-scanline {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 22%;
  pointer-events: none;
  z-index: 7;
  opacity: 0;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(170, 220, 255, 0.10) 22%,
    rgba(205, 235, 255, 0.55) 42%,
    rgba(255, 255, 255, 0.95) 50%,
    rgba(205, 235, 255, 0.55) 58%,
    rgba(170, 220, 255, 0.10) 78%,
    transparent 100%);
  mix-blend-mode: screen;
  will-change: transform, opacity;
  /* 静态模糊：只在合成时算一次 */
  filter: blur(1.2px);
  transform: translate3d(0, -120%, 0);
  backface-visibility: hidden;
}

.cine-scanline.is-sweeping {
  animation: cine-scan 0.5s linear;
}

@keyframes cine-scan {
  /* translateY 用 vh 单位 = 整屏高度，匀速穿过 */
  0%   { opacity: 0; transform: translate3d(0, -120%, 0); }
  10%  { opacity: 1; }
  88%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(0, 520%, 0); }
}

.cine-hud {
  position: fixed;
  right: 22px;
  bottom: 18px;
  z-index: 3;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.32);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .cine-screen,
  .cine-page {
    transition: none;
    animation: none;
  }
}
</style>
