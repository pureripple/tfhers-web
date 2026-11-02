<template>
  <div
    class="splash"
    role="button"
    tabindex="0"
    aria-label="按任意键进入登录"
    @click="enterLogin"
    @keydown.prevent="enterLogin"
  >
    <div class="splash-stage" :style="stageStyle" aria-hidden="true">
      <img class="splash-layer splash-layer--bg" :src="layers.bg" alt="" draggable="false" />
      <img class="splash-layer splash-layer--l2" :src="layers.l2" alt="" draggable="false" />
      <img
        v-for="(src, i) in layers.chars"
        :key="src"
        class="splash-layer splash-layer--char"
        :style="{ zIndex: 10 + i }"
        :src="src"
        alt=""
        draggable="false"
      />
    </div>

    <header class="splash-top">
      <img class="splash-logo" :src="layers.logo" alt="tfhers" width="160" height="108" draggable="false" />
    </header>

    <footer class="splash-footer">
      <p class="splash-hint" :class="{ pulse: true }">按任意键</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { markSplashSeen } from '@/utils/splash'

const router = useRouter()
const route = useRoute()

const layers = {
  bg: '/splash/MMSceneBG.png',
  l2: '/splash/MMSceneL2.png',
  logo: '/splash/MainMenuBGLogoPinkFF.png',
  // Character cutouts share one scene canvas; stack all for main-menu look
  chars: [
    '/splash/MMScene_arizona.png',
    '/splash/MMScene_FredPap.png',
    '/splash/MMScene_Hawk.png',
    '/splash/MMScene_Oleander.png',
    '/splash/MMScene_Pom.png',
    '/splash/MMScene_Pup.png',
    '/splash/MMScene_Shanty.png',
    '/splash/MMScene_Tianhuo.png',
    '/splash/MMScene_Velvet.png',
  ],
}

const mx = ref(0)
const my = ref(0)
let entered = false

const stageStyle = computed(() => {
  // Light parallax: bg slow, l2 mid, chars a bit more
  const x = mx.value
  const y = my.value
  return {
    '--parallax-x': `${x}px`,
    '--parallax-y': `${y}px`,
  } as Record<string, string>
})

function onPointerMove(e: PointerEvent) {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  // max ~12px drift
  mx.value = ((e.clientX - cx) / cx) * 12
  my.value = ((e.clientY - cy) / cy) * 8
}

function enterLogin() {
  if (entered) return
  entered = true
  markSplashSeen()
  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/'
  router.replace({ name: 'login', query: { redirect } })
}

function onKey(e: KeyboardEvent) {
  // Ignore pure modifiers
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return
  enterLogin()
}

onMounted(() => {
  document.documentElement.classList.add('tfhers-splash')
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('keydown', onKey)
  // Focus root for keyboard without needing click first
  try {
    ;(document.querySelector('.splash') as HTMLElement | null)?.focus()
  } catch {
    /* ignore */
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('tfhers-splash')
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('keydown', onKey)
})

</script>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow: hidden;
  background: #0a0a0e;
  color: #fff;
  cursor: pointer;
  user-select: none;
  outline: none;
}

.splash-stage {
  position: absolute;
  inset: -3%;
  display: grid;
  place-items: center;
}

.splash-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
  pointer-events: none;
  will-change: transform;
}

.splash-layer--bg {
  z-index: 1;
  transform: translate3d(
    calc(var(--parallax-x, 0px) * -0.35),
    calc(var(--parallax-y, 0px) * -0.35),
    0
  );
}

.splash-layer--l2 {
  z-index: 5;
  object-fit: cover;
  object-position: center 70%;
  transform: translate3d(
    calc(var(--parallax-x, 0px) * -0.7),
    calc(var(--parallax-y, 0px) * -0.55),
    0
  );
}

.splash-layer--char {
  object-fit: cover;
  object-position: center bottom;
  transform: translate3d(
    calc(var(--parallax-x, 0px) * -1),
    calc(var(--parallax-y, 0px) * -0.85),
    0
  );
}

.splash-top {
  position: absolute;
  top: 18px;
  left: 20px;
  z-index: 30;
  pointer-events: none;
}

.splash-logo {
  width: min(180px, 36vw);
  height: auto;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
}

.splash-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 8vh;
  z-index: 30;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.splash-hint {
  margin: 0;
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: clamp(0.95rem, 2.2vw, 1.15rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
}

.splash-hint.pulse {
  animation: splash-pulse 1.6s ease-in-out infinite;
}

@keyframes splash-pulse {
  0%,
  100% {
    opacity: 0.72;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (max-width: 640px) {
  .splash-top {
    top: 12px;
    left: 12px;
  }
  .splash-footer {
    bottom: 6vh;
  }
}
</style>
