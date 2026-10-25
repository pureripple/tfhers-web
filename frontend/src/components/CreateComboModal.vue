<template>
  <div
    id="createComboModal"
    class="modal"
    :style="{ display: open ? 'block' : 'none' }"
    :aria-hidden="open ? 'false' : 'true'"
    @click.self="emit('close')"
  >
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>投稿连段</h3>
        <button class="modal-close" type="button" @click="emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>角色 *</label>
          <select v-model.number="characterId">
            <option :value="0" disabled>请选择角色</option>
            <option v-for="c in characters" :key="c.id" :value="c.id">
              {{ c.nameZh || c.nameEn || c.id }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>连段名称 *</label>
          <input v-model.trim="title" type="text" placeholder="例如：最大伤害连" />
        </div>
        <div class="form-group">
          <label>伤害</label>
          <input v-model.number="damage" type="number" min="0" placeholder="可选" />
        </div>
        <div class="form-group">
          <label>说明</label>
          <textarea v-model.trim="description" rows="3" style="width:100%" placeholder="可选说明"></textarea>
        </div>
        <div class="form-group">
          <label>连段视频 *</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input ref="videoInput" type="file" accept="video/*" style="display:none" @change="onVideoPick" />
            <button type="button" class="btn btn-outline btn-sm" :disabled="uploadingVideo" @click="videoInput?.click()">
              <i class="fas fa-video"></i> {{ uploadingVideo ? '上传中…' : '上传视频' }}
            </button>
            <input v-model.trim="videoUrl" type="text" placeholder="或粘贴视频 URL" style="flex:1;min-width:180px" />
          </div>
        </div>
        <div class="form-group">
          <label>连段文件（.tfhc，可选）</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input ref="fileInput" type="file" accept=".tfhc,application/octet-stream" style="display:none" @change="onFilePick" />
            <button type="button" class="btn btn-outline btn-sm" :disabled="uploadingFile" @click="fileInput?.click()">
              <i class="fas fa-file"></i> {{ uploadingFile ? '上传中…' : '上传文件' }}
            </button>
            <input v-model.trim="comboFileUrl" type="text" placeholder="或粘贴文件 URL" style="flex:1;min-width:180px" />
          </div>
        </div>
        <p v-if="error" class="vue-state vue-state-error">{{ error }}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" @click="emit('close')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
          <i class="fas fa-paper-plane"></i> 提交审核
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchCharacters } from '@/api/characters'
import { createCombo, uploadComboFile, uploadComboVideo } from '@/api/user'
import { ApiError, type GameCharacter } from '@/api/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const characters = ref<GameCharacter[]>([])
const characterId = ref(0)
const title = ref('')
const damage = ref<number | null>(null)
const description = ref('')
const videoUrl = ref('')
const comboFileUrl = ref('')
const submitting = ref(false)
const uploadingVideo = ref(false)
const uploadingFile = ref(false)
const error = ref('')
const videoInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function loadCharacters() {
  try {
    const data = await fetchCharacters()
    characters.value = Array.isArray(data) ? data : []
  } catch {
    characters.value = []
  }
}

function reset() {
  characterId.value = 0
  title.value = ''
  damage.value = null
  description.value = ''
  videoUrl.value = ''
  comboFileUrl.value = ''
  error.value = ''
}

async function onVideoPick(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingVideo.value = true
  error.value = ''
  try {
    videoUrl.value = await uploadComboVideo(file)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '视频上传失败'
  } finally {
    uploadingVideo.value = false
    input.value = ''
  }
}

async function onFilePick(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingFile.value = true
  error.value = ''
  try {
    comboFileUrl.value = await uploadComboFile(file)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '文件上传失败'
  } finally {
    uploadingFile.value = false
    input.value = ''
  }
}

async function submit() {
  if (!characterId.value) {
    error.value = '请选择角色'
    return
  }
  if (!title.value) {
    error.value = '请输入连段名称'
    return
  }
  if (!videoUrl.value) {
    error.value = '请上传连段视频'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await createCombo({
      characterId: characterId.value,
      title: title.value,
      description: description.value || null,
      damageTotal: damage.value != null ? Number(damage.value) : 0,
      videoUrl: videoUrl.value,
      comboFileUrl: comboFileUrl.value || null,
    })
    window.alert('提交成功，等待管理员审核通过后将在该角色下展示。')
    emit('created')
    emit('close')
    reset()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      error.value = ''
      if (!characters.value.length) loadCharacters()
    }
  },
)

onMounted(loadCharacters)
</script>
