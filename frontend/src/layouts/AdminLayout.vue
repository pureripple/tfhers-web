<template>
  <div class="shell">
    <header>
      <span class="brand">TFHers 管理</span>
      <RouterLink to="/admin">统计</RouterLink>
      <RouterLink to="/admin/articles">资讯</RouterLink>
      <RouterLink to="/admin/characters">角色</RouterLink>
      <RouterLink to="/admin/user-combos">用户组合</RouterLink>
      <RouterLink to="/admin/comment-review">评论审核</RouterLink>
      <RouterLink to="/admin/games">游戏</RouterLink>
      <RouterLink to="/admin/tournaments">赛事</RouterLink>
      <RouterLink to="/admin/reports">举报</RouterLink>
      <RouterLink to="/admin/feedback">反馈</RouterLink>
      <RouterLink to="/admin/users">用户</RouterLink>
      <RouterLink to="/admin/profile">个人资料</RouterLink>
      <RouterLink to="/admin/ai-chat">AI</RouterLink>
      <template v-if="adminAuth.isLoggedIn">
        <span class="auth-user">{{ adminName }}</span>
        <button type="button" class="link-btn" @click="onLogout">退出</button>
      </template>
      <RouterLink to="/" style="margin-left: auto">回用户端</RouterLink>
    </header>
    <main><RouterView /></main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/auth'

const adminAuth = useAdminAuthStore()
const router = useRouter()

const adminName = computed(() => {
  const info = adminAuth.userInfo
  return info?.nickname || info?.username || '管理员'
})

onMounted(() => {
  if (adminAuth.isLoggedIn && !adminAuth.userInfo) {
    adminAuth.loadUserInfo().catch(() => undefined)
  }
})

async function onLogout() {
  await adminAuth.logout()
  router.push({ name: 'admin-login' })
}
</script>
