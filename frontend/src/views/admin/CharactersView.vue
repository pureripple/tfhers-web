<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>角色管理</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p class="page-desc">角色列表与删除。新建/编辑表单未迁入（占位）。</p>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无角色</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>角色</th>
            <th>难度</th>
            <th>简介</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id">
            <td>{{ c.id }}</td>
            <td>
              <div class="cell-player">
                <img v-if="c.avatarUrl" class="avatar" :src="c.avatarUrl" alt="" />
                <div>
                  <div>{{ c.nameZh || '未命名' }}</div>
                  <div class="muted">{{ c.nameEn || '' }}</div>
                </div>
              </div>
            </td>
            <td>{{ c.difficultyLevel != null ? `难度 ${c.difficultyLevel}/5` : '-' }}</td>
            <td class="cell-ellipsis" :title="c.intro">{{ c.intro || '-' }}</td>
            <td class="cell-actions">
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