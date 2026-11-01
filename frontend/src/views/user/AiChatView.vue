<template>
  <section id="ai-chat" class="page page-ai-chat active">
    <div class="ai-chat-layout grok-layout">
      <div class="grok-chat-panel">
        <header class="grok-head" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
          <div class="grok-head-left">
            <span class="grok-model-badge">天火 AI</span>
            <span class="status-indicator grok-status-dot" :class="'is-' + status">
              <i class="fas fa-circle"></i>
              <span class="grok-status-text">{{ statusLabel }}</span>
            </span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="position:relative">
              <button type="button" class="btn btn-secondary btn-sm" id="historyToggle" @click="historyOpen = !historyOpen">历史</button>
              <div
                v-if="historyOpen"
                id="historyDropdown"
                class="show"
                style="position:absolute;right:0;top:110%;z-index:20;min-width:260px;max-height:320px;overflow:auto;background:var(--bg-elevated,#1a1a22);border:1px solid var(--border-color,rgba(255,255,255,0.12));border-radius:10px;padding:8px"
              >
                <button type="button" class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:8px" @click="clearChat">清空历史</button>
                <p v-if="!chatHistory.length" class="vue-state">暂无历史</p>
                <button
                  v-for="(h, i) in recentHistory"
                  :key="i"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  style="width:100%;margin-bottom:6px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                  :title="h.user"
                  @click="reuseHistory(h)"
                >
                  {{ formatTime(h) }} · {{ h.user }}
                </button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" @click="clearChat">清空对话</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="exportChat">导出</button>
          </div>
        </header>

        <div ref="listEl" class="grok-messages messages-container" id="messagesContainer">
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="grok-bubble"
            :class="m.role === 'user' ? 'is-user' : 'is-ai'"
            style="max-width:85%;padding:0.65rem 0.85rem;border-radius:12px;background:var(--bg-secondary,rgba(255,255,255,0.06))"
            :style="m.role === 'user' ? { alignSelf: 'flex-end', background: 'rgba(255,122,122,0.18)' } : { alignSelf: 'flex-start' }"
          >
            <div style="font-size:0.75rem;opacity:0.7;margin-bottom:0.2rem">{{ m.role === 'user' ? '我' : '天火' }}</div>
            <div style="white-space:pre-wrap;word-break:break-word">{{ m.text }}</div>
          </div>
          <p v-if="sending" class="vue-state">天火正在回复…</p>
          <p v-if="error" class="vue-state vue-state-error">{{ error }}</p>
        </div>

        <form
          class="grok-composer"
          style="flex-shrink:0;display:flex;gap:0.5rem;padding:0.75rem;border-top:1px solid var(--border-color,rgba(255,255,255,0.08));position:sticky;bottom:0;background:var(--bg-primary,#0a0a0e);z-index:2;align-items:center;flex-wrap:wrap"
          @submit.prevent="onSend"
        >
          <input
            v-model.trim="input"
            type="text"
            maxlength="1000"
            placeholder="问角色、连招、机制…"
            :disabled="sending"
            style="flex:1;min-width:180px;border:1px solid var(--border-color,rgba(255,255,255,0.14));border-radius:10px;padding:0.55rem 0.7rem;background:var(--bg-tertiary,#0f0f14);color:inherit;font:inherit"
          />
          <span :style="{ opacity: 0.7, fontSize: '12px', color: charColor }">{{ input.length }} / 1000</span>
          <button type="submit" class="btn btn-primary" :disabled="sending || !input">发送</button>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { fetchAiStatus, postAiChat } from '@/api/ai'
import { ApiError } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

/** Same key as legacy tfhers-web-app static/js/ai-chat.js */
const HISTORY_KEY = 'aiChatHistoryApp'
const WELCOME = '你好，我是天火社区 AI 助手。可以问我角色、连招、机制等问题。'

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

interface HistoryEntry {
  user: string
  ai: string
  timestamp?: string
  time?: number
}

const auth = useUserAuthStore()

const messages = ref<ChatMsg[]>([{ role: 'ai', text: WELCOME }])
const input = ref('')
const sending = ref(false)
const error = ref('')
const status = ref<'unknown' | 'online' | 'offline' | 'warn'>('unknown')
const listEl = ref<HTMLElement | null>(null)
const chatHistory = ref<HistoryEntry[]>([])
const historyOpen = ref(false)

const statusLabel = computed(() => {
  if (status.value === 'online') return '在线'
  if (status.value === 'offline') return '离线'
  if (status.value === 'warn') return '异常'
  return '检测中…'
})

const recentHistory = computed(() => [...chatHistory.value].slice(-10).reverse())

const charColor = computed(() => {
  const n = input.value.length
  if (n > 900) return '#ff6b6b'
  if (n > 700) return '#ffb020'
  return 'inherit'
})

function formatTime(h: HistoryEntry) {
  const raw = h.timestamp || (h.time ? new Date(h.time).toISOString() : '')
  if (!raw) return ''
  try {
    return new Date(raw).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

async function probeStatus() {
  try {
    const data = await fetchAiStatus('user')
    status.value = data?.status === 'online' ? 'online' : 'warn'
  } catch {
    status.value = 'offline'
  }
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    chatHistory.value = raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    chatHistory.value = []
  }
}

function persistHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory.value))
}

function saveToHistory(user: string, ai: string) {
  chatHistory.value.push({ user, ai, timestamp: new Date().toISOString() })
  persistHistory()
}

function reuseHistory(h: HistoryEntry) {
  input.value = h.user
  historyOpen.value = false
}

function clearChat() {
  if (!confirm('确定要清空所有对话记录吗？')) return
  messages.value = [{ role: 'ai', text: WELCOME }]
  chatHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
  historyOpen.value = false
  error.value = ''
}

function exportChat() {
  if (!chatHistory.value.length) {
    error.value = '没有对话记录可导出'
    return
  }
  let exportText = '天火社区 AI 助手对话记录\n' + '='.repeat(50) + '\n\n'
  chatHistory.value.forEach((entry, index) => {
    const time = formatTime(entry) || new Date(entry.timestamp || entry.time || Date.now()).toLocaleString('zh-CN')
    exportText += `对话 ${index + 1} - ${time}\n`
    exportText += `用户: ${entry.user}\n`
    exportText += `AI: ${entry.ai}\n`
    exportText += '-'.repeat(30) + '\n\n'
  })
  const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AI对话记录_${new Date().toISOString().split('T')[0]}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

async function scrollBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function onSend() {
  const q = input.value.trim()
  if (!q || sending.value) return
  if (!auth.isLoggedIn) {
    error.value = '请先登录后再使用 AI'
    return
  }
  error.value = ''
  messages.value.push({ role: 'user', text: q })
  input.value = ''
  sending.value = true
  await scrollBottom()
  try {
    const answer = await postAiChat(q, 'user')
    const text = answer || '（空回复）'
    messages.value.push({ role: 'ai', text })
    saveToHistory(q, text)
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : 'AI 服务暂时不可用'
    error.value = msg
    messages.value.push({ role: 'ai', text: '抱歉，这一轮无法回答你的问题，请稍后再试。' })
  } finally {
    sending.value = false
    await scrollBottom()
  }
}

onMounted(() => {
  document.body.classList.add('ai-chat-page')
  loadChatHistory()
  probeStatus()
})
onUnmounted(() => {
  document.body.classList.remove('ai-chat-page')
})
</script>
