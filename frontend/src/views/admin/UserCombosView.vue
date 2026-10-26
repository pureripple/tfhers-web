<template>
  <section class="page active">
    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">用户连招审核</h3>
        <div class="card-actions">
          <div style="display: flex; align-items: center; gap: 12px">
            <select v-model="status" class="select-input" @change="load">
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i> 刷新
            </button>
          </div>
        </div>
      </div>
      <div class="table-container">
        <p v-if="loading" class="vue-state">加载中…</p>
        <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
        <p v-else-if="!items.length" class="vue-state">暂无连招</p>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>角色</th>
              <th>标题</th>
              <th>伤害</th>
              <th>说明</th>
              <th>视频</th>
              <th>连招文件</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in items" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ charName(c.characterId) }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 160px" :title="c.title || ''">{{ c.title || '-' }}</div>
              </td>
              <td>{{ c.damageTotal ?? c.damage_total ?? '-' }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 180px" :title="String(c.description || '')">
                  {{ c.description || '-' }}
                </div>
              </td>
              <td>
                <a v-if="c.videoUrl" :href="String(c.videoUrl)" target="_blank" rel="noopener">查看</a>
                <span v-else>-</span>
              </td>
              <td>
                <a v-if="c.comboFileUrl" :href="String(c.comboFileUrl)" target="_blank" rel="noopener">下载</a>
                <span v-else>-</span>
              </td>
              <td>{{ statusLabel(c.status) }}</td>
              <td>{{ c.createdAt || c.created_at || '-' }}</td>
              <td class="cell-actions">
                <template v-if="c.status === 'pending'">
                  <button
                    type="button"
                    class="action-btn edit btn-sm"
                    title="通过"
                    :disabled="busyId === c.id"
                    @click="onApprove(c)"
                  >
                    通过
                  </button>
                  <button
                    type="button"
                    class="action-btn delete btn-sm"
                    title="拒绝"
                    :disabled="busyId === c.id"
                    @click="onReject(c)"
                  >
                    拒绝
                  </button>
                </template>
                <button
                  type="button"
                  class="action-btn delete btn-sm"
                  title="删除"
                  :disabled="busyId === c.id"
                  @click="onDelete(c)"
                >
                  删除
                </button>
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

function statusLabel(s?: string) {
  if (!s) return '-'
  return statusText[s] || s
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

async function onApprove(c: AdminCombo) {
  busyId.value = c.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateComboStatus(c.id, 'approved')
    actionMsg.value = '已通过'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '操作失败'
  } finally {
    busyId.value = null
  }
}

async function onReject(c: AdminCombo) {
  busyId.value = c.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateComboStatus(c.id, 'rejected')
    actionMsg.value = '已拒绝'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '操作失败'
  } finally {
    busyId.value = null
  }
}

async function onDelete(c: AdminCombo) {
  if (!confirm(`确定要删除用户连招「${c.title || c.id}」吗？此操作不可撤销。`)) return
  busyId.value = c.id
  try {
    await deleteAdminCombo(c.id)
    actionMsg.value = '删除成功'
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
