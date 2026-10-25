<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>用户连招审核</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <div class="toolbar filter-bar">
      <label>
        状态
        <select v-model="status" @change="load">
          <option value="">全部</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无连招</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>角色</th>
            <th>标题</th>
            <th>伤害</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ charName(c.characterId) }}</td>
            <td class="cell-ellipsis" :title="c.title">{{ c.title || '-' }}</td>
            <td>{{ c.damageTotal ?? '-' }}</td>
            <td>{{ statusText[c.status || ''] || c.status || '-' }}</td>
            <td>{{ c.createdAt || '-' }}</td>
            <td class="cell-actions">
              <template v-if="c.status === 'pending'">
                <button type="button" class="ghost-btn" :disabled="busyId === c.id" @click="onStatus(c.id, 'approved')">
                  通过
                </button>
                <button type="button" class="ghost-btn" :disabled="busyId === c.id" @click="onStatus(c.id, 'rejected')">
                  拒绝
                </button>
              </template>
              <button type="button" class="ghost-btn danger-btn" :disabled="busyId === c.id" @click="onDelete(c)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
  </div>
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