<template>
  <div class="auth-card-legacy">
    <h1>管理端登录</h1>
    <form class="auth-entry-form" @submit.prevent="onSubmit">
      <div class="form-group">
        <label for="adminLoginUsername">用户名</label>
        <input id="adminLoginUsername" v-model.trim="username" type="text" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label for="adminLoginPassword">密码</label>
        <input id="adminLoginPassword" v-model="password" type="password" autocomplete="current-password" required />
      </div>
      <p v-if="error" class="auth-error">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="loading" style="width:100%">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>
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
