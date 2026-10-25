<template>
  <section class="page active">
    <div class="action-bar">
      <div class="action-buttons" style="display:flex;gap:8px;flex-wrap:wrap">
        <select v-model="status" class="inline-select" @change="load">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">用户连段审核</h3><div class="card-actions"><span class="article-count">共 {{ items.length }} 条</span></div></div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无连段</p>
        <table v-else-if="items.length" class="data-table">
          <thead><tr><th>ID</th><th>角色</th><th>标题</th><th>伤害</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="c in items" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ c.characterId ?? c.characterName ?? '-' }}</td>
              <td class="cell-ellipsis">{{ c.title || '-' }}</td>
              <td>{{ c.damageTotal ?? c.damage_total ?? '-' }}</td>
              <td>{{ c.status || '-' }}</td>
              <td>{{ c.createdAt || c.created_at || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === c.id" @click="onApprove(c)">通过</button>
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === c.id" @click="onReject(c)">拒绝</button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === c.id" @click="onDelete(c)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchAdminCharacters } from '@/api/admin/characters'
import { deleteAdminCombo, fetchAdminCombos, updateComboStatus } from '@/api/admin/combos'
import type { AdminCombo } from '@/api/admin/types'
import { ApiError, type GameCharacter } from '@/api/types'

const statusText: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const items = ref<AdminCombo[]>([])
const characters = ref<GameCharacter[]>([])
const status = ref('pending')
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

function charName(id?: number) {
  if (id == null) return '-'
  const c = characters.value.find((x) => x.id === id)
  return c?.nameZh || c?.nameEn || `#${id}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!characters.value.length) {
      const chars = await fetchAdminCharacters().catch(() => [] as GameCharacter[])
      characters.value = Array.isArray(chars) ? chars : []
    }
    const data = await fetchAdminCombos(status.value || undefined)
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载连招失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function onStatus(id: number, next: 'approved' | 'rejected') {
  busyId.value = id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateComboStatus(id, next)
    actionMsg.value = next === 'approved' ? '已通过' : '已拒绝'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '操作失败'
  } finally {
    busyId.value = null
  }
}

async function onDelete(c: AdminCombo) {
  if (!confirm(`确认删除连招「${c.title || c.id}」？`)) return
  busyId.value = c.id
  try {
    await deleteAdminCombo(c.id)
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

onMounted(load)
</script>