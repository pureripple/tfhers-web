<template>
  <div class="tfhers-app">
    <aside class="app-sidebar" aria-label="main nav">
      <div class="sidebar-top">
        <button type="button" class="sidebar-toggle" aria-label="collapse sidebar" title="collapse/expand" @click="toggleSidebar">
          <i class="fas fa-bars"></i>
        </button>
        <span class="sidebar-brand">tfhers</span>
      </div>
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link" active-class="" exact-active-class=""
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
      <button type="button" class="sidebar-float-toggle" aria-label="open sidebar" title="open sidebar" @click="toggleSidebar">
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
          <div class="top-avatar-wrap">
            <button
              type="button"
              class="top-avatar-btn"
              title="账户"
              aria-label="账户"
              aria-haspopup="true"
              :aria-expanded="accountOpen ? 'true' : 'false'"
              @click="accountOpen = !accountOpen"
            >
              <img :src="avatarSrc" alt="" />
            </button>
            <div v-show="accountOpen" class="top-account-panel" role="menu" aria-label="账户面板">
              <div class="tap-head">
                <img class="tap-avatar" :src="avatarSrc" alt="" />
                <div class="tap-names">
                  <div class="tap-nickname">{{ displayName }}</div>
                  <div class="tap-username">@{{ userAuth.user?.username || '—' }}</div>
                </div>
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

const collapsed = ref(false)
const sidebarOpenMobile = ref(false)
const accountOpen = ref(false)

const displayName = computed(() => {
  const u = userAuth.user
  return u?.nickname || u?.username || '用户'
})

const avatarSrc = computed(() => {
  const url = userAuth.user?.avatarUrl
  return url ? String(url) : '/images/CSel3_LargePortTianhuo.png'
})

function isActive(item: (typeof nav)[number]) {
  return item.match.includes(String(route.name || ''))
}

function applyHtmlClasses() {
  const root = document.documentElement
  root.classList.add('tfhers-authed')
  root.classList.toggle('sidebar-collapsed', collapsed.value)
  root.classList.toggle('sidebar-open', sidebarOpenMobile.value)
}

function toggleSidebar() {
  if (window.matchMedia('(max-width: 768px)').matches) {
    sidebarOpenMobile.value = !sidebarOpenMobile.value
  } else {
    collapsed.value = !collapsed.value
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

function onLogout() {
  accountOpen.value = false
  userAuth.logout()
}

function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (!t?.closest('.top-avatar-wrap')) accountOpen.value = false
}

onMounted(() => {
  applyHtmlClasses()
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.documentElement.classList.remove('tfhers-authed', 'sidebar-collapsed', 'sidebar-open')
  document.removeEventListener('click', onDocClick)
})

watch([collapsed, sidebarOpenMobile], applyHtmlClasses)
</script>
