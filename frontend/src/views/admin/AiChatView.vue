<template>
  <section class="page active">
    <div class="ai-chat-layout grok-layout">
      <div class="grok-chat-panel">
        <header class="grok-head">
          <div class="grok-head-left">
            <span class="grok-model-badge">蹄斗 AI（管理）</span>
            <span class="status-indicator grok-status-dot">
              <i class="fas fa-circle"></i>
              <span class="grok-status-text">{{ statusLabel }}</span>
            </span>
          </div>
        </header>
        <div ref="listEl" class="grok-messages" style="flex:1;overflow:auto;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;min-height:360px">
          <div
            v-for="(m, i) in messages"
            :key="i"
            :style="m.role === 'user'
              ? { alignSelf: 'flex-end', background: 'rgba(255,122,122,0.18)', maxWidth: '85%', padding: '0.65rem 0.85rem', borderRadius: '12px' }
              : { alignSelf: 'flex-start', background: 'var(--bg-secondary,rgba(255,255,255,0.06))', maxWidth: '85%', padding: '0.65rem 0.85rem', borderRadius: '12px' }"
          >
            <div style="font-size:0.75rem;opacity:0.7;margin-bottom:0.2rem">{{ m.role === 'user' ? '我' : '助手' }}</div>
            <div style="white-space:pre-wrap;word-break:break-word">{{ m.text }}</div>
          </div>
          <p v-if="sending" class="vue-state">助手正在回复…</p>
        </div>
        <form style="display:flex;gap:0.5rem;padding:0.75rem;border-top:1px solid var(--border-color,rgba(255,255,255,0.08))" @submit.prevent="onSend">
          <input v-model.trim="input" type="text" maxlength="1000" placeholder="问运营/内容相关问题…" :disabled="sending"
            style="flex:1;border:1px solid var(--border-color,rgba(255,255,255,0.14));border-radius:10px;padding:0.55rem 0.7rem;background:var(--bg-tertiary,#0f0f14);color:inherit;font:inherit" />
          <button type="submit" class="btn btn-primary" :disabled="sending || !input">发送</button>
        </form>
        <p v-if="error" class="vue-state vue-state-error">{{ error }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { fetchAiStatus, postAiChat } from '@/api/ai'
import { ApiError } from '@/api/types'

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
}

const messages = ref<ChatMsg[]>([
  { role: 'ai', text: '你好，我是 TFHers 管理端 AI 助手。可以问我角色、招式、赛事等问题。' },
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
    messages.value.push({ role: 'ai', text: '抱歉，当前无法回答该问题，请稍后再试。' })
  } finally {
    sending.value = false
    await scrollBottom()
  }
}

onMounted(probeStatus)
</script>