<template>
  <div class="shell">
    <header>
      <span class="brand">TFHers 管理</span>
      <RouterLink to="/" style="margin-left: auto">回用户端</RouterLink>
    </header>
    <main>
      <div class="auth-card">
        <h1>管理登录</h1>
        <form class="auth-form" @submit.prevent="onSubmit">
          <label>
            <span>用户名</span>
            <input v-model.trim="username" type="text" autocomplete="username" required />
          </label>
          <label>
            <span>密码</span>
            <input v-model="password" type="password" autocomplete="current-password" required />
          </label>
          <p v-if="error" class="auth-error">{{ error }}</p>
          <button type="submit" class="auth-btn" :disabled="loading">
            {{ loading ? '登录中…' : '登录' }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/types'
import { useAdminAuthStore } from '@/stores/auth'

const adminAuth = useAdminAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await adminAuth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    await router.replace(redirect || '/admin')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
