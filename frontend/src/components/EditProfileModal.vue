<template>
  <div v-if="open" class="modal" style="display:flex" aria-hidden="false" @click.self="close">
    <div class="modal-content edit-profile-modal-content" role="dialog" aria-modal="true" aria-labelledby="editProfileTitle">
      <div class="modal-header">
        <h3 id="editProfileTitle">编辑个人资料</h3>
        <button class="modal-close" type="button" aria-label="关闭" @click="close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body edit-profile-body">
        <div class="edit-profile-cover-row">
          <label class="edit-profile-label">个人封面</label>
          <div
            class="edit-profile-cover-preview"
            :class="{ 'has-image': !!editCoverUrl }"
            :style="editCoverUrl ? { backgroundImage: 'url(' + editCoverUrl + ')' } : undefined"
          >
            <span v-if="!editCoverUrl" class="edit-profile-cover-hint">未设置</span>
          </div>
          <div class="edit-profile-cover-actions">
            <button type="button" class="btn btn-outline btn-sm" @click="coverFileRef?.click()">
              <i class="fas fa-crop-alt"></i> 上传并裁剪
            </button>
            <button
              v-if="editCoverUrl || coverCleared"
              type="button"
              class="btn btn-outline btn-sm"
              @click="clearCover"
            >
              清除
            </button>
            <input ref="coverFileRef" type="file" accept="image/*" hidden @change="onCoverSelected" />
          </div>
        </div>

        <div class="edit-profile-avatar-row">
          <label class="edit-profile-label">头像</label>
          <div class="edit-profile-avatar-wrap">
            <img :src="editAvatarUrl" alt="头像预览" />
            <button type="button" class="btn btn-outline btn-sm" @click="avatarFileRef?.click()">
              <i class="fas fa-camera"></i> 更换头像
            </button>
            <input ref="avatarFileRef" type="file" accept="image/*" hidden @change="onAvatarSelected" />
          </div>
        </div>

        <div class="form-group">
          <label for="editProfileNickname">昵称</label>
          <input id="editProfileNickname" v-model.trim="nickname" type="text" maxlength="100" autocomplete="nickname" required />
        </div>
        <div class="form-group">
          <label for="editProfileBio">个性签名</label>
          <textarea id="editProfileBio" v-model="signature" maxlength="200" rows="3" placeholder="介绍一下自己吧"></textarea>
          <div class="char-count"><span>{{ signature.length }}</span>/200</div>
        </div>
        <div class="form-group">
          <label for="editProfileGender">性别</label>
          <select id="editProfileGender" v-model="gender">
            <option value="保密">保密</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div class="form-group">
          <label for="editProfileBirthday">生日</label>
          <input id="editProfileBirthday" v-model="birthday" type="date" />
          <p class="form-hint">仅展示月日，年龄会自动计算</p>
        </div>
      </div>
      <div class="edit-profile-footer">
        <button type="button" class="btn btn-outline" @click="close">取消</button>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          <i class="fas fa-save"></i> 保存修改
        </button>
      </div>
    </div>
  </div>

  <!-- Avatar crop -->
  <div v-if="avatarCropOpen" class="modal avatar-crop-modal" style="display:block" aria-hidden="false">
    <div class="modal-content avatar-crop-modal-content">
      <div class="modal-header">
        <h3>裁剪头像</h3>
        <button class="modal-close" type="button" @click="closeAvatarCrop"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body avatar-crop-body">
        <p class="avatar-crop-hint">拖动图片选择区域，滚轮或滑块缩放</p>
        <div class="avatar-crop-stage">
          <div
            ref="avatarViewport"
            class="avatar-crop-viewport"
            :class="{ 'is-dragging': avatar.dragging }"
            @pointerdown="onAvatarPointerDown"
            @pointermove="onAvatarPointerMove"
            @pointerup="onAvatarPointerUp"
            @pointercancel="onAvatarPointerUp"
            @wheel.prevent="onAvatarWheel"
          >
            <img
              ref="avatarCropImg"
              :src="avatar.objectUrl || ''"
              alt=""
              draggable="false"
              :style="avatarImgStyle"
              @load="onAvatarImgLoad"
            />
            <div class="avatar-crop-frame" aria-hidden="true"></div>
          </div>
        </div>
        <div class="avatar-crop-preview-row">
          <span class="avatar-crop-preview-label">预览</span>
          <div class="avatar-crop-preview-circle">
            <canvas ref="avatarPreview" width="72" height="72"></canvas>
          </div>
        </div>
        <div class="avatar-crop-zoom-row">
          <span>缩放</span>
          <input v-model.number="avatarZoomPct" type="range" min="100" max="300" step="1" @input="onAvatarZoomSlider" />
        </div>
        <div class="settings-form-actions avatar-crop-actions">
          <button type="button" class="btn btn-outline" @click="closeAvatarCrop">取消</button>
          <button type="button" class="btn btn-primary" :disabled="avatarUploading" @click="confirmAvatarCrop">确认上传</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Cover crop -->
  <div v-if="coverCropOpen" class="modal cover-crop-modal" style="display:block" aria-hidden="false">
    <div class="modal-content cover-crop-modal-content">
      <div class="modal-header">
        <h3>裁剪封面</h3>
        <button class="modal-close" type="button" @click="closeCoverCrop"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body cover-crop-body">
        <p class="cover-crop-hint">拖动图片选择区域，滚轮或滑块缩放</p>
        <div class="cover-crop-stage">
          <div
            ref="coverViewport"
            class="cover-crop-viewport"
            :class="{ 'is-dragging': cover.dragging }"
            @pointerdown="onCoverPointerDown"
            @pointermove="onCoverPointerMove"
            @pointerup="onCoverPointerUp"
            @pointercancel="onCoverPointerUp"
            @wheel.prevent="onCoverWheel"
          >
            <img
              ref="coverCropImg"
              :src="cover.objectUrl || ''"
              alt=""
              draggable="false"
              :style="coverImgStyle"
              @load="onCoverImgLoad"
            />
            <div class="cover-crop-frame" aria-hidden="true"></div>
          </div>
        </div>
        <div class="cover-crop-preview-row">
          <span class="cover-crop-preview-label">预览</span>
          <div class="cover-crop-preview-rect">
            <canvas ref="coverPreview" width="240" height="80"></canvas>
          </div>
        </div>
        <div class="cover-crop-zoom-row">
          <span>缩放</span>
          <input v-model.number="coverZoomPct" type="range" min="100" max="300" step="1" @input="onCoverZoomSlider" />
        </div>
        <div class="settings-form-actions cover-crop-actions">
          <button type="button" class="btn btn-outline" @click="closeCoverCrop">取消</button>
          <button type="button" class="btn btn-primary" :disabled="coverUploading" @click="confirmCoverCrop">确认上传</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { updateUserProfile, uploadAvatar, uploadCover, type UserProfile } from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/types'

const props = defineProps<{ open: boolean; profile?: UserProfile | null }>()
const emit = defineEmits<{ close: []; saved: [UserProfile] }>()

const auth = useUserAuthStore()
const nickname = ref('')
const signature = ref('')
const gender = ref('保密')
const birthday = ref('')
const editAvatarUrl = ref('/images/CSel3_LargePortTianhuo.png')
const editCoverUrl = ref('')
const coverCleared = ref(false)
const saving = ref(false)
const avatarFileRef = ref<HTMLInputElement | null>(null)
const coverFileRef = ref<HTMLInputElement | null>(null)

const avatarCropOpen = ref(false)
const coverCropOpen = ref(false)
const avatarUploading = ref(false)
const coverUploading = ref(false)
const avatarCropImg = ref<HTMLImageElement | null>(null)
const coverCropImg = ref<HTMLImageElement | null>(null)
const avatarViewport = ref<HTMLElement | null>(null)
const coverViewport = ref<HTMLElement | null>(null)
const avatarPreview = ref<HTMLCanvasElement | null>(null)
const coverPreview = ref<HTMLCanvasElement | null>(null)
const avatarZoomPct = ref(100)
const coverZoomPct = ref(100)

type CropState = {
  objectUrl: string | null
  natW: number
  natH: number
  baseScale: number
  zoom: number
  offsetX: number
  offsetY: number
  dragging: boolean
  lastX: number
  lastY: number
  viewW: number
  viewH: number
  outW: number
  outH: number
}

const avatar = reactive<CropState>({
  objectUrl: null,
  natW: 0,
  natH: 0,
  baseScale: 1,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  viewW: 280,
  viewH: 280,
  outW: 512,
  outH: 512,
})

const cover = reactive<CropState>({
  objectUrl: null,
  natW: 0,
  natH: 0,
  baseScale: 1,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  viewW: 480,
  viewH: 160,
  outW: 1500,
  outH: 500,
})

const avatarImgStyle = computed(() => {
  const s = avatar.baseScale * avatar.zoom
  return {
    width: avatar.natW * s + 'px',
    height: avatar.natH * s + 'px',
    transform: `translate(${avatar.offsetX}px, ${avatar.offsetY}px)`,
  }
})
const coverImgStyle = computed(() => {
  const s = cover.baseScale * cover.zoom
  return {
    width: cover.natW * s + 'px',
    height: cover.natH * s + 'px',
    transform: `translate(${cover.offsetX}px, ${cover.offsetY}px)`,
  }
})

function hydrate() {
  const u = (props.profile || auth.user || {}) as UserProfile
  nickname.value = String(u.nickname || '')
  signature.value = String(u.signature || '')
  gender.value = String(u.gender || '保密') || '保密'
  const bd = u.birthday ? String(u.birthday).slice(0, 10) : ''
  birthday.value = /^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : ''
  editAvatarUrl.value = String(u.avatarUrl || '/images/CSel3_LargePortTianhuo.png')
  editCoverUrl.value = String(u.coverUrl || '')
  coverCleared.value = false
}

watch(
  () => props.open,
  (v) => {
    if (v) hydrate()
  },
)

function close() {
  emit('close')
}

function clearCover() {
  editCoverUrl.value = ''
  coverCleared.value = true
}

function onAvatarSelected(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files && input.files[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    window.alert('请选择图片文件')
    return
  }
  openAvatarCrop(file)
}

function onCoverSelected(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files && input.files[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    window.alert('请选择图片文件')
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    window.alert('封面不能超过 20MB')
    return
  }
  openCoverCrop(file)
}

function revoke(state: CropState) {
  if (state.objectUrl) {
    try {
      URL.revokeObjectURL(state.objectUrl)
    } catch {
      /* ignore */
    }
    state.objectUrl = null
  }
}

function openAvatarCrop(file: File) {
  revoke(avatar)
  avatar.objectUrl = URL.createObjectURL(file)
  avatar.zoom = 1
  avatarZoomPct.value = 100
  avatarCropOpen.value = true
}

function openCoverCrop(file: File) {
  revoke(cover)
  cover.objectUrl = URL.createObjectURL(file)
  cover.zoom = 1
  coverZoomPct.value = 100
  coverCropOpen.value = true
}

function closeAvatarCrop() {
  avatarCropOpen.value = false
  avatar.dragging = false
  revoke(avatar)
}

function closeCoverCrop() {
  coverCropOpen.value = false
  cover.dragging = false
  revoke(cover)
}

function clampCrop(state: CropState) {
  const s = state.baseScale * state.zoom
  const dw = state.natW * s
  const dh = state.natH * s
  const minX = state.viewW - dw
  const minY = state.viewH - dh
  if (dw <= state.viewW) state.offsetX = (state.viewW - dw) / 2
  else state.offsetX = Math.min(0, Math.max(minX, state.offsetX))
  if (dh <= state.viewH) state.offsetY = (state.viewH - dh) / 2
  else state.offsetY = Math.min(0, Math.max(minY, state.offsetY))
}

function updatePreview(state: CropState, canvas: HTMLCanvasElement | null, img: HTMLImageElement | null) {
  if (!canvas || !img || !state.natW) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const s = state.baseScale * state.zoom
  const sx = -state.offsetX / s
  const sy = -state.offsetY / s
  const sw = state.viewW / s
  const sh = state.viewH / s
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  try {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  } catch {
    /* ignore */
  }
}

function onAvatarImgLoad() {
  const img = avatarCropImg.value
  if (!img) return
  avatar.natW = img.naturalWidth || img.width
  avatar.natH = img.naturalHeight || img.height
  const vp = avatarViewport.value
  if (vp) {
    const rect = vp.getBoundingClientRect()
    if (rect.width > 0) {
      avatar.viewW = Math.round(rect.width)
      avatar.viewH = Math.round(rect.width)
    }
  }
  avatar.baseScale = Math.max(avatar.viewW / avatar.natW, avatar.viewH / avatar.natH)
  avatar.zoom = 1
  const s = avatar.baseScale
  avatar.offsetX = (avatar.viewW - avatar.natW * s) / 2
  avatar.offsetY = (avatar.viewH - avatar.natH * s) / 2
  clampCrop(avatar)
  updatePreview(avatar, avatarPreview.value, img)
}

function onCoverImgLoad() {
  const img = coverCropImg.value
  if (!img) return
  cover.natW = img.naturalWidth || img.width
  cover.natH = img.naturalHeight || img.height
  const vp = coverViewport.value
  if (vp) {
    const rect = vp.getBoundingClientRect()
    if (rect.width > 0) {
      cover.viewW = Math.round(rect.width)
      cover.viewH = Math.round(rect.height || rect.width / 3)
    }
  }
  cover.baseScale = Math.max(cover.viewW / cover.natW, cover.viewH / cover.natH)
  cover.zoom = 1
  const s = cover.baseScale
  cover.offsetX = (cover.viewW - cover.natW * s) / 2
  cover.offsetY = (cover.viewH - cover.natH * s) / 2
  clampCrop(cover)
  updatePreview(cover, coverPreview.value, img)
}

function setZoom(state: CropState, pct: number, preview: HTMLCanvasElement | null, img: HTMLImageElement | null) {
  const next = Math.max(1, Math.min(3, (Number(pct) || 100) / 100))
  const oldS = state.baseScale * state.zoom
  const cx = state.viewW / 2
  const cy = state.viewH / 2
  const imgCX = (cx - state.offsetX) / oldS
  const imgCY = (cy - state.offsetY) / oldS
  state.zoom = next
  const newS = state.baseScale * state.zoom
  state.offsetX = cx - imgCX * newS
  state.offsetY = cy - imgCY * newS
  clampCrop(state)
  updatePreview(state, preview, img)
}

function onAvatarZoomSlider() {
  setZoom(avatar, avatarZoomPct.value, avatarPreview.value, avatarCropImg.value)
}
function onCoverZoomSlider() {
  setZoom(cover, coverZoomPct.value, coverPreview.value, coverCropImg.value)
}

function onAvatarWheel(e: WheelEvent) {
  let pct = avatarZoomPct.value
  pct += e.deltaY < 0 ? 8 : -8
  pct = Math.max(100, Math.min(300, pct))
  avatarZoomPct.value = pct
  onAvatarZoomSlider()
}
function onCoverWheel(e: WheelEvent) {
  let pct = coverZoomPct.value
  pct += e.deltaY < 0 ? 8 : -8
  pct = Math.max(100, Math.min(300, pct))
  coverZoomPct.value = pct
  onCoverZoomSlider()
}

function onAvatarPointerDown(e: PointerEvent) {
  if (!avatar.natW) return
  avatar.dragging = true
  avatar.lastX = e.clientX
  avatar.lastY = e.clientY
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  e.preventDefault()
}
function onAvatarPointerMove(e: PointerEvent) {
  if (!avatar.dragging) return
  avatar.offsetX += e.clientX - avatar.lastX
  avatar.offsetY += e.clientY - avatar.lastY
  avatar.lastX = e.clientX
  avatar.lastY = e.clientY
  clampCrop(avatar)
  updatePreview(avatar, avatarPreview.value, avatarCropImg.value)
}
function onAvatarPointerUp(e: PointerEvent) {
  if (!avatar.dragging) return
  avatar.dragging = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onCoverPointerDown(e: PointerEvent) {
  if (!cover.natW) return
  cover.dragging = true
  cover.lastX = e.clientX
  cover.lastY = e.clientY
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
  e.preventDefault()
}
function onCoverPointerMove(e: PointerEvent) {
  if (!cover.dragging) return
  cover.offsetX += e.clientX - cover.lastX
  cover.offsetY += e.clientY - cover.lastY
  cover.lastX = e.clientX
  cover.lastY = e.clientY
  clampCrop(cover)
  updatePreview(cover, coverPreview.value, coverCropImg.value)
}
function onCoverPointerUp(e: PointerEvent) {
  if (!cover.dragging) return
  cover.dragging = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function getCroppedBlob(state: CropState, img: HTMLImageElement | null, maxBytes: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!img || !state.natW) {
      reject(new Error('no image'))
      return
    }
    const s = state.baseScale * state.zoom
    const sx = -state.offsetX / s
    const sy = -state.offsetY / s
    const sw = state.viewW / s
    const sh = state.viewH / s
    const canvas = document.createElement('canvas')
    canvas.width = state.outW
    canvas.height = state.outH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('canvas unsupported'))
      return
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, state.outW, state.outH)
    const tryJpeg = (quality: number) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('toBlob failed'))
            return
          }
          if (blob.size > maxBytes && quality > 0.55) {
            tryJpeg(quality - 0.1)
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        quality,
      )
    }
    tryJpeg(0.92)
  })
}

async function confirmAvatarCrop() {
  avatarUploading.value = true
  try {
    const blob = await getCroppedBlob(avatar, avatarCropImg.value, 5 * 1024 * 1024)
    if (blob.size > 5 * 1024 * 1024) {
      window.alert('裁剪后仍超过 5MB，请缩小原图后再试')
      return
    }
    const url = await uploadAvatar(blob)
    editAvatarUrl.value = url
    syncLocalUser({ avatarUrl: url })
    closeAvatarCrop()
    window.alert('头像上传成功')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function confirmCoverCrop() {
  coverUploading.value = true
  try {
    const blob = await getCroppedBlob(cover, coverCropImg.value, 8 * 1024 * 1024)
    if (blob.size > 8 * 1024 * 1024) {
      window.alert('裁剪后仍超过 8MB，请缩小原图后再试')
      return
    }
    const url = await uploadCover(blob)
    editCoverUrl.value = url
    coverCleared.value = false
    syncLocalUser({ coverUrl: url })
    closeCoverCrop()
    window.alert('封面已上传')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}

function syncLocalUser(patch: Record<string, unknown>) {
  const raw = localStorage.getItem('user')
  if (!raw) return
  try {
    const u = JSON.parse(raw) as Record<string, unknown>
    Object.assign(u, patch)
    localStorage.setItem('user', JSON.stringify(u))
    auth.hydrate()
  } catch {
    /* ignore */
  }
}

function normalizeBirthday(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v) && v.length >= 3) {
    return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`
  }
  return String(v).slice(0, 10)
}

async function save() {
  const nick = nickname.value.trim()
  if (!nick) {
    window.alert('昵称不能为空')
    return
  }
  const u = auth.user as Record<string, unknown> | null
  const body: Record<string, unknown> = {
    nickname: nick,
    email: u?.email || '',
    phone: u?.phone || '',
    signature: signature.value.trim(),
    gender: gender.value || '保密',
    birthday: birthday.value ? birthday.value : 'clear',
  }
  if (coverCleared.value) body.coverUrl = ''
  else if (editCoverUrl.value) body.coverUrl = editCoverUrl.value

  saving.value = true
  try {
    const d = await updateUserProfile(body as Partial<UserProfile>)
    const next: UserProfile = {
      ...(u || {}),
      ...(d || {}),
      nickname: d?.nickname ?? nick,
      signature: d?.signature ?? signature.value.trim(),
      gender: d?.gender ?? gender.value,
      birthday: 'birthday' in (d || {}) ? normalizeBirthday(d?.birthday) : birthday.value || undefined,
      coverUrl: 'coverUrl' in (d || {}) ? String(d?.coverUrl || '') : coverCleared.value ? '' : editCoverUrl.value,
      avatarUrl: d?.avatarUrl || editAvatarUrl.value,
    }
    syncLocalUser(next as Record<string, unknown>)
    emit('saved', next)
    emit('close')
    window.alert('个人资料已保存')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>
