<template>
  <section id="settings" class="page page-settings active">
    <div class="settings-page-wrap">
      <header class="settings-page-header">
        <h1 class="settings-page-title">设置</h1>
        <p class="settings-page-desc">管理账号、通知、绑定与外观</p>
      </header>

      <div class="settings-page-body">
        <section class="settings-block" aria-labelledby="settingsAccountHeading">
          <h2 id="settingsAccountHeading" class="settings-block-title">账号</h2>
          <form class="settings-block-form" @submit.prevent="saveEmail">
            <div class="form-group">
              <label for="settingsUsername">用户名</label>
              <input id="settingsUsername" type="text" :value="username" disabled />
              <small class="form-hint">用户名不可修改</small>
            </div>
            <div class="form-group">
              <label for="settingsEmail">邮箱地址</label>
              <input id="settingsEmail" v-model.trim="email" type="email" maxlength="100" autocomplete="email" />
            </div>
            <div class="settings-form-actions">
              <button type="button" class="btn btn-primary" :disabled="savingBasic" @click="saveEmail">
                <i class="fas fa-save"></i> 保存邮箱
              </button>
            </div>
          </form>

          <div class="settings-subsection">
            <h3 class="settings-subsection-title">密码</h3>
            <form @submit.prevent="savePassword">
              <div class="form-group">
                <label for="settingsOldPassword">当前密码</label>
                <div class="password-field">
                  <input id="settingsOldPassword" v-model="oldPassword" :type="showOld ? 'text' : 'password'" required autocomplete="current-password" />
                  <button type="button" class="password-toggle" @click="showOld = !showOld"><i class="fas" :class="showOld ? 'fa-eye-slash' : 'fa-eye'"></i></button>
                </div>
              </div>
              <div class="form-group">
                <label for="settingsNewPassword">新密码</label>
                <div class="password-field">
                  <input id="settingsNewPassword" v-model="newPassword" :type="showNew ? 'text' : 'password'" minlength="6" maxlength="64" required autocomplete="new-password" />
                  <button type="button" class="password-toggle" @click="showNew = !showNew"><i class="fas" :class="showNew ? 'fa-eye-slash' : 'fa-eye'"></i></button>
                </div>
                <small class="form-hint">至少 6 位</small>
              </div>
              <div class="form-group">
                <label for="settingsConfirmPassword">确认新密码</label>
                <div class="password-field">
                  <input id="settingsConfirmPassword" v-model="confirmPassword" :type="showConfirm ? 'text' : 'password'" minlength="6" maxlength="64" required autocomplete="new-password" />
                  <button type="button" class="password-toggle" @click="showConfirm = !showConfirm"><i class="fas" :class="showConfirm ? 'fa-eye-slash' : 'fa-eye'"></i></button>
                </div>
              </div>
              <div class="settings-form-actions">
                <button type="button" class="btn btn-outline" @click="resetPassword">清空</button>
                <button type="button" class="btn btn-primary" :disabled="savingPwd" @click="savePassword">
                  <i class="fas fa-key"></i> 修改密码
                </button>
              </div>
            </form>
          </div>
        </section>

        <hr class="settings-divider" />

        <section class="settings-block" aria-labelledby="settingsNotifyHeading">
          <h2 id="settingsNotifyHeading" class="settings-block-title">通知</h2>
          <div class="settings-notify-list">
            <label class="settings-toggle-row" for="settingsNotifyLike">
              <span>作品被赞</span>
              <input id="settingsNotifyLike" v-model="notifyLike" type="checkbox" role="switch" @change="persistNotify" />
            </label>
            <label class="settings-toggle-row" for="settingsNotifyComment">
              <span>作品有新评论</span>
              <input id="settingsNotifyComment" v-model="notifyComment" type="checkbox" role="switch" @change="persistNotify" />
            </label>
          </div>
        </section>

        <hr class="settings-divider" />

        <section class="settings-block" aria-labelledby="settingsBindHeading">
          <h2 id="settingsBindHeading" class="settings-block-title">绑定服务</h2>
          <div class="settings-bind-block">
            <h3 class="settings-subsection-title"><i class="fab fa-steam-symbol"></i> Steam</h3>
            <div class="settings-bind-steam-status">{{ steamBound ? '已绑定' : '未绑定' }}</div>
            <div class="settings-form-actions" style="justify-content:flex-start;gap:8px;">
              <button type="button" class="btn btn-primary" @click="onBindSteam">
                <i class="fab fa-steam-symbol"></i> 绑定 Steam
              </button>
            </div>
          </div>
        </section>

        <hr class="settings-divider" />

        <section class="settings-block" aria-labelledby="settingsThemeHeading">
          <h2 id="settingsThemeHeading" class="settings-block-title">页面颜色</h2>
          <label class="settings-toggle-row" for="settingsDarkMode">
            <span>黑暗模式<span class="settings-toggle-hint">（默认开启）</span></span>
            <input id="settingsDarkMode" v-model="darkMode" type="checkbox" role="switch" @change="persistTheme" />
          </label>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { changeUserPassword, fetchUserProfile, updateUserProfile } from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/types'

const NOTIFY_KEY = 'tfhers_notify_prefs'
const THEME_KEY = 'tfhers_dark_mode'

const auth = useUserAuthStore()
const email = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const savingBasic = ref(false)
const savingPwd = ref(false)
const notifyLike = ref(true)
const notifyComment = ref(true)
const darkMode = ref(true)
const steamBound = ref(false)

const username = computed(() => auth.user?.username || '')

function loadNotify() {
  try {
    const raw = localStorage.getItem(NOTIFY_KEY)
    if (!raw) return
    const p = JSON.parse(raw) as { like?: boolean; comment?: boolean }
    notifyLike.value = !!p.like
    notifyComment.value = !!p.comment
  } catch {
    /* ignore */
  }
}
function persistNotify() {
  localStorage.setItem(NOTIFY_KEY, JSON.stringify({ like: notifyLike.value, comment: notifyComment.value }))
}
function loadTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    darkMode.value = v == null ? true : v === '1'
  } catch {
    darkMode.value = true
  }
  document.documentElement.classList.toggle('theme-light', !darkMode.value)
}
function persistTheme() {
  localStorage.setItem(THEME_KEY, darkMode.value ? '1' : '0')
  document.documentElement.classList.toggle('theme-light', !darkMode.value)
}

async function hydrateFromServer() {
  try {
    const p = await fetchUserProfile()
    email.value = String(p.email || '')
    steamBound.value = !!(p.steamId || p.steamName)
    const raw = localStorage.getItem('user')
    if (raw) {
      const u = JSON.parse(raw) as Record<string, unknown>
      Object.assign(u, {
        email: p.email ?? u.email,
        nickname: p.nickname ?? u.nickname,
        avatarUrl: p.avatarUrl ?? u.avatarUrl,
        steamId: p.steamId ?? u.steamId,
      })
      localStorage.setItem('user', JSON.stringify(u))
      auth.hydrate()
    }
  } catch {
    email.value = String((auth.user as { email?: string } | null)?.email || '')
  }
}

async function saveEmail() {
  savingBasic.value = true
  try {
    const nickname = auth.user?.nickname || auth.user?.username || ''
    await updateUserProfile({ nickname, email: email.value, phone: '', signature: '' })
    window.alert('邮箱已保存')
    await hydrateFromServer()
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    savingBasic.value = false
  }
}

function resetPassword() {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function savePassword() {
  if (!oldPassword.value || !newPassword.value) {
    window.alert('请填写密码')
    return
  }
  if (newPassword.value.length < 6) {
    window.alert('新密码至少 6 位')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    window.alert('两次输入的新密码不一致')
    return
  }
  savingPwd.value = true
  try {
    await changeUserPassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    window.alert('密码已修改')
    resetPassword()
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '修改失败')
  } finally {
    savingPwd.value = false
  }
}

function onBindSteam() {
  window.alert('请在线站完成 Steam 绑定（需 OAuth 回跳）')
}

onMounted(async () => {
  loadNotify()
  loadTheme()
  await hydrateFromServer()
})
</script>
