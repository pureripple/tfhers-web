<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>赛事管理</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p class="page-desc">赛事列表、改状态、删除。创建/对阵编辑未完整迁入。</p>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无赛事</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>状态</th>
            <th>报名</th>
            <th>赛制</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in items" :key="t.id">
            <td>{{ t.id }}</td>
            <td class="cell-ellipsis" :title="t.title">{{ t.title || '-' }}</td>
            <td>{{ statusLabel[t.status || ''] || t.status || '-' }}</td>
            <td>{{ t.registrationCount ?? 0 }} / {{ t.maxSlots || 16 }}</td>
            <td>{{ t.bracketType === 'single' ? '单败' : '双败' }}</td>
            <td class="cell-actions">
              <select
                class="inline-select"
                :value="t.status || 'draft'"
                :disabled="busyId === t.id"
                @change="onStatus(t.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="s in statusOptions" :key="s" :value="s">{{ statusLabel[s] }}</option>
              </select>
              <button type="button" class="ghost-btn" :disabled="busyId === t.id" @click="openDetail(t.id)">详情</button>
              <button type="button" class="ghost-btn danger-btn" :disabled="busyId === t.id" @click="onDelete(t)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="detailOpen" class="drawer-mask" @click.self="detailOpen = false">
      <aside class="drawer">
        <header class="drawer-head">
          <h2>{{ detail?.title || '赛事详情' }}</h2>
          <button type="button" class="ghost-btn" @click="detailOpen = false">关闭</button>
        </header>
        <p v-if="detailLoading" class="state">加载中…</p>
        <p v-else-if="detailError" class="state state-error">{{ detailError }}</p>
        <template v-else-if="detail">
          <p class="card-meta">
            <span>{{ statusLabel[detail.status || ''] || detail.status }}</span>
            <span>报名 {{ regs.length }}</span>
          </p>
          <p class="detail-block">{{ detail.description || '暂无说明' }}</p>
          <h3 style="font-size: 1rem">报名选手</h3>
          <ul v-if="regs.length" class="plain-list">
            <li v-for="(r, i) in regs" :key="i">
              {{ (r as any).nickname || (r as any).username || `用户${(r as any).userId}` }}
            </li>
          </ul>
          <p v-else class="state">暂无报名</p>
        </template>
      </aside>
    </div>
    <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteAdminTournament,
  fetchAdminTournamentDetail,
  fetchAdminTournaments,
  updateTournamentStatus,
} from '@/api/admin/tournaments'
import { ApiError, type Tournament } from '@/api/types'

const statusOptions = ['draft', 'registration', 'closed', 'ongoing', 'finished', 'cancelled']
const statusLabel: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  closed: '报名截止',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
}

const items = ref<Tournament[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

const detailOpen = ref(false)
const detail = ref<Tournament | null>(null)
const regs = ref<unknown[]>([])
const detailLoading = ref(false)
const detailError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminTournaments()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载赛事失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function onStatus(id: number, status: string) {
  busyId.value = id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateTournamentStatus(id, status)
    actionMsg.value = '状态已更新'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '更新失败'
  } finally {
    busyId.value = null
  }
}

async function onDelete(t: Tournament) {
  if (!confirm(`确认删除赛事「${t.title || t.id}」？将同时删除报名与对阵。`)) return
  busyId.value = t.id
  try {
    await deleteAdminTournament(t.id)
    actionMsg.value = '已删除'
    actionErr.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '删除失败'
  } finally {
    busyId.value = null
  }
}

async function openDetail(id: number) {
  detailOpen.value = true
  detail.value = null
  regs.value = []
  detailError.value = ''
  detailLoading.value = true
  try {
    const data = await fetchAdminTournamentDetail(id)
    detail.value = data?.tournament || null
    regs.value = Array.isArray(data?.registrations) ? data.registrations : []
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

onMounted(load)
</script>