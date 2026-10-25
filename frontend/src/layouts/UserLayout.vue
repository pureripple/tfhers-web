<template>
  <div class="tfhers-app">
    <AuthEntry :hidden-for-a11y="userAuth.isLoggedIn" />

    <aside class="app-sidebar" aria-label="main nav">
      <div class="sidebar-top">
        <button
          type="button"
          class="sidebar-toggle"
          aria-label="collapse sidebar"
          title="collapse/expand"
          @click="toggleSidebar"
        >
          <i class="fas fa-bars"></i>
        </button>
        <span class="sidebar-brand">tfhers</span>
      </div>
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          active-class=""
          exact-active-class=""
          :class="{ 'nav-link-ai': item.ai, active: isActive(item) }"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div
      class="sidebar-backdrop"
      :hidden="!sidebarOpenMobile"
      :aria-hidden="sidebarOpenMobile ? 'false' : 'true'"
      @click="closeMobile"
    ></div>

    <div class="sidebar-float-cluster">
      <button
        type="button"
        class="sidebar-float-toggle"
        aria-label="open sidebar"
        title="open sidebar"
        @click="toggleSidebar"
      >
        <i class="fas fa-bars"></i>
      </button>
      <span class="sidebar-float-brand" aria-hidden="true">tfhers</span>
    </div>

    <div class="mobile-topbar">
      <button type="button" class="sidebar-toggle" aria-label="open nav" title="open nav" @click="openMobile">
        <i class="fas fa-bars"></i>
      </button>
      <span class="sidebar-brand">tfhers</span>
      <div class="mobile-topbar-spacer"></div>
    </div>

    <header class="app-topbar" :hidden="!userAuth.isLoggedIn">
      <div class="app-topbar-inner">
        <div class="app-top-actions">
          <div class="top-post-wrap">
            <button
              type="button"
              class="top-post-btn"
              aria-haspopup="true"
              :aria-expanded="postMenuOpen ? 'true' : 'false'"
              @click.stop="togglePostMenu"
            >
              <i class="fas fa-pen"></i>
              <span class="top-post-label">投稿</span>
              <i class="fas fa-caret-down"></i>
            </button>
            <div class="top-post-menu" :hidden="!postMenuOpen">
              <button type="button" class="top-post-item" data-post="article" @click="stubAction('投稿 · 资讯')">
                资讯
              </button>
              <button type="button" class="top-post-item" data-post="combo" @click="stubAction('投稿 · 连段')">
                连段
              </button>
            </div>
          </div>

          <button type="button" class="top-icon-btn" title="私信" aria-label="私信" @click="stubAction('私信')">
            <i class="fas fa-envelope"></i>
          </button>
          <button type="button" class="top-icon-btn" title="通知" aria-label="通知" @click="stubAction('通知')">
            <i class="fas fa-bell"></i>
          </button>

          <div class="top-avatar-wrap">
            <button
              type="button"
              class="top-avatar-btn"
              title="账户"
              aria-label="账户"
              aria-haspopup="true"
              :aria-expanded="accountOpen ? 'true' : 'false'"
              @click.stop="toggleAccount"
            >
              <img :src="avatarSrc" alt="" />
            </button>
            <div
              class="top-account-panel"
              role="menu"
              aria-label="账户面板"
              :hidden="!accountOpen"
            >
              <div class="tap-head">
                <img class="tap-avatar" :src="avatarSrc" alt="" />
                <div class="tap-names">
                  <div class="tap-nickname">{{ displayName }}</div>
                  <div class="tap-username">@{{ userAuth.user?.username || '—' }}</div>
                </div>
              </div>
              <div class="tap-section tap-rating-row">
                <div class="tap-rating">
                  <span class="tap-tier">{{ ratingTier }}</span>
                  <span class="tap-score">{{ ratingScore }}</span>
                </div>
                <div class="tap-rank">{{ ratingRank }}</div>
              </div>
              <div class="tap-actions">
                <button type="button" class="tap-action-btn" @click="stubAction('数据')">
                  <i class="fas fa-chart-bar"></i><span>数据</span>
                </button>
                <button type="button" class="tap-action-btn" @click="stubAction('稿件管理')">
                  <i class="fas fa-folder-open"></i><span>稿件管理</span>
                </button>
                <button type="button" class="tap-action-btn" @click="stubAction('设置')">
                  <i class="fas fa-cog"></i><span>设置</span>
                </button>
                <button type="button" class="tap-action-btn" @click="stubAction('问题反馈')">
                  <i class="fas fa-comment-dots"></i><span>问题反馈</span>
                </button>
              </div>
              <div class="tap-footer">
                <button type="button" class="tap-action-btn tap-logout-btn" role="menuitem" @click="onLogout">
                  <i class="fas fa-sign-out-alt"></i><span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserAuthStore } from '@/stores/auth'
import AuthEntry from '@/components/AuthEntry.vue'

const SIDEBAR_KEY = 'tfhers_sidebar_collapsed'

const userAuth = useUserAuthStore()
const route = useRoute()

const nav = [
  { to: '/', label: '资讯', icon: 'fas fa-newspaper', match: ['news'] },
  { to: '/characters', label: '教程', icon: 'fas fa-book-open', match: ['characters'] },
  { to: '/tournaments', label: '比赛', icon: 'fas fa-trophy', match: ['tournaments'] },
  { to: '/lobby', label: '大厅', icon: 'fas fa-door-open', match: ['lobby'] },
  { to: '/rankings', label: '排行', icon: 'fas fa-medal', match: ['rankings'] },
  { to: '/ai-chat', label: 'AI 助手', icon: 'fas fa-robot', match: ['ai-chat'], ai: true },
] as const

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

const collapsed = ref(readCollapsed())
const sidebarOpenMobile = ref(false)
const accountOpen = ref(false)
const postMenuOpen = ref(false)

const displayName = computed(() => {
  const u = userAuth.user
  return u?.nickname || u?.username || '用户'
})

const avatarSrc = computed(() => {
  const url = userAuth.user?.avatarUrl
  return url ? String(url) : '/images/CSel3_LargePortTianhuo.png'
})

const ratingTier = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const t = u?.tier ?? u?.ratingTier
  return t != null && String(t) ? String(t) : '—'
})

const ratingScore = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const s = u?.rating ?? u?.score
  return s != null && String(s) ? String(s) : '—'
})

const ratingRank = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const r = u?.rank ?? u?.ranking
  return r != null && String(r) ? `#${r}` : '#—'
})

function isActive(item: (typeof nav)[number]) {
  return item.match.includes(String(route.name || ''))
}

function applyHtmlClasses() {
  const root = document.documentElement
  root.classList.toggle('tfhers-authed', userAuth.isLoggedIn)
  root.classList.toggle('sidebar-collapsed', collapsed.value)
  root.classList.toggle('sidebar-open', sidebarOpenMobile.value)
  document.title = '蹄斗族群助手'
}

function persistCollapsed() {
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed.value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function toggleSidebar() {
  if (window.matchMedia('(max-width: 768px)').matches) {
    sidebarOpenMobile.value = !sidebarOpenMobile.value
  } else {
    collapsed.value = !collapsed.value
    persistCollapsed()
  }
  applyHtmlClasses()
}

function openMobile() {
  sidebarOpenMobile.value = true
  applyHtmlClasses()
}

function closeMobile() {
  sidebarOpenMobile.value = false
  applyHtmlClasses()
}

function togglePostMenu() {
  postMenuOpen.value = !postMenuOpen.value
  if (postMenuOpen.value) accountOpen.value = false
}

function toggleAccount() {
  accountOpen.value = !accountOpen.value
  if (accountOpen.value) postMenuOpen.value = false
}

function stubAction(label: string) {
  postMenuOpen.value = false
  accountOpen.value = false
  window.alert(`${label}功能即将接入，请稍后再试`)
}

function onLogout() {
  accountOpen.value = false
  postMenuOpen.value = false
  userAuth.logout()
  applyHtmlClasses()
}

function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (!t?.closest('.top-avatar-wrap')) accountOpen.value = false
  if (!t?.closest('.top-post-wrap')) postMenuOpen.value = false
}

onMounted(() => {
  userAuth.hydrate()
  applyHtmlClasses()
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.documentElement.classList.remove('tfhers-authed', 'sidebar-collapsed', 'sidebar-open')
  document.removeEventListener('click', onDocClick)
})

watch(
  () => userAuth.isLoggedIn,
  () => {
    applyHtmlClasses()
    if (!userAuth.isLoggedIn) {
      accountOpen.value = false
      postMenuOpen.value = false
    }
  },
)

watch([collapsed, sidebarOpenMobile], applyHtmlClasses)
</script>
