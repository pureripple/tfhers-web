<template>
  <section class="page active">
    <div class="tournaments-page">
      <div class="tournaments-layout">
        <div class="tournament-list" aria-label="list">
          <div v-if="loading" class="tournament-empty">加载中…</div>
          <div v-else-if="error" class="tournament-empty">{{ error }}</div>
          <div v-else-if="!items.length" class="tournament-empty">暂无公开赛事</div>
          <article
            v-for="item in items"
            v-else
            :key="item.id"
            class="tournament-card"
            :class="{ active: selectedId === item.id }"
            @click="selectedId = item.id"
          >
            <div class="tournament-card-top">
              <h3 class="tournament-card-title">{{ item.title || '-' }}</h3>
              <span class="tournament-status" :class="item.status || ''">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="tournament-card-meta">
              <span>
                <i class="fas fa-users"></i>
                {{ item.registrationCount ?? 0 }}
                <template v-if="item.maxSlots != null"> / {{ item.maxSlots }}</template>
                <template v-if="item.registeredByMe"> · 已报名</template>
              </span>
              <span v-if="item.startsAt"><i class="fas fa-clock"></i> {{ formatTime(item.startsAt) }}</span>
            </div>
          </article>
        </div>
        <div class="tournament-detail active" aria-label="detail">
          <div v-if="!selected" class="tournament-empty">请选择赛事</div>
          <template v-else>
            <div class="tournament-detail-panel">
              <div class="tournament-detail-head">
                <div class="tournament-detail-head-row">
                  <div class="tournament-detail-head-main">
                    <h3 class="tournament-detail-title">{{ selected.title || '-' }}</h3>
                    <span class="tournament-status" :class="selected.status || ''">{{ statusLabel(selected.status) }}</span>
                  </div>
                </div>
              </div>
              <p v-if="selected.description" class="tournament-detail-desc">{{ selected.description }}</p>
              <div class="tournament-detail-times">
                <div v-if="selected.bracketType">赛制：{{ selected.bracketType }}</div>
                <div v-if="selected.startsAt">开始：{{ formatTime(selected.startsAt) }}</div>
                <div>
                  报名 {{ selected.registrationCount ?? 0 }}
                  <template v-if="selected.maxSlots != null"> / {{ selected.maxSlots }}</template>
                  <span v-if="selected.registeredByMe" class="tournament-checkin-badge">已报名</span>
                </div>
              </div>
              <div class="tournament-detail-actions">
                <button
                  v-if="!selected.registeredByMe"
                  type="button"
                  class="btn btn-primary"
                  :disabled="acting || !canRegister(selected)"
                  @click="doRegister"
                >立即报名</button>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline"
                  :disabled="acting"
                  @click="doUnregister"
                >取消报名</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchTournaments, registerTournament, unregisterTournament } from '@/api/tournaments'
import { ApiError, type Tournament } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

const auth = useUserAuthStore()
const items = ref<Tournament[]>([])
const loading = ref(false)
const error = ref('')
const selectedId = ref<number | null>(null)
const acting = ref(false)

const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  open: '报名中',
  registration: '报名中',
  closed: '报名截止',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
}

const selected = computed(() => items.value.find((t) => t.id === selectedId.value) || null)

function statusLabel(s?: string) {
  if (!s) return '-'
  return STATUS_MAP[s] || s
}
function formatTime(v?: string) {
  if (!v) return ''
  try { return new Date(v).toLocaleString('zh-CN') } catch { return v }
}
function canRegister(t: Tournament) {
  const st = (t.status || '').toLowerCase()
  return st === 'open' || st === 'registration'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchTournaments()
    items.value = Array.isArray(data) ? data : []
    if (items.value.length) {
      const keep = selectedId.value && items.value.some((x) => x.id === selectedId.value)
      selectedId.value = keep ? selectedId.value : items.value[0].id
    } else {
      selectedId.value = null
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'error'
    items.value = []
    selectedId.value = null
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  if (!selected.value) return
  if (!auth.isLoggedIn) {
    window.alert('请先登录')
    return
  }
  acting.value = true
  try {
    await registerTournament(selected.value.id)
    await load()
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : 'error')
  } finally {
    acting.value = false
  }
}

async function doUnregister() {
  if (!selected.value) return
  acting.value = true
  try {
    await unregisterTournament(selected.value.id)
    await load()
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : 'error')
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>
