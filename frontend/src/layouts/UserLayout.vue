<template>
  <div class="tfhers-app">
    <AuthEntry :hidden-for-a11y="userAuth.isLoggedIn" />
    <aside class="app-sidebar" aria-label="main nav">
      <div class="sidebar-top">
        <button type="button" class="sidebar-toggle" aria-label="collapse sidebar" title="collapse/expand" @click="toggleSidebar"><i class="fas fa-bars"></i></button>
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
          <i :class="item.icon"></i><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>
    <div class="sidebar-backdrop" :hidden="!sidebarOpenMobile" :aria-hidden="sidebarOpenMobile ? 'false' : 'true'" @click="closeMobile"></div>
    <div class="sidebar-float-cluster">
      <button type="button" class="sidebar-float-toggle" aria-label="open sidebar" title="open sidebar" @click="toggleSidebar"><i class="fas fa-bars"></i></button>
      <span class="sidebar-float-brand" aria-hidden="true">tfhers</span>
    </div>
    <div class="mobile-topbar">
      <button type="button" class="sidebar-toggle" aria-label="open nav" title="open nav" @click="openMobile"><i class="fas fa-bars"></i></button>
      <span class="sidebar-brand">tfhers</span>
      <div class="mobile-topbar-spacer"></div>
    </div>
    <header class="app-topbar" :hidden="!userAuth.isLoggedIn">
      <div class="app-topbar-inner"><div class="app-top-actions">
        <div class="top-post-wrap">
          <button type="button" class="top-post-btn" aria-haspopup="true" :aria-expanded="postMenuOpen ? 'true' : 'false'" @click.stop="togglePostMenu">
            <i class="fas fa-pen"></i><span class="top-post-label">投稿</span><i class="fas fa-caret-down"></i>
          </button>
          <div class="top-post-menu" :hidden="!postMenuOpen">
            <button type="button" class="top-post-item" data-post="article" @click="openCreateArticle">资讯</button>
            <button type="button" class="top-post-item" data-post="combo" @click="openCreateCombo">连段</button>
          </div>
        </div>
        <button type="button" class="top-icon-btn" :title="dmLabel" :aria-label="dmLabel" @click="stubNoBackend(dmLabel)"><i class="fas fa-envelope"></i></button>
        <button type="button" class="top-icon-btn" :title="notifyLabel" :aria-label="notifyLabel" @click="stubNoBackend(notifyLabel)"><i class="fas fa-bell"></i></button>
        <div class="top-avatar-wrap">
          <button type="button" class="top-avatar-btn" :title="accountLabel" :aria-label="accountLabel" aria-haspopup="true" :aria-expanded="accountOpen ? 'true' : 'false'" @click.stop="toggleAccount">
            <img :src="avatarSrc" alt="" />
          </button>
          <div class="top-account-panel" role="menu" :aria-label="menuLabel" :hidden="!accountOpen">
            <div class="tap-head"><img class="tap-avatar" :src="avatarSrc" alt="" /><div class="tap-names"><button type="button" :class="['tap-nickname', 'tap-profile-link', adminNameClass(userAuth.user)]" title="查看个人主页" @click.stop="goPage('profile')">{{ displayName }}</button><div class="tap-username">@{{ userAuth.user?.username || dash }}</div></div></div>
            <div class="tap-section tap-rating-row"><div class="tap-rating"><span class="tap-tier" :class="ratingTierClass">{{ ratingTier }}</span><span class="tap-score">{{ ratingScore }}</span></div><div class="tap-rank">{{ ratingRank }}</div></div>
            <div class="tap-actions">
              <button type="button" class="tap-action-btn" @click="goPage('data')"><i class="fas fa-chart-bar"></i><span>数据</span></button>
              <button type="button" class="tap-action-btn" @click="goPage('manuscripts')"><i class="fas fa-folder-open"></i><span>稿件管理</span></button>
              <button type="button" class="tap-action-btn" @click="goPage('settings')"><i class="fas fa-cog"></i><span>设置</span></button>
              <button type="button" class="tap-action-btn" @click="openFeedback"><i class="fas fa-comment-dots"></i><span>问题反馈</span><span class="tap-unread-dot" :hidden="feedbackUnread <= 0"></span></button>
            </div>
            <div class="tap-footer"><button type="button" class="tap-action-btn tap-logout-btn" role="menuitem" @click="onLogout"><i class="fas fa-sign-out-alt"></i><span>退出登录</span></button></div>
          </div>
        </div>
      </div></div>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
    <CreateArticleModal :open="createArticleOpen" @close="createArticleOpen = false" @created="onArticleCreated" />
    <CreateComboModal :open="createComboOpen" @close="createComboOpen = false" @created="onComboCreated" />
    <FeedbackModal :open="feedbackOpen" @close="feedbackOpen = false" @unread="onFeedbackUnread" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserAuthStore } from '@/stores/auth'
import AuthEntry from '@/components/AuthEntry.vue'
import CreateArticleModal from '@/components/CreateArticleModal.vue'
import CreateComboModal from '@/components/CreateComboModal.vue'
import FeedbackModal from '@/components/FeedbackModal.vue'
import { fetchFeedbackUnreadCount } from '@/api/user'
import { fetchMyRating } from '@/api/rankings'
import { adminNameClass } from '@/utils/adminName'

const SIDEBAR_KEY = 'tfhers_sidebar_collapsed'
const userAuth = useUserAuthStore()
const route = useRoute()
const router = useRouter()
const dash = '\u2014'
const dmLabel = '私信'
const notifyLabel = '通知'
const accountLabel = '账户'
const menuLabel = '账户菜单'

const nav = [
  { to: '/', label: '资讯', icon: 'fas fa-newspaper', match: ['news'] },
  { to: '/characters', label: '教程', icon: 'fas fa-book-open', match: ['characters'] },
  { to: '/tournaments', label: '赛事', icon: 'fas fa-trophy', match: ['tournaments'] },
  { to: '/lobby', label: '大厅', icon: 'fas fa-door-open', match: ['lobby'] },
  { to: '/rankings', label: '排行', icon: 'fas fa-medal', match: ['rankings'] },
  { to: '/ai-chat', label: 'AI', icon: 'fas fa-robot', match: ['ai-chat'], ai: true },
] as const

function readCollapsed(): boolean { try { return localStorage.getItem(SIDEBAR_KEY) === '1' } catch { return false } }
const collapsed = ref(readCollapsed())
const sidebarOpenMobile = ref(false)
const accountOpen = ref(false)
const postMenuOpen = ref(false)
const createArticleOpen = ref(false)
const createComboOpen = ref(false)
const feedbackOpen = ref(false)
const feedbackUnread = ref(0)
const displayName = computed(() => userAuth.user?.nickname || userAuth.user?.username || '用户')
const avatarSrc = computed(() => { const url = userAuth.user?.avatarUrl; return url ? String(url) : '/images/CSel3_LargePortTianhuo.png' })
function tierLetterOf(raw: unknown) {
  const s = String(raw ?? '').trim().toUpperCase()
  const m = s.match(/[SABCD]/)
  return m ? m[0] : ''
}
const ratingTier = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const letter = tierLetterOf(u?.tier ?? u?.tierLabel ?? u?.ratingTier)
  return letter || dash
})
const ratingTierClass = computed(() => {
  const letter = tierLetterOf((userAuth.user as Record<string, unknown> | null)?.tier ?? (userAuth.user as Record<string, unknown> | null)?.tierLabel)
  return letter ? ('tier-' + letter) : ''
})
const ratingScore = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const s = u?.rating ?? u?.score
  return s != null && String(s) !== '' ? String(s) : dash
})
const ratingRank = computed(() => {
  const u = userAuth.user as Record<string, unknown> | null
  const r = u?.siteRank ?? u?.rank ?? u?.ranking
  const ok = r != null && String(r) !== '' && String(r).toLowerCase() !== 'null' && String(r) !== dash
  return ok ? '#' + r : '#' + dash
})
async function refreshMyRating() {
  if (!userAuth.isLoggedIn || !userAuth.user?.token) return
  try {
    const d = await fetchMyRating()
    if (!d || !userAuth.user) return
    const rating = d.rating != null ? Number(d.rating) : 1000
    const tier = tierLetterOf(d.tier || d.tierLabel) || 'C'
    const rank = d.rank != null ? d.rank : d.siteRank
    const next = {
      ...userAuth.user,
      rating,
      tier,
      tierLabel: d.tierLabel != null ? String(d.tierLabel) : tier,
      siteRank: rank,
      rank,
    }
    userAuth.persist(next as typeof userAuth.user)
  } catch {
    /* keep last known values */
  }
}
function isActive(item: (typeof nav)[number]) { return item.match.includes(String(route.name || '')) }
function applyHtmlClasses() { const rootEl = document.documentElement; rootEl.classList.toggle('tfhers-authed', userAuth.isLoggedIn); rootEl.classList.toggle('sidebar-collapsed', collapsed.value); rootEl.classList.toggle('sidebar-open', sidebarOpenMobile.value); document.title = "tfhers-\"Them's Fightin' Herds\"玩家们的社区" }
function persistCollapsed() { try { localStorage.setItem(SIDEBAR_KEY, collapsed.value ? '1' : '0') } catch { /* ignore */ } }
function toggleSidebar() { if (window.matchMedia('(max-width: 768px)').matches) { sidebarOpenMobile.value = !sidebarOpenMobile.value } else { collapsed.value = !collapsed.value; persistCollapsed() } applyHtmlClasses() }
function openMobile() { sidebarOpenMobile.value = true; applyHtmlClasses() }
function closeMobile() { sidebarOpenMobile.value = false; applyHtmlClasses() }
function togglePostMenu() { postMenuOpen.value = !postMenuOpen.value; if (postMenuOpen.value) accountOpen.value = false }
function toggleAccount() { accountOpen.value = !accountOpen.value; if (accountOpen.value) postMenuOpen.value = false }
function stubNoBackend(label: string) {
  postMenuOpen.value = false
  accountOpen.value = false
  window.alert(label + '：后端暂无独立私信/通知接口，旧站也未接入，待后续补齐。')
}
function goPage(name: 'profile' | 'data' | 'manuscripts' | 'settings') {
  if (!userAuth.isLoggedIn) return
  accountOpen.value = false
  postMenuOpen.value = false
  if (name === 'data') {
    router.push({ name: 'profile', query: { section: 'data' } })
  } else if (name === 'profile') {
    router.push({ name: 'profile' })
  } else {
    router.push({ name })
  }
  try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { window.scrollTo(0, 0) }
}
function openCreateArticle() { postMenuOpen.value = false; if (!userAuth.isLoggedIn) { window.alert('请先登录后再发布'); return }; createArticleOpen.value = true }
function openCreateCombo() { postMenuOpen.value = false; if (!userAuth.isLoggedIn) { window.alert('请先登录后再投稿'); return }; createComboOpen.value = true }
function openFeedback() { accountOpen.value = false; if (!userAuth.isLoggedIn) return; feedbackOpen.value = true }
function onArticleCreated() {
  try { window.dispatchEvent(new CustomEvent('tfhers:articles-changed')) } catch { /* ignore */ }
  if (route.name === 'manuscripts' || route.name === 'profile') {
    router.replace({ name: String(route.name) })
  }
}
function onComboCreated() {
  if (route.name === 'manuscripts' || route.name === 'profile') {
    router.replace({ name: String(route.name) })
  }
}

function onFeedbackUnread(n: number) { feedbackUnread.value = n }
async function refreshFeedbackBadge() { if (!userAuth.isLoggedIn) { feedbackUnread.value = 0; return } try { const data = await fetchFeedbackUnreadCount(); feedbackUnread.value = Number(data?.count) || 0 } catch { feedbackUnread.value = 0 } }
function onLogout() { accountOpen.value = false; postMenuOpen.value = false; createArticleOpen.value = false; createComboOpen.value = false; feedbackOpen.value = false; userAuth.logout(); applyHtmlClasses() }
function onDocClick(e: MouseEvent) { const t = e.target as HTMLElement | null; if (!t?.closest('.top-avatar-wrap')) accountOpen.value = false; if (!t?.closest('.top-post-wrap')) postMenuOpen.value = false }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { postMenuOpen.value = false; accountOpen.value = false; feedbackOpen.value = false; createArticleOpen.value = false; createComboOpen.value = false } }

watch(accountOpen, (open) => {
  if (open) refreshMyRating()
})
watch(
  () => userAuth.isLoggedIn,
  (ok) => {
    if (ok) refreshMyRating()
  },
)
onMounted(() => {
  userAuth.hydrate()
  applyHtmlClasses()
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  refreshFeedbackBadge()
  if (userAuth.isLoggedIn) refreshMyRating()
})
onUnmounted(() => { document.documentElement.classList.remove('tfhers-authed', 'sidebar-collapsed', 'sidebar-open'); document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) })
watch(() => userAuth.isLoggedIn, () => { applyHtmlClasses(); if (!userAuth.isLoggedIn) { accountOpen.value = false; postMenuOpen.value = false; feedbackUnread.value = 0 } else { refreshFeedbackBadge() } })
watch([collapsed, sidebarOpenMobile], applyHtmlClasses)
</script>

<style scoped>
.tap-profile-link {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.tap-profile-link:hover {
  text-decoration: underline;
}
</style>