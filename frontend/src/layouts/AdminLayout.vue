<template>
  <div class="tfhers-app tfhers-admin">
    <aside class="app-sidebar" aria-label="管理导航">
      <div class="sidebar-top">
        <button type="button" class="sidebar-toggle" aria-label="收起侧栏" title="收起/展开" @click="toggleSidebar">
          <i class="fas fa-bars"></i>
        </button>
        <span class="sidebar-brand">tfhers管理端</span>
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
      <button type="button" class="sidebar-float-toggle" aria-label="展开侧栏" title="展开/收起" @click="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
      <span class="sidebar-float-brand">tfhers管理端</span>
    </div>

    <header class="app-topbar">
      <div class="app-topbar-inner">
        <h1 class="page-title">{{ pageTitle }}</h1>
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
                  <div class="tap-nickname">{{ adminName }}</div>
                  <div class="tap-username">@{{ adminAuth.userInfo?.username || 'admin' }}</div>
                </div>
              </div>
              <div class="tap-actions">
                <RouterLink to="/admin/profile" class="tap-action-btn" @click="accountOpen = false">
                  <i class="fas fa-user-circle"></i><span>个人资料</span>
                </RouterLink>
                <button type="button" class="tap-action-btn" @click="onLogout">
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
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/auth'

const adminAuth = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const nav = [
  { to: '/admin/articles', label: '资讯管理', icon: 'fas fa-newspaper', match: ['admin-articles'] },
  { to: '/admin/characters', label: '角色管理', icon: 'fas fa-users', match: ['admin-characters'] },
  { to: '/admin/user-combos', label: '用户连段审核', icon: 'fas fa-user-check', match: ['admin-user-combos'] },
  { to: '/admin/reports', label: '举报处理', icon: 'fas fa-flag', match: ['admin-reports'] },
  { to: '/admin/feedback', label: '问题反馈', icon: 'fas fa-comment-dots', match: ['admin-feedback'] },
  { to: '/admin/comment-review', label: '评论审核', icon: 'fas fa-comments', match: ['admin-comment-review'] },
  { to: '/admin', label: '数据统计', icon: 'fas fa-chart-line', match: ['admin-statistics'] },
  { to: '/admin/games', label: '游戏管理', icon: 'fas fa-gamepad', match: ['admin-games'] },
  { to: '/admin/tournaments', label: '赛事管理', icon: 'fas fa-trophy', match: ['admin-tournaments'] },
  { to: '/admin/ai-chat', label: 'AI 助手', icon: 'fas fa-robot', match: ['admin-ai-chat'], ai: true },
  { to: '/admin/users', label: '用户管理', icon: 'fas fa-user-cog', match: ['admin-users'] },
  { to: '/admin/profile', label: '个人设置', icon: 'fas fa-user-circle', match: ['admin-profile'] },
] as const

const titles: Record<string, string> = {
  'admin-statistics': '数据统计',
  'admin-articles': '资讯管理',
  'admin-characters': '角色管理',
  'admin-user-combos': '用户连段审核',
  'admin-comment-review': '评论审核',
  'admin-games': '游戏管理',
  'admin-tournaments': '赛事管理',
  'admin-reports': '举报处理',
  'admin-feedback': '问题反馈',
  'admin-users': '用户管理',
  'admin-profile': '个人设置',
  'admin-ai-chat': 'AI 助手',
}

const collapsed = ref(false)
const sidebarOpenMobile = ref(false)
const accountOpen = ref(false)

const adminName = computed(() => {
  const info = adminAuth.userInfo
  return info?.nickname || info?.username || '管理员'
})

const avatarSrc = computed(() => {
  const url = adminAuth.userInfo?.avatarUrl
  return url ? String(url) : '/images/CSel3_LargePortTianhuo.png'
})

const pageTitle = computed(() => titles[String(route.name || '')] || '管理端')

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

function closeMobile() {
  sidebarOpenMobile.value = false
  applyHtmlClasses()
}

async function onLogout() {
  accountOpen.value = false
  await adminAuth.logout()
  router.push({ name: 'admin-login' })
}

function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (!t?.closest('.top-avatar-wrap')) accountOpen.value = false
}

onMounted(() => {
  applyHtmlClasses()
  if (adminAuth.isLoggedIn && !adminAuth.userInfo) {
    adminAuth.loadUserInfo().catch(() => undefined)
  }
  // swap to admin theme sheet
  ensureAdminCss(true)
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.documentElement.classList.remove('tfhers-authed', 'sidebar-collapsed', 'sidebar-open')
  ensureAdminCss(false)
  document.removeEventListener('click', onDocClick)
})

function ensureAdminCss(on: boolean) {
  const id = 'tfhers-admin-index-css'
  let el = document.getElementById(id) as HTMLLinkElement | null
  if (on) {
    if (!el) {
      el = document.createElement('link')
      el.id = id
      el.rel = 'stylesheet'
      el.href = '/admin-css/index.css'
      document.head.appendChild(el)
    }
  } else if (el) {
    el.remove()
  }
}

watch([collapsed, sidebarOpenMobile], applyHtmlClasses)
</script>
