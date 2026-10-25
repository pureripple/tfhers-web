<template>
  <div class="page">
    <header class="page-head">
      <h1>AI 助手</h1>
      <span v-if="userAuth.isLoggedIn" class="status-pill" :class="statusClass">{{ statusLabel }}</span>
    </header>

    <div v-if="!userAuth.isLoggedIn" class="gate-card">
      <p>请先登录后再使用 AI 助手。</p>
      <RouterLink class="auth-btn" to="/login?redirect=/ai-chat">去登录</RouterLink>
    </div>

    <div v-else class="chat-panel">
      <div ref="listEl" class="chat-list">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="chat-bubble"
          :class="m.role === 'user' ? 'is-user' : 'is-ai'"
        >
          <div class="chat-role">{{ m.role === 'user' ? '我' : '助手' }}</div>
          <div class="chat-text">{{ m.text }}</div>
        </div>
        <p v-if="sending" class="state">助手正在回复…</p>
      </div>
      <form class="chat-input-row" @submit.prevent="onSend">
        <input
          v-model.trim="input"
          type="text"
          maxlength="1000"
          placeholder="问角色、技能、攻略…"
          :disabled="sending"
        />
        <button type="submit" class="auth-btn" :disabled="sending || !input">发送</button>
      </form>
      <p v-if="error" class="state state-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { fetchAiStatus, postAiChat } from '@/api/ai'
import { ApiError } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

const userAuth = useUserAuthStore()
const messages = ref<ChatMsg[]>([
  { role: 'ai', text: '你好，我是蹄斗族群 AI 助手。可以问我角色、技能、攻略等问题。' },
])
const input = ref('')
const sending = ref(false)
const error = ref('')
const status = ref<'unknown' | 'online' | 'offline' | 'warn'>('unknown')
const listEl = ref<HTMLElement | null>(null)

const statusLabel = computed(() => {
  if (status.value === 'online') return '在线'
  if (status.value === 'offline') return '离线'
  if (status.value === 'warn') return '异常'
  return '检测中'
})
const statusClass = computed(() => 'status-' + status.value)

async function probeStatus() {
  if (!userAuth.isLoggedIn) return
  try {
    const data = await fetchAiStatus()
    status.value = data?.status === 'online' ? 'online' : 'warn'
  } catch {
    status.value = 'offline'
  }
}

async function scrollBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function onSend() {
  const q = input.value.trim()
  if (!q || sending.value) return
  error.value = ''
  messages.value.push({ role: 'user', text: q })
  input.value = ''
  sending.value = true
  await scrollBottom()
  try {
    const answer = await postAiChat(q)
    messages.value.push({ role: 'ai', text: answer || '（空回复）' })
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'AI 服务暂时不可用'
    error.value = msg
    messages.value.push({ role: 'ai', text: '抱歉，我现在无法回答您的问题，请稍后再试。' })
  } finally {
    sending.value = false
    await scrollBottom()
  }
}

watch(
  () => userAuth.isLoggedIn,
  (ok) => {
    if (ok) probeStatus()
  },
)

onMounted(probeStatus)
</script>
