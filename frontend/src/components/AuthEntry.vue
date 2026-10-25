<template>
  <div
    id="authEntryOverlay"
    class="auth-entry"
    role="dialog"
    aria-modal="true"
    aria-labelledby="authEntryTitle"
    :aria-hidden="hiddenForA11y ? 'true' : 'false'"
  >
    <header class="auth-entry-top">
      <div class="auth-entry-brand">
        <img src="/images/logo.png" alt="tfhers" class="auth-entry-logo" width="40" height="40" />
        <span class="auth-entry-brand-text">tfhers</span>
      </div>
    </header>

    <div class="auth-entry-center">
      <div class="auth-entry-card" id="authEntryCard">
        <div
          id="authEntryStepActions"
          class="auth-entry-step"
          :class="{ 'is-active': step === 'actions' }"
          :hidden="step !== 'actions'"
        >
          <h1 id="authEntryTitle" class="auth-entry-card-title">用 tfhers 账号登录</h1>
          <div class="auth-entry-card-actions">
            <button type="button" class="auth-entry-btn auth-entry-btn--primary" @click="step = 'register'">
              注册账号
            </button>
            <button type="button" class="auth-entry-btn auth-entry-btn--secondary" @click="step = 'login'">
              登录
            </button>
          </div>
        </div>

        <div
          id="authEntryStepLogin"
          class="auth-entry-step"
          :class="{ 'is-active': step === 'login' }"
          :hidden="step !== 'login'"
        >
          <h2 class="auth-entry-card-title auth-entry-card-title--form">登录</h2>
          <form class="auth-entry-form" @submit.prevent="onLogin">
            <div class="form-group">
              <label for="loginUsername">用户名</label>
              <input
                id="loginUsername"
                v-model.trim="loginUsername"
                type="text"
                name="username"
                required
                autocomplete="username"
              />
            </div>
            <div class="form-group">
              <label for="loginPassword">密码</label>
              <div class="password-field">
                <input
                  id="loginPassword"
                  v-model="loginPassword"
                  :type="showLoginPass ? 'text' : 'password'"
                  name="password"
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="password-toggle"
                  aria-label="显示或隐藏密码"
                  title="显示/隐藏密码"
                  @click="showLoginPass = !showLoginPass"
                >
                  <i class="fas" :class="showLoginPass ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <p v-if="error" class="auth-error" style="color: var(--accent-primary, #ff6b6b); margin: 0 0 8px">
              {{ error }}
            </p>
            <button type="submit" class="auth-entry-btn auth-entry-btn--primary" :disabled="loading">
              {{ loading ? '登录中…' : '登录' }}
            </button>
          </form>
          <p class="auth-entry-switch">
            还没有账号？
            <a href="#" @click.prevent="step = 'register'">立即注册</a>
          </p>
        </div>

        <div
          id="authEntryStepRegister"
          class="auth-entry-step"
          :class="{ 'is-active': step === 'register' }"
          :hidden="step !== 'register'"
        >
          <h2 class="auth-entry-card-title auth-entry-card-title--form">注册账号</h2>
          <form class="auth-entry-form" enctype="multipart/form-data" @submit.prevent="onRegister">
            <div class="form-group">
              <label for="regUsername">用户名</label>
              <input
                id="regUsername"
                v-model.trim="regUsername"
                type="text"
                name="username"
                required
                autocomplete="username"
              />
            </div>
            <div class="form-group">
              <label for="regNickname">昵称</label>
              <input
                id="regNickname"
                v-model.trim="regNickname"
                type="text"
                name="nickname"
                required
                autocomplete="nickname"
              />
            </div>
            <div class="form-group">
              <label for="regPassword">密码</label>
              <div class="password-field">
                <input
                  id="regPassword"
                  v-model="regPassword"
                  :type="showRegPass ? 'text' : 'password'"
                  name="password"
                  required
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="password-toggle"
                  aria-label="显示或隐藏密码"
                  title="显示/隐藏密码"
                  @click="showRegPass = !showRegPass"
                >
                  <i class="fas" :class="showRegPass ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="regEmail">邮箱</label>
              <input id="regEmail" v-model.trim="regEmail" type="email" name="email" autocomplete="email" />
            </div>
            <p v-if="error" class="auth-error" style="color: var(--accent-primary, #ff6b6b); margin: 0 0 8px">
              {{ error }}
            </p>
            <button type="submit" class="auth-entry-btn auth-entry-btn--primary" :disabled="loading">
              {{ loading ? '注册中…' : '注册' }}
            </button>
          </form>
          <p class="auth-entry-switch">
            已有账号？
            <a href="#" @click.prevent="step = 'login'">立即登录</a>
          </p>
        </div>
      </div>
    </div>

    <footer class="auth-entry-footer">
      <div class="auth-entry-about" tabindex="0">
        <span class="auth-entry-footer-link">关于 tfhers</span>
        <div class="auth-entry-about-tip" role="tooltip">tfhers是蹄斗族群玩家们自己的社区</div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

defineProps<{
  /** When parent is authed, CSS hides overlay; keep aria in sync */
  hiddenForA11y?: boolean
}>()

const userAuth = useUserAuthStore()
const router = useRouter()
const route = useRoute()

const step = ref<'actions' | 'login' | 'register'>('actions')
const loginUsername = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regNickname = ref('')
const regPassword = ref('')
const regEmail = ref('')
const showLoginPass = ref(false)
const showRegPass = ref(false)
const error = ref('')
const loading = ref(false)

watch(
  () => route.name,
  (name) => {
    if (name === 'login') step.value = 'login'
  },
  { immediate: true },
)

async function onLogin() {
  error.value = ''
  loading.value = true
  try {
    await userAuth.login(loginUsername.value, loginPassword.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    if (route.name === 'login') {
      await router.replace(redirect || '/')
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  error.value = ''
  if (!regUsername.value || !regNickname.value || !regPassword.value) {
    error.value = '请填写必填字段'
    return
  }
  loading.value = true
  try {
    await userAuth.register({
      username: regUsername.value,
      nickname: regNickname.value,
      password: regPassword.value,
      email: regEmail.value || undefined,
    })
    if (route.name === 'login') {
      await router.replace('/')
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
