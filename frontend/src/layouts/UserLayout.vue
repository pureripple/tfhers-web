<template>
  <div class="shell">
    <header>
      <span class="brand">蹄斗族群</span>
      <RouterLink to="/">资讯</RouterLink>
      <RouterLink to="/lobby">大厅</RouterLink>
      <RouterLink to="/rankings">排行</RouterLink>
      <RouterLink to="/tournaments">赛事</RouterLink>
      <RouterLink to="/characters">角色</RouterLink>
      <RouterLink to="/ai-chat">AI 助手</RouterLink>
      <template v-if="userAuth.isLoggedIn">
        <span class="auth-user">
          <img
            v-if="userAuth.user?.avatarUrl"
            class="avatar"
            :src="String(userAuth.user.avatarUrl)"
            alt=""
          />
          <span>{{ displayName }}</span>
        </span>
        <button type="button" class="link-btn" @click="onLogout">退出</button>
      </template>
      <RouterLink v-else to="/login">登录</RouterLink>
      <RouterLink to="/admin" style="margin-left: auto">管理端</RouterLink>
    </header>
    <main><RouterView /></main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserAuthStore } from '@/stores/auth'

const userAuth = useUserAuthStore()

const displayName = computed(() => {
  const u = userAuth.user
  return u?.nickname || u?.username || '用户'
})

function onLogout() {
  userAuth.logout()
}
</script>
