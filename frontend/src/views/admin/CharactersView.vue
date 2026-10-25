<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">角色管理（新建/编辑表单未迁入）</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" disabled title="表单未迁入"><i class="fas fa-plus"></i> 新增角色</button>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">角色列表</h3><div class="card-actions"><span class="article-count">共 {{ items.length }} 个</span></div></div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无角色</p>
        <table v-else-if="items.length" class="data-table">
          <thead><tr><th>ID</th><th>中文名</th><th>英文名</th><th>难度</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="c in items" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ c.nameZh || '-' }}</td>
              <td>{{ c.nameEn || '-' }}</td>
              <td>{{ c.difficultyLevel ?? '-' }}</td>
              <td class="cell-actions">
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
import { deleteAdminCharacter, fetchAdminCharacters } from '@/api/admin/characters'
import { ApiError, type GameCharacter } from '@/api/types'

const items = ref<GameCharacter[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminCharacters()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载角色失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function onDelete(c: GameCharacter) {
  if (!confirm(`确认删除角色「${c.nameZh || c.id}」？`)) return
  busyId.value = c.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await deleteAdminCharacter(c.id)
    actionMsg.value = '已删除'
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