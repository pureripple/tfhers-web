<template>
  <div class="page">
    <header class="page-head">
      <h1>赛事</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无赛事</p>

    <div v-else class="stack">
      <article v-for="item in items" :key="item.id" class="card">
        <div class="card-body">
          <h2 class="card-title">{{ item.title || '未命名赛事' }}</h2>
          <p class="card-meta">
            <span class="badge">{{ statusLabel(item.status) }}</span>
            <span v-if="item.bracketType">赛制 {{ item.bracketType }}</span>
            <span>
              报名 {{ item.registrationCount ?? 0 }}
              <template v-if="item.maxSlots != null"> / {{ item.maxSlots }}</template>
            </span>
            <span v-if="item.registeredByMe" class="badge badge-ok">已报名</span>
          </p>
          <p v-if="item.startsAt" class="card-meta">开始时间 {{ formatTime(item.startsAt) }}</p>
          <p v-if="item.description" class="card-summary">{{ item.description }}</p>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchTournaments } from '@/api/tournaments'
import { ApiError, type Tournament } from '@/api/types'

const items = ref<Tournament[]>([])
const loading = ref(false)
const error = ref('')

const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  open: '报名中',
  registration: '报名中',
  closed: '报名截止',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
}

function statusLabel(s?: string) {
  if (!s) return '未知'
  return STATUS_MAP[s] || s
}

function formatTime(v?: string) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleString('zh-CN')
  } catch {
    return v
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchTournaments()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载赛事失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
