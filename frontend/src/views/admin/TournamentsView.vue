<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">赛事管理（创建表单未迁入）</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" disabled><i class="fas fa-plus"></i> 创建赛事</button>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">赛事列表</h3>
        <div class="card-actions"><span class="article-count">共 {{ items.length }} 场</span></div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无赛事</p>
        <table v-else-if="items.length" class="data-table">
          <thead>
            <tr><th>ID</th><th>标题</th><th>状态</th><th>报名</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in items" :key="t.id">
              <td>{{ t.id }}</td>
              <td class="cell-ellipsis">{{ t.title || '-' }}</td>
              <td>{{ t.status || '-' }}</td>
              <td>
                {{ t.registrationCount ?? 0 }}
                <span v-if="t.maxSlots != null"> / {{ t.maxSlots }}</span>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openDetail(t)">详情</button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === t.id" @click="onDelete(t)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="detailOpen" class="vue-drawer-mask" @click.self="detailOpen = false">
      <aside class="vue-drawer">
        <header class="vue-drawer-head">
          <h2>{{ detail?.title || '赛事详情' }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="detailOpen = false">关闭</button>
        </header>
        <p v-if="detailLoading" class="vue-state">加载中…</p>
        <p v-else-if="detailError" class="vue-state vue-state-error">{{ detailError }}</p>
        <div v-else-if="detail">
          <p class="vue-detail-meta">状态 {{ detail.status }} · 赛制 {{ detail.bracketType || '-' }}</p>
          <p class="vue-detail-block">{{ detail.description || '无描述' }}</p>
          <h3 style="margin:1rem 0 0.5rem;font-size:1rem">报名（{{ regs.length }}）</h3>
          <ul class="plain-list">
            <li v-for="(r, i) in regs" :key="i">{{ r.nickname || r.username || r.userId || JSON.stringify(r) }}</li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
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