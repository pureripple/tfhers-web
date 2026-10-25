<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">角色管理与官方连段</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate"><i class="fas fa-plus"></i> 新增角色</button>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>

    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">角色列表</h3>
        <div class="card-actions"><span class="article-count">共 {{ items.length }} 个</span></div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无角色</p>
        <table v-else-if="items.length" class="data-table">
          <thead>
            <tr><th>ID</th><th>中文名</th><th>英文名</th><th>难度</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr
              v-for="c in items"
              :key="c.id"
              :class="{ 'is-selected': selectedId === c.id }"
              style="cursor:pointer"
              @click="selectCharacter(c)"
            >
              <td>{{ c.id }}</td>
              <td>{{ c.nameZh || '-' }}</td>
              <td>{{ c.nameEn || '-' }}</td>
              <td>{{ c.difficultyLevel ?? '-' }}</td>
              <td class="cell-actions" @click.stop>
                <button type="button" class="btn btn-secondary btn-sm" @click="openEdit(c)">编辑</button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === c.id" @click="onDelete(c)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="content-card" style="margin-top:1rem">
      <div class="card-header">
        <h3 class="card-title">
          官方连段
          <span v-if="selected" style="font-weight:400;opacity:.75">— {{ selected.nameZh || selected.nameEn }}</span>
        </h3>
        <div class="card-actions">
          <button type="button" class="btn btn-primary btn-sm" :disabled="!selectedId" @click="openComboCreate">
            <i class="fas fa-plus"></i> 新增官方连段
          </button>
          <button type="button" class="btn btn-secondary btn-sm" :disabled="!selectedId || comboLoading" @click="loadCombos">刷新</button>
        </div>
      </div>
      <div class="table-container">
        <p v-if="!selectedId" class="vue-state">请先在上方选择一个角色</p>
        <p v-else-if="comboLoading" class="vue-state">加载中…</p>
        <p v-else-if="comboError" class="vue-state vue-state-error">{{ comboError }}</p>
        <p v-else-if="!combos.length" class="vue-state">暂无官方连段</p>
        <table v-else class="data-table">
          <thead>
            <tr><th>ID</th><th>标题</th><th>排序</th><th>视频</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="oc in combos" :key="oc.id">
              <td>{{ oc.id }}</td>
              <td class="cell-ellipsis">{{ oc.title || '-' }}</td>
              <td>{{ oc.orderIndex ?? '-' }}</td>
              <td class="cell-ellipsis">
                <a v-if="oc.videoUrl" :href="String(oc.videoUrl)" target="_blank" rel="noopener">打开</a>
                <span v-else>-</span>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openComboEdit(oc)">编辑</button>
                <button type="button" class="btn btn-danger btn-sm" @click="onDeleteCombo(oc)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="showCharForm" class="modal" style="display:block" @click.self="showCharForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ charForm.id ? '编辑角色' : '新增角色' }}</h3>
          <button type="button" class="modal-close" @click="showCharForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>中文名 *</label><input v-model.trim="charForm.nameZh" type="text" /></div>
          <div class="form-group"><label>英文名 *</label><input v-model.trim="charForm.nameEn" type="text" /></div>
          <div class="form-group"><label>头像 URL</label><input v-model.trim="charForm.avatarUrl" type="text" /></div>
          <div class="form-group"><label>简介</label><textarea v-model.trim="charForm.intro" rows="2" style="width:100%"></textarea></div>
          <div class="form-group"><label>背景</label><textarea v-model.trim="charForm.background" rows="2" style="width:100%"></textarea></div>
          <div class="form-group"><label>难度 (1-5)</label><input v-model.number="charForm.difficultyLevel" type="number" min="1" max="5" /></div>
          <div class="form-group"><label>官方视频 URL</label><input v-model.trim="charForm.officialVideoUrl" type="text" /></div>
          <div class="form-group"><label>出招表图片 URL</label><input v-model.trim="charForm.moveListImageUrl" type="text" /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showCharForm = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="savingChar" @click="onSaveChar">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showComboForm" class="modal" style="display:block" @click.self="showComboForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ comboForm.id ? '编辑官方连段' : '新增官方连段' }}</h3>
          <button type="button" class="modal-close" @click="showComboForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>标题 *</label><input v-model.trim="comboForm.title" type="text" /></div>
          <div class="form-group"><label>描述</label><textarea v-model.trim="comboForm.description" rows="3" style="width:100%"></textarea></div>
          <div class="form-group"><label>视频 URL</label><input v-model.trim="comboForm.videoUrl" type="text" /></div>
          <div class="form-group"><label>排序</label><input v-model.number="comboForm.orderIndex" type="number" /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showComboForm = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="savingCombo" @click="onSaveCombo">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createAdminCharacter,
  createOfficialCombo,
  deleteAdminCharacter,
  deleteOfficialCombo,
  fetchAdminCharacters,
  fetchOfficialCombos,
  updateAdminCharacter,
  updateOfficialCombo,
  type OfficialCombo,
} from '@/api/admin/characters'
import { ApiError, type GameCharacter } from '@/api/types'

const items = ref<GameCharacter[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

const selectedId = ref<number | null>(null)
const selected = computed(() => items.value.find((c) => c.id === selectedId.value) || null)

const combos = ref<OfficialCombo[]>([])
const comboLoading = ref(false)
const comboError = ref('')

const showCharForm = ref(false)
const savingChar = ref(false)
const charForm = ref({
  id: 0,
  nameZh: '',
  nameEn: '',
  avatarUrl: '',
  intro: '',
  background: '',
  difficultyLevel: 3,
  officialVideoUrl: '',
  moveListImageUrl: '',
})

const showComboForm = ref(false)
const savingCombo = ref(false)
const comboForm = ref({ id: 0, title: '', description: '', videoUrl: '', orderIndex: 0 })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminCharacters()
    items.value = Array.isArray(data) ? data : []
    if (selectedId.value && !items.value.some((c) => c.id === selectedId.value)) {
      selectedId.value = null
      combos.value = []
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载角色失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  charForm.value = {
    id: 0,
    nameZh: '',
    nameEn: '',
    avatarUrl: '',
    intro: '',
    background: '',
    difficultyLevel: 3,
    officialVideoUrl: '',
    moveListImageUrl: '',
  }
  showCharForm.value = true
}

function openEdit(c: GameCharacter) {
  charForm.value = {
    id: c.id,
    nameZh: c.nameZh || '',
    nameEn: c.nameEn || '',
    avatarUrl: String(c.avatarUrl || ''),
    intro: String(c.intro || ''),
    background: String(c.background || ''),
    difficultyLevel: Number(c.difficultyLevel ?? 3),
    officialVideoUrl: String(c.officialVideoUrl || ''),
    moveListImageUrl: String(c.moveListImageUrl || ''),
  }
  showCharForm.value = true
}

async function onSaveChar() {
  if (!charForm.value.nameZh || !charForm.value.nameEn) {
    actionMsg.value = '请填写中英文名'
    actionErr.value = true
    return
  }
  savingChar.value = true
  try {
    const payload = { ...charForm.value }
    const { id, ...rest } = payload
    if (id) await updateAdminCharacter(id, rest)
    else await createAdminCharacter(rest)
    showCharForm.value = false
    actionMsg.value = '保存成功'
    actionErr.value = false
    await load()
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '保存失败'
    actionErr.value = true
  } finally {
    savingChar.value = false
  }
}

async function onDelete(c: GameCharacter) {
  if (!confirm(`确认删除角色「${c.nameZh || c.id}」？`)) return
  busyId.value = c.id
  try {
    await deleteAdminCharacter(c.id)
    actionMsg.value = '已删除'
    actionErr.value = false
    if (selectedId.value === c.id) {
      selectedId.value = null
      combos.value = []
    }
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '删除失败'
  } finally {
    busyId.value = null
  }
}

async function selectCharacter(c: GameCharacter) {
  selectedId.value = c.id
  await loadCombos()
}

async function loadCombos() {
  if (!selectedId.value) return
  comboLoading.value = true
  comboError.value = ''
  try {
    const data = await fetchOfficialCombos(selectedId.value)
    combos.value = Array.isArray(data) ? data : []
  } catch (e) {
    comboError.value = e instanceof ApiError ? e.message : '加载官方连段失败'
    combos.value = []
  } finally {
    comboLoading.value = false
  }
}

function openComboCreate() {
  if (!selectedId.value) {
    actionMsg.value = '请先选择一个角色'
    actionErr.value = true
    return
  }
  comboForm.value = { id: 0, title: '', description: '', videoUrl: '', orderIndex: combos.value.length }
  showComboForm.value = true
}

function openComboEdit(oc: OfficialCombo) {
  comboForm.value = {
    id: oc.id,
    title: oc.title || '',
    description: String(oc.description || ''),
    videoUrl: String(oc.videoUrl || ''),
    orderIndex: Number(oc.orderIndex ?? 0),
  }
  showComboForm.value = true
}

async function onSaveCombo() {
  if (!selectedId.value) return
  if (!comboForm.value.title) {
    actionMsg.value = '请填写标题'
    actionErr.value = true
    return
  }
  savingCombo.value = true
  try {
    const payload = {
      title: comboForm.value.title,
      description: comboForm.value.description,
      videoUrl: comboForm.value.videoUrl,
      orderIndex: comboForm.value.orderIndex,
    }
    if (comboForm.value.id) await updateOfficialCombo(comboForm.value.id, payload)
    else await createOfficialCombo(selectedId.value, payload)
    showComboForm.value = false
    actionMsg.value = '官方连段已保存'
    actionErr.value = false
    await loadCombos()
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '保存失败'
    actionErr.value = true
  } finally {
    savingCombo.value = false
  }
}

async function onDeleteCombo(oc: OfficialCombo) {
  if (!confirm(`确定删除官方连段「${oc.title || oc.id}」吗？`)) return
  try {
    await deleteOfficialCombo(oc.id)
    actionMsg.value = '已删除'
    actionErr.value = false
    await loadCombos()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

onMounted(load)
</script>
