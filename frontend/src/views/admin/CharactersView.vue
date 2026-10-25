<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">角色管理（新建/编辑表单未迁入）</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate"><i class="fas fa-plus"></i> 新增角色</button>
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
    <div v-if="showCreate" class="modal" style="display:block" @click.self="showCreate=false">
    <div class="modal-content">
      <div class="modal-header"><h3>新增角色</h3><button type="button" class="modal-close" @click="showCreate=false"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div class="form-group"><label>中文名 *</label><input v-model.trim="form.nameZh" type="text" /></div>
        <div class="form-group"><label>英文名 *</label><input v-model.trim="form.nameEn" type="text" /></div>
        <div class="form-group"><label>头像 URL</label><input v-model.trim="form.avatarUrl" type="text" /></div>
        <div class="form-group"><label>简介</label><textarea v-model.trim="form.intro" rows="3" style="width:100%"></textarea></div>
        <div class="form-group"><label>难度</label><input v-model.number="form.difficultyLevel" type="number" min="1" max="5" /></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" @click="showCreate=false">取消</button>
        <button type="button" class="btn btn-primary" :disabled="creating" @click="onCreate">保存</button>
      </div>
    </div>
  </div>
</section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createAdminCharacter, deleteAdminCharacter, fetchAdminCharacters } from '@/api/admin/characters'
import { ApiError, type GameCharacter } from '@/api/types'

const items = ref<GameCharacter[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const showCreate = ref(false)
const creating = ref(false)
const form = ref({ nameZh: '', nameEn: '', avatarUrl: '', intro: '', difficultyLevel: 3 })
function openCreate() {
  form.value = { nameZh: '', nameEn: '', avatarUrl: '', intro: '', difficultyLevel: 3 }
  showCreate.value = true
}
async function onCreate() {
  if (!form.value.nameZh || !form.value.nameEn) { actionMsg.value = '请填写中英文名'; actionErr.value = true; return }
  creating.value = true
  try {
    await createAdminCharacter({ ...form.value })
    showCreate.value = false
    actionMsg.value = '新增成功'
    actionErr.value = false
    await load()
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '新增失败'
    actionErr.value = true
  } finally { creating.value = false }
}
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