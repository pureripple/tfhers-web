<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">个人资料</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div v-else class="profile-grid">
      <div class="content-card" style="padding: 1.25rem">
        <h3 class="card-title" style="margin-bottom: 1rem">基本信息</h3>
        <div class="form-field">
          <label>头像</label>
          <div class="image-upload-container" style="max-width: 220px">
            <input ref="avatarInput" type="file" accept="image/*" style="display: none" @change="onAvatarFile" />
            <div
              v-show="!avatarUrl"
              class="image-upload-area"
              :class="{ uploading: avatarUploading }"
              @click="avatarInput?.click()"
            >
              <i class="fas fa-cloud-upload-alt"></i>
              <p>{{ avatarUploading ? '上传中…' : '点击上传头像' }}</p>
              <small>最大 5MB</small>
            </div>
            <div v-show="avatarUrl" class="image-preview">
              <img :src="avatarUrl" alt="头像预览" />
              <button type="button" class="remove-image-btn" title="重新上传" @click="avatarInput?.click()">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="form-field"><label>用户名</label><input :value="profile?.username || ''" disabled /></div>
        <div class="form-field"><label>真实姓名</label><input v-model="form.realName" /></div>
        <div class="form-field"><label>邮箱</label><input v-model="form.email" /></div>
        <div class="form-field"><label>手机</label><input v-model="form.phone" /></div>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="onSaveProfile">
          {{ saving ? '保存中…' : '保存资料' }}
        </button>
        <p v-if="profileMsg" class="vue-state" :class="profileErr ? 'vue-state-error' : ''">{{ profileMsg }}</p>
      </div>
      <div class="content-card" style="padding: 1.25rem">
        <h3 class="card-title" style="margin-bottom: 1rem">修改密码</h3>
        <div class="form-field">
          <label>当前密码</label>
          <input v-model="pwd.oldPassword" type="password" autocomplete="current-password" />
        </div>
        <div class="form-field">
          <label>新密码</label>
          <input v-model="pwd.newPassword" type="password" autocomplete="new-password" />
        </div>
        <div class="form-field">
          <label>确认新密码</label>
          <input v-model="pwd.confirmPassword" type="password" autocomplete="new-password" />
        </div>
        <button type="button" class="btn btn-primary" :disabled="pwdSaving" @click="onChangePassword">
          {{ pwdSaving ? '提交中…' : '修改密码' }}
        </button>
        <p v-if="pwdMsg" class="vue-state" :class="pwdErr ? 'vue-state-error' : ''">{{ pwdMsg }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  changeAdminPassword,
  fetchAdminProfile,
  updateAdminProfile,
  uploadAdminAvatar,
} from '@/api/admin/profile'
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
const avatarUrl = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

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
    avatarUrl.value = String(data?.avatarUrl || '')
    adminAuth.loadUserInfo().catch(() => undefined)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资料失败'
  } finally {
    loading.value = false
  }
}

async function onAvatarFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarUploading.value = true
  profileMsg.value = ''
  profileErr.value = false
  try {
    avatarUrl.value = await uploadAdminAvatar(file)
    profileMsg.value = '头像上传成功'
    await adminAuth.loadUserInfo().catch(() => undefined)
  } catch (err) {
    profileErr.value = true
    profileMsg.value = err instanceof ApiError ? err.message : '头像上传失败'
  } finally {
    avatarUploading.value = false
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
    profileMsg.value = e instanceof ApiError ? e.message : '保存失败'
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

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}
</style>
