<template>
  <section class="page active">
    <div class="action-bar">
      <div></div>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate">
          <i class="fas fa-plus"></i> 添加角色
        </button>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>

    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">角色列表</h3>
        <div class="card-actions">
          <span class="article-count">共 <span>{{ items.length }}</span> 个角色</span>
        </div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无角色</p>
        <table v-else-if="items.length" class="data-table">
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
            <tr
              v-for="c in items"
              :key="c.id"
              :class="{ 'is-selected': selectedId === c.id }"
              style="cursor: pointer"
              @click="selectCharacter(c)"
            >
              <td>{{ c.id }}</td>
              <td>
                <div class="char-cell">
                  <div class="char-avatar">
                    <img v-if="c.avatarUrl" :src="String(c.avatarUrl)" alt="头像" />
                    <div v-else class="char-avatar-empty">无头像</div>
                  </div>
                  <div style="max-width: 220px">
                    <div style="font-weight: 500" :title="c.nameZh || ''">{{ c.nameZh || '未命名角色' }}</div>
                    <div style="font-size: 12px; color: var(--text-muted)" :title="c.nameEn || ''">
                      {{ c.nameEn || '' }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ c.difficultyLevel != null ? `难度 ${c.difficultyLevel}/5` : '未设置' }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 260px" :title="String(c.intro || '')">
                  {{ c.intro || '暂无简介' }}
                </div>
              </td>
              <td class="cell-actions" @click.stop>
                <button type="button" class="action-btn edit btn-sm" title="编辑角色" @click="openEdit(c)">
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  type="button"
                  class="action-btn delete btn-sm"
                  title="删除角色"
                  :disabled="busyId === c.id"
                  @click="onDelete(c)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="content-card" style="margin-top: 1rem">
      <div class="card-header">
        <h3 class="card-title">
          官方连招
          <span v-if="selected" style="font-weight: 400; opacity: 0.75">
            — {{ selected.nameZh || selected.nameEn }}
          </span>
        </h3>
        <div class="card-actions">
          <button type="button" class="btn btn-primary btn-sm" :disabled="!selectedId" @click="openComboCreate">
            <i class="fas fa-plus"></i> 添加官方连招
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="!selectedId || comboLoading"
            @click="loadCombos"
          >
            刷新
          </button>
        </div>
      </div>
      <div class="table-container">
        <p v-if="!selectedId" class="vue-state">请先在上方选择一个角色</p>
        <p v-else-if="comboLoading" class="vue-state">加载中…</p>
        <p v-else-if="comboError" class="vue-state vue-state-error">{{ comboError }}</p>
        <p v-else-if="!combos.length" class="vue-state">该角色暂无官方连招</p>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>说明</th>
              <th>视频</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="oc in combos" :key="oc.id">
              <td>{{ oc.id }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 220px" :title="oc.title || ''">{{ oc.title || '' }}</div>
              </td>
              <td>
                <div class="cell-ellipsis" style="max-width: 260px" :title="String(oc.description || '')">
                  {{ oc.description || '暂无说明' }}
                </div>
              </td>
              <td>
                <div class="cell-ellipsis" style="max-width: 260px" :title="String(oc.videoUrl || '')">
                  <a v-if="oc.videoUrl" :href="String(oc.videoUrl)" target="_blank" rel="noopener">{{ oc.videoUrl }}</a>
                  <span v-else>-</span>
                </div>
              </td>
              <td>{{ oc.orderIndex != null ? oc.orderIndex : '' }}</td>
              <td class="cell-actions">
                <button type="button" class="action-btn edit btn-sm" title="编辑官方连招" @click="openComboEdit(oc)">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="action-btn delete btn-sm" title="删除官方连招" @click="onDeleteCombo(oc)">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <!-- Character form -->
    <div v-if="showCharForm" class="modal" style="display: block" @click.self="showCharForm = false">
      <div class="modal-content large">
        <div class="modal-header">
          <h3>{{ charForm.id ? '编辑角色' : '添加角色' }}</h3>
          <button type="button" class="modal-close" @click="showCharForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>角色中文名 *</label>
            <input v-model.trim="charForm.nameZh" type="text" placeholder="例如：丝绒" />
          </div>
          <div class="form-group">
            <label>角色英文名 *</label>
            <input v-model.trim="charForm.nameEn" type="text" placeholder="例如：Velvet" />
          </div>
          <div class="form-group">
            <label>难度等级（1-5）</label>
            <input
              v-model.number="charForm.difficultyLevel"
              type="number"
              min="1"
              max="5"
              placeholder="1-5，数字越大难度越高"
            />
          </div>
          <div class="form-group">
            <label>角色简介</label>
            <textarea v-model.trim="charForm.intro" rows="3" placeholder="用于列表展示的简短介绍"></textarea>
          </div>
          <div class="form-group">
            <label>背景故事</label>
            <textarea v-model.trim="charForm.background" rows="5" placeholder="详细的角色背景故事"></textarea>
          </div>
          <div class="form-group">
            <label>官方教学视频链接</label>
            <input v-model.trim="charForm.officialVideoUrl" type="url" placeholder="例如：https://.../tutorial.mp4" />
          </div>
          <div class="form-group">
            <label>角色头像</label>
            <div class="image-upload-container">
              <input
                ref="avatarFileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onAvatarFile"
              />
              <div
                v-show="!charForm.avatarUrl"
                class="image-upload-area"
                :class="{ uploading: avatarUploading, dragover: avatarDragover }"
                @click="avatarFileInput?.click()"
                @dragover.prevent="avatarDragover = true"
                @dragleave.prevent="avatarDragover = false"
                @drop.prevent="onAvatarDrop"
              >
                <i class="fas fa-cloud-upload-alt"></i>
                <p>{{ avatarUploading ? '上传中…' : '点击选择角色头像' }}</p>
                <small>支持 JPG、PNG、GIF 格式，最大 5MB</small>
              </div>
              <div v-show="charForm.avatarUrl" class="image-preview">
                <img :src="charForm.avatarUrl" alt="头像预览" />
                <button type="button" class="remove-image-btn" @click="charForm.avatarUrl = ''">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>官方出招表图</label>
            <div class="image-upload-container">
              <input
                ref="moveListFileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onMoveListFile"
              />
              <div
                v-show="!charForm.moveListImageUrl"
                class="image-upload-area"
                :class="{ uploading: moveListUploading, dragover: moveListDragover }"
                @click="moveListFileInput?.click()"
                @dragover.prevent="moveListDragover = true"
                @dragleave.prevent="moveListDragover = false"
                @drop.prevent="onMoveListDrop"
              >
                <i class="fas fa-list-alt"></i>
                <p>{{ moveListUploading ? '上传中…' : '点击上传出招表图' }}</p>
                <small>支持 JPG、PNG 等图片，最大 10MB</small>
              </div>
              <div v-show="charForm.moveListImageUrl" class="image-preview">
                <img :src="charForm.moveListImageUrl" alt="出招表图预览" />
                <button type="button" class="remove-image-btn" @click="charForm.moveListImageUrl = ''">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showCharForm = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="savingChar" @click="onSaveChar">
            {{ savingChar ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Official combo form -->
    <div v-if="showComboForm" class="modal" style="display: block" @click.self="showComboForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ comboForm.id ? '编辑官方连招' : '添加官方连招' }}</h3>
          <button type="button" class="modal-close" @click="showComboForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>连招标题 *</label>
            <input v-model.trim="comboForm.title" type="text" />
          </div>
          <div class="form-group">
            <label>说明</label>
            <textarea v-model.trim="comboForm.description" rows="3" style="width: 100%"></textarea>
          </div>
          <div class="form-group">
            <label>视频链接 *</label>
            <input v-model.trim="comboForm.videoUrl" type="url" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>排序</label>
            <input v-model.number="comboForm.orderIndex" type="number" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showComboForm = false">取消</button>
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
  uploadAdminCharacterAvatar,
  uploadAdminCharacterMoveList,
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
  difficultyLevel: 3 as number | null,
  officialVideoUrl: '',
  moveListImageUrl: '',
})

const avatarFileInput = ref<HTMLInputElement | null>(null)
const moveListFileInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarDragover = ref(false)
const moveListUploading = ref(false)
const moveListDragover = ref(false)

const showComboForm = ref(false)
const savingCombo = ref(false)
const comboForm = ref({ id: 0, title: '', description: '', videoUrl: '', orderIndex: 0 as number | null })

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
    difficultyLevel: null,
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
    difficultyLevel: c.difficultyLevel != null ? Number(c.difficultyLevel) : null,
    officialVideoUrl: String(c.officialVideoUrl || ''),
    moveListImageUrl: String(c.moveListImageUrl || ''),
  }
  showCharForm.value = true
}

async function uploadAvatar(file: File) {
  avatarUploading.value = true
  try {
    charForm.value.avatarUrl = await uploadAdminCharacterAvatar(file)
    actionMsg.value = '头像上传成功'
    actionErr.value = false
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '头像上传失败'
    actionErr.value = true
  } finally {
    avatarUploading.value = false
    avatarDragover.value = false
  }
}

function onAvatarFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (f) void uploadAvatar(f)
}

function onAvatarDrop(e: DragEvent) {
  avatarDragover.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) void uploadAvatar(f)
}

async function uploadMoveList(file: File) {
  moveListUploading.value = true
  try {
    charForm.value.moveListImageUrl = await uploadAdminCharacterMoveList(file)
    actionMsg.value = '出招表图上传成功'
    actionErr.value = false
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '出招表图上传失败'
    actionErr.value = true
  } finally {
    moveListUploading.value = false
    moveListDragover.value = false
  }
}

function onMoveListFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (f) void uploadMoveList(f)
}

function onMoveListDrop(e: DragEvent) {
  moveListDragover.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) void uploadMoveList(f)
}

async function onSaveChar() {
  if (!charForm.value.nameZh || !charForm.value.nameEn) {
    actionMsg.value = '请填写中英文名'
    actionErr.value = true
    return
  }
  savingChar.value = true
  try {
    const payload = {
      nameZh: charForm.value.nameZh,
      nameEn: charForm.value.nameEn,
      avatarUrl: charForm.value.avatarUrl || null,
      intro: charForm.value.intro || null,
      background: charForm.value.background || null,
      difficultyLevel: charForm.value.difficultyLevel != null ? Number(charForm.value.difficultyLevel) : null,
      officialVideoUrl: charForm.value.officialVideoUrl || null,
      moveListImageUrl: charForm.value.moveListImageUrl || null,
    }
    if (charForm.value.id) await updateAdminCharacter(charForm.value.id, payload)
    else await createAdminCharacter(payload)
    showCharForm.value = false
    actionMsg.value = charForm.value.id ? '更新角色成功' : '添加角色成功'
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
  const name = c.nameZh || c.nameEn || String(c.id)
  if (!confirm(`确定要删除角色「${name}」吗？此操作不可撤销，并将同时删除该角色的出招表与连招。`)) return
  busyId.value = c.id
  try {
    await deleteAdminCharacter(c.id)
    actionMsg.value = '删除角色成功'
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
    comboError.value = e instanceof ApiError ? e.message : '加载官方连招失败'
    combos.value = []
  } finally {
    comboLoading.value = false
  }
}

function openComboCreate() {
  if (!selectedId.value) {
    actionMsg.value = '请先选择一个角色再添加官方连招'
    actionErr.value = true
    return
  }
  comboForm.value = { id: 0, title: '', description: '', videoUrl: '', orderIndex: null }
  showComboForm.value = true
}

function openComboEdit(oc: OfficialCombo) {
  comboForm.value = {
    id: oc.id,
    title: oc.title || '',
    description: String(oc.description || ''),
    videoUrl: String(oc.videoUrl || ''),
    orderIndex: oc.orderIndex != null ? Number(oc.orderIndex) : null,
  }
  showComboForm.value = true
}

async function onSaveCombo() {
  if (!selectedId.value) return
  if (!comboForm.value.title) {
    actionMsg.value = '请输入连招标题'
    actionErr.value = true
    return
  }
  if (!comboForm.value.videoUrl) {
    actionMsg.value = '请输入视频链接'
    actionErr.value = true
    return
  }
  savingCombo.value = true
  try {
    const payload = {
      title: comboForm.value.title,
      description: comboForm.value.description || null,
      videoUrl: comboForm.value.videoUrl,
      orderIndex: comboForm.value.orderIndex != null ? Number(comboForm.value.orderIndex) : null,
    }
    if (comboForm.value.id) await updateOfficialCombo(comboForm.value.id, payload)
    else await createOfficialCombo(selectedId.value, payload)
    showComboForm.value = false
    actionMsg.value = comboForm.value.id ? '更新官方连招成功' : '添加官方连招成功'
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
  if (!confirm(`确定要删除官方连招「${oc.title || oc.id}」吗？此操作不可撤销。`)) return
  try {
    await deleteOfficialCombo(oc.id)
    actionMsg.value = '删除官方连招成功'
    actionErr.value = false
    await loadCombos()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

onMounted(load)
</script>

<style scoped>
.char-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.char-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-tertiary);
}
.char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.char-avatar-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
}
tr.is-selected {
  background: var(--bg-elevated);
}
</style>
