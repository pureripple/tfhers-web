<template>
  <div class="auth-card-legacy">
    <h1>注册账号</h1>
    <p class="auth-entry-switch" style="margin:0">
      已有账号？
      <RouterLink :to="{ name: 'login', query: redirectQuery }">去登录</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const redirectQuery = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r ? { redirect: r } : {}
})
</script>
