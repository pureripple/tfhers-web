<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>个人资料</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>

    <div v-else class="profile-grid">
      <section class="card profile-card">
        <h2>基本信息</h2>
        <div class="cell-player" style="margin-bottom: 1rem">
          <img v-if="profile?.avatarUrl" class="avatar" style="width:48px;height:48px" :src="profile.avatarUrl" alt="" />
          <div>
            <div>{{ profile?.realName || profile?.nickname || profile?.username }}</div>
            <div class="muted">@{{ profile?.username }}</div>
          </div>
        </div>
        <form class="auth-form" @submit.prevent="onSaveProfile">
          <label>
            真实姓名
            <input v-model.trim="form.realName" type="text" />
          </label>
          <label>
            邮箱
            <input v-model.trim="form.email" type="email" />
          </label>
          <label>
            手机
            <input v-model.trim="form.phone" type="text" />
          </label>
          <button type="submit" class="auth-btn" :disabled="saving">保存资料</button>
          <p v-if="profileMsg" class="state" :class="profileErr ? 'state-error' : ''">{{ profileMsg }}</p>
        </form>
      </section>

      <section class="card profile-card">
        <h2>修改密码</h2>
        <form class="auth-form" @submit.prevent="onChangePassword">
          <label>
            当前密码
            <input v-model="pwd.oldPassword" type="password" autocomplete="current-password" required />
          </label>
          <label>
            新密码
            <input v-model="pwd.newPassword" type="password" autocomplete="new-password" required minlength="6" />
          </label>
          <label>
            确认新密码
            <input v-model="pwd.confirmPassword" type="password" autocomplete="new-password" required minlength="6" />
          </label>
          <button type="submit" class="auth-btn" :disabled="pwdSaving">修改密码</button>
          <p v-if="pwdMsg" class="state" :class="pwdErr ? 'state-error' : ''">{{ pwdMsg }}</p>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { changeAdminPassword, fetchAdminProfile, updateAdminProfile } from '@/api/admin/profile'
import type { AdminProfileInfo } from '@/api/admin/types'
import { ApiError } from '@/api/types'
import { useAdminAuthStore } from '@/stores/auth'

const adminAuth = useAdminAuthStore()
const loading = ref(false)
const error = ref('')
const profile = ref<AdminProfileInfo | null>(null)
const form = reactive({ realName: '', email: '', phone: '' })
const saving = ref(false)
const profileMsg = ref('')
const profileErr = ref(false)

const pwd = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdSaving = ref(false)
const pwdMsg = ref('')
const pwdErr = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminProfile()
    profile.value = data
    form.realName = data?.realName || ''
    form.email = data?.email || ''
    form.phone = data?.phone || ''
    adminAuth.loadUserInfo().catch(() => undefined)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资料失败'
  } finally {
    loading.value = false
  }
}

async function onSaveProfile() {
  saving.value = true
  profileMsg.value = ''
  profileErr.value = false
  try {
    await updateAdminProfile({ ...form })
    profileMsg.value = '资料已更新'
    await load()
  } catch (e) {
    profileErr.value = true
    profileMsg.value = e instanceof ApiError ? e.message : '更新失败'
  } finally {
    saving.value = false
  }
}

async function onChangePassword() {
  pwdMsg.value = ''
  pwdErr.value = false
  if (pwd.newPassword !== pwd.confirmPassword) {
    pwdErr.value = true
    pwdMsg.value = '两次新密码不一致'
    return
  }
  if (pwd.newPassword.length < 6) {
    pwdErr.value = true
    pwdMsg.value = '新密码至少 6 位'
    return
  }
  pwdSaving.value = true
  try {
    await changeAdminPassword({ ...pwd })
    pwdMsg.value = '密码修改成功'
    pwd.oldPassword = ''
    pwd.newPassword = ''
    pwd.confirmPassword = ''
  } catch (e) {
    pwdErr.value = true
    pwdMsg.value = e instanceof ApiError ? e.message : '修改失败'
  } finally {
    pwdSaving.value = false
  }
}

onMounted(load)
</script>