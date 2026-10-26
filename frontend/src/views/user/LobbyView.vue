<template>
  <section id="lobby" class="page active">
    <div class="rooms-page">
      <div class="rooms-layout" :class="{ 'lobby-mobile-view-room': !!selectedId }">
        <div class="rooms-list-col">
          <header class="rooms-rail-head">
            <button type="button" class="rooms-icon-btn" :class="{ spinning: loading }" title="刷新" :aria-label="'刷新'" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button type="button" class="rooms-icon-btn rooms-icon-btn--create" title="创建房间" :aria-label="'创建房间'" @click="openCreate">
              <i class="fas fa-plus"></i>
            </button>
          </header>
          <div class="room-list" aria-label="rooms">
            <p v-if="!loading && !rooms.length" class="room-empty">暂无房间</p>
            <button
              v-for="room in rooms"
              :key="room.id"
              type="button"
              class="room-tile"
              :class="[selectedId === room.id ? 'is-active' : '', 'room-tile--' + roomStatus(room).toLowerCase()]"
              :title="tileTitle(room)"
              @click="selectRoom(room.id)"
            >
              <span class="room-tile-face">
                <i v-if="room.hasPassword" class="fas fa-lock room-tile-lock" aria-hidden="true"></i>
                <span v-if="room.isHost || room.joinedByMe" class="room-tile-mark" :class="room.isHost ? 'room-tile-mark--mine' : 'room-tile-mark--joined'">我</span>
                <span class="room-tile-abbr">{{abbrOf(room)}}</span>
                <span class="room-tile-count">
                  {{room.memberCount ?? 0}}<template v-if="room.maxPlayers != null">/{{room.maxPlayers}}</template>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div
          class="room-detail"
          :class="[detail ? 'has-room' : 'is-idle', entered ? 'is-entered' : '']"
          aria-label="detail"
        >
          <div v-if="!detail" class="room-idle-panel" aria-hidden="true"></div>
          <div v-else class="room-detail-panel">
            <div class="room-detail-toolbar">
              <button type="button" class="btn btn-secondary room-back-btn" @click="backToList"><i class="fas fa-arrow-left" aria-hidden="true"></i> 返回</button>
              <div class="room-detail-toolbar-title">{{detail.room?.title || ('#' + detail.room?.id)}}</div>
              <div class="room-detail-toolbar-actions room-detail-actions room-detail-actions--mobile">
                <button v-if="!closed && !joined" type="button" class="btn btn-primary btn-sm" :disabled="acting" @click="onJoin"><i class="fas fa-sign-in-alt"></i> 加入房间</button>
                <button v-if="!closed && joined && !entered" type="button" class="btn btn-primary btn-sm" @click="onEnter"><i class="fas fa-door-open"></i> 进入房间</button>
                <button v-if="!closed && joined && !isHost" type="button" class="btn btn-secondary btn-sm" :disabled="acting" @click="onLeave"><i class="fas fa-sign-out-alt"></i> 离开房间</button>
                <button v-if="!closed && isHost" type="button" class="btn btn-secondary btn-sm" :disabled="acting" @click="onClose"><i class="fas fa-times"></i> 关闭房间</button>
              </div>
            </div>

            <div class="room-layout" :class="entered ? 'is-entered' : 'is-preview'">
              <aside class="room-info-panel">
                <div class="room-info-block">
                  <h3 class="room-info-title">{{detail.room?.title || '未命名房间'}}</h3>
                  <div class="room-info-meta">
                    <span class="room-status" :class="roomStatus(detail.room!).toLowerCase()">{{roomStatusLabel(roomStatus(detail.room!))}}</span>
                    <span class="room-info-count">{{members.length}}/{{detail.room?.maxPlayers || 4}}</span>
                  </div>
                  <div class="room-info-row"><span class="room-info-label">房主</span><span class="room-info-value"><button type="button" class="player-name-link" :class="adminNameClass(detail.room)" @click="goPlayerProfile(router, detail.room?.hostUserId ?? detail.room?.host_user_id ?? detail.room?.userId, detail.room)">{{detail.room?.hostNickname || '-'}}</button></span></div>
                  <div class="room-info-row"><span class="room-info-label">人数</span><span class="room-info-value">{{members.length}}/{{detail.room?.maxPlayers || 4}}</span></div>
                  <div v-if="detail.room?.passwordPlain" class="room-info-row"><span class="room-info-label">密码</span><span class="room-info-value room-info-pwd">{{detail.room.passwordPlain}}</span></div>
                  <div v-else-if="!entered && detail.room?.hasPassword" class="room-info-row"><span class="room-info-label">权限</span><span class="room-info-value">需要密码加入</span></div>
                  <p class="room-info-tip">{{roomTip}}</p>
                  <div class="room-info-actions room-detail-actions--desktop">
                    <button v-if="!closed && !joined" type="button" class="btn btn-primary btn-sm" :disabled="acting" @click="onJoin"><i class="fas fa-sign-in-alt"></i> 加入房间</button>
                    <button v-if="!closed && joined && !entered" type="button" class="btn btn-primary btn-sm" @click="onEnter"><i class="fas fa-door-open"></i> 进入房间</button>
                    <button v-if="!closed && joined && !isHost" type="button" class="btn btn-secondary btn-sm" :disabled="acting" @click="onLeave"><i class="fas fa-sign-out-alt"></i> 离开房间</button>
                    <button v-if="!closed && isHost" type="button" class="btn btn-secondary btn-sm" :disabled="acting" @click="onClose"><i class="fas fa-times"></i> 关闭房间</button>
                  </div>
                </div>
                <div class="room-info-members">
                  <h4 class="room-panel-title room-members-title-desktop">成员</h4>
                  <div class="room-member-list">
                    <div v-for="(m, i) in members" :key="m.userId || i" class="room-member-chip">
                      <img v-if="m.avatarUrl" :src="String(m.avatarUrl)" alt="" />
                      <button type="button" class="room-member-name player-name-link" :class="adminNameClass(m)" @click="goPlayerProfile(router, m.userId, m)">{{m.nickname || m.username || ('用户' + m.userId)}}</button>
                      <span v-if="m.isHost" class="room-member-role">房主</span>
                    </div>
                    <p v-if="!members.length" class="room-empty" style="padding:8px">暂无房间</p>
                  </div>
                </div>
              </aside>

              <section class="room-chat-panel">
                <h4 class="room-panel-title">聊天</h4>
                <template v-if="entered">
                  <div class="room-chat-messages" ref="chatBox">
                    <div v-if="!messages.length" class="room-empty" style="padding:16px">暂无消息</div>
                    <div
                      v-for="msg in messages"
                      :key="msg.id || JSON.stringify(msg)"
                      class="room-chat-item"
                      :class="isMine(msg) ? 'room-chat-item--mine' : 'room-chat-item--other'"
                    >
                      <img class="room-chat-avatar" :src="msg.avatarUrl || DEFAULT_AVATAR" alt="" @error="onAvatarError" />
                      <div class="room-chat-bubble">
                        <div class="room-chat-meta">
                          <button type="button" class="room-chat-name player-name-link" :class="adminNameClass(msg)" @click="goPlayerProfile(router, msg.userId, msg)">{{msg.nickname || ('用户' + msg.userId)}}</button>
                        </div>
                        <img
                          v-if="msgTypeOf(msg) === 'image'"
                          class="room-chat-image"
                          :src="String(msg.content || '')"
                          alt="图片"
                          @click="openImage(String(msg.content || ''))"
                        />
                        <div v-else class="room-chat-text">{{msg.content}}</div>
                      </div>
                    </div>
                  </div>
                  <form class="room-chat-form" @submit.prevent="onSend">
                    <button type="button" class="room-chat-img-btn" title="发送图片" :aria-label="'发送图片'" :disabled="closed || imageUploading" @click="pickImage"><i class="fas fa-image"></i></button>
                    <input ref="imageInput" type="file" accept="image/*" style="display:none" @change="onImagePicked" />
                    <input v-model.trim="chatInput" type="text" maxlength="500" :placeholder="closed ? '房间已关闭' : '输入消息…'" :disabled="closed || sending" />
                    <button type="submit" class="btn btn-primary" :disabled="closed || !chatInput || sending">发送</button>
                  </form>
                </template>
                <div v-else class="room-empty" style="padding:24px;text-align:center">
                  <template v-if="joined">已加入，点击「进入房间」可聊天</template>
                  <template v-else>加入并进入房间后可聊天</template>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="toast" class="room-app-toast" role="status" aria-live="polite">{{ toast }}</div>

    <div v-if="showCreate" class="modal" style="display:block" @click.self="showCreate = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建房间</h3>
          <button type="button" class="modal-close" @click="showCreate = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>房间名 *</label><input v-model.trim="createForm.title" type="text" /></div>
          <div class="form-group">
            <label>人数上限</label>
            <select v-model.number="createForm.maxPlayers">
              <option :value="2">2</option>
              <option :value="4">4</option>
              <option :value="6">6</option>
              <option :value="8">8</option>
            </select>
          </div>
          <div class="form-group"><label>密码（可选）</label><input v-model="createForm.password" type="text" /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showCreate = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="creating" @click="onCreate">创建</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  closeRoom,
  createRoom,
  fetchRoomDetail,
  fetchRoomMessages,
  unwrapRoomMessages,
  fetchRooms,
  joinRoom,
  leaveRoom,
  postRoomMessage,
  uploadRoomChatImage,
  type RoomDetailPayload,
  type RoomMessage,
} from '@/api/rooms'
import { ApiError, type Room } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'
import { adminNameClass } from '@/utils/adminName'
import { goPlayerProfile } from '@/utils/playerProfile'

const router = useRouter()


const DEFAULT_AVATAR = '/images/CSel3_LargePortTianhuo.png'
const ROOM_TIP = "本房间仅用于互相联系、约定上线对战；对局请自行在 Steam 启动《Them's Fightin' Herds》。"
const auth = useUserAuthStore()
const rooms = ref<Room[]>([])
const loading = ref(false)

const ENTERED_KEY = 'tfhers.lobby.enteredRoomId'
const SELECTED_KEY = 'tfhers.lobby.selectedRoomId'
function readStoredRoomId(key: string): number | null {
  try {
    const v = sessionStorage.getItem(key)
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}
function writeStoredRoomId(key: string, id: number | null) {
  try {
    if (id == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, String(id))
  } catch {
    /* ignore quota / private mode */
  }
}
const selectedId = ref<number | null>(readStoredRoomId(SELECTED_KEY))
const detail = ref<RoomDetailPayload | null>(null)
const enteredRoomId = ref<number | null>(readStoredRoomId(ENTERED_KEY))
const messages = ref<RoomMessage[]>([])
const chatInput = ref('')
const sending = ref(false)
const acting = ref(false)
const toast = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ title: '', maxPlayers: 4, password: '' })
const imageUploading = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)
const chatBox = ref<HTMLElement | null>(null)

let listTimer: number | null = null
let msgTimer: number | null = null
let lastMsgId = 0

const members = computed(() => (Array.isArray(detail.value?.members) ? detail.value!.members! : []))
const joined = computed(() => !!(detail.value?.room?.joinedByMe || detail.value?.room?.isHost))
const isHost = computed(() => !!detail.value?.room?.isHost)
const closed = computed(() => String(detail.value?.room?.status || '').toLowerCase() === 'closed')
const entered = computed(() => !!selectedId.value && enteredRoomId.value === selectedId.value && joined.value)
const roomTip = computed(() => {
  const tip = (detail.value as RoomDetailPayload & { tip?: string })?.tip
  return tip || ROOM_TIP
})

function roomStatus(room: Room) {
  const st = String(room.status || '').toLowerCase()
  if (st === 'closed') return 'CLOSED'
  const cnt = Number(room.memberCount ?? 0)
  const max = Number(room.maxPlayers ?? 4)
  if (cnt >= max) return 'FULL'
  return 'OPEN'
}
function roomStatusLabel(st: string) {
  if (st === 'CLOSED') return '已关闭'
  if (st === 'FULL') return '已满'
  return '开放'
}
function abbrOf(room: Room) {
  const t = (room.title || '').trim()
  return t ? t.slice(0, 2) : '#' + room.id
}
function tileTitle(room: Room) {
  return `${room.title || '#' + room.id} · ${roomStatusLabel(roomStatus(room))}`
}
function flash(msg: string) {
  toast.value = msg
  window.setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 2500)
}


function msgTypeOf(msg: RoomMessage) {
  return String(msg.msgType || msg.type || 'text').toLowerCase()
}
function isMine(msg: RoomMessage) {
  const u = auth.user as { id?: number; userId?: number } | null
  let me = u?.id ?? u?.userId
  if (me == null) {
    try {
      const raw = localStorage.getItem('user')
      const parsed = raw ? (JSON.parse(raw) as { id?: number; userId?: number }) : null
      me = parsed?.id ?? parsed?.userId
    } catch {
      me = undefined
    }
  }
  return me != null && msg.userId != null && String(me) === String(msg.userId)
}
function onAvatarError(e: Event) {
  const el = e.target as HTMLImageElement
  if (!el || el.dataset.imgFailed) return
  el.dataset.imgFailed = '1'
  el.src = DEFAULT_AVATAR
}
function openImage(url: string) {
  if (url) window.open(url, '_blank')
}
function pickImage() {
  imageInput.value?.click()
}
async function onImagePicked(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files && input.files[0]
  input.value = ''
  if (!file || !selectedId.value) return
  if (!file.type || file.type.indexOf('image/') !== 0) {
    flash('\u8bf7\u9009\u62e9\u56fe\u7247\u6587\u4ef6')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    flash('\u56fe\u7247\u4e0d\u80fd\u8d85\u8fc7 5MB')
    return
  }
  imageUploading.value = true
  try {
    const url = await uploadRoomChatImage(file)
    const msg = await postRoomMessage(selectedId.value, url, 'image')
    if (msg) {
      messages.value = [...messages.value, msg]
      const mid = Number(msg.id || 0)
      if (mid > lastMsgId) lastMsgId = mid
      await scrollChat()
    } else {
      await loadMessages(selectedId.value, false)
    }
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '\u53d1\u9001\u5931\u8d25')
  } finally {
    imageUploading.value = false
  }
}
async function scrollChat() {
  await nextTick()
  const box = chatBox.value
  if (box) box.scrollTop = box.scrollHeight
}
function backToList() {
  selectedId.value = null
  detail.value = null
}

async function load() {
  loading.value = true
  try {
    const data = await fetchRooms()
    rooms.value = Array.isArray(data) ? data : []
  } catch (e) {
    rooms.value = []
    flash(e instanceof ApiError ? e.message : '加载房间失败')
  } finally {
    loading.value = false
  }
}

async function selectRoom(id: number) {
  selectedId.value = id
  if (enteredRoomId.value && enteredRoomId.value !== id) {
    stopMsgPoll()
  }
  await refreshDetail(id)
}

async function refreshDetail(id: number) {
  try {
    detail.value = await fetchRoomDetail(id)
    const stillMember = !!(detail.value?.room?.joinedByMe || detail.value?.room?.isHost)
    if (stillMember && (enteredRoomId.value === id || readStoredRoomId(ENTERED_KEY) === id)) {
      enteredRoomId.value = id
      await loadMessages(id, false)
      startMsgPoll(id)
      await scrollChat()
    } else if (enteredRoomId.value === id) {
      enteredRoomId.value = null
      stopMsgPoll()
      messages.value = []
    }
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '加载详情失败')
  }
}

function openCreate() {
  if (!auth.isLoggedIn) {
    flash('请先登录')
    return
  }
  createForm.value = { title: '', maxPlayers: 4, password: '' }
  showCreate.value = true
}

async function onCreate() {
  if (!createForm.value.title) {
    flash('请填写房间名')
    return
  }
  creating.value = true
  try {
    const room = await createRoom({
      title: createForm.value.title,
      maxPlayers: createForm.value.maxPlayers,
      password: createForm.value.password || '',
    })
    showCreate.value = false
    flash('房间已创建')
    await load()
    if (room?.id) {
      enteredRoomId.value = room.id
      await selectRoom(room.id)
    }
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

async function onJoin() {
  if (!selectedId.value) return
  let password = ''
  if (detail.value?.room?.hasPassword) {
    password = window.prompt('请输入房间密码') || ''
    if (!password) {
      flash('需要密码才能加入')
      return
    }
  }
  acting.value = true
  try {
    await joinRoom(selectedId.value, password)
    flash('已加入房间')
    enteredRoomId.value = selectedId.value
    await load()
    await refreshDetail(selectedId.value)
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '加入失败')
  } finally {
    acting.value = false
  }
}

function onEnter() {
  if (!selectedId.value) return
  enteredRoomId.value = selectedId.value
  refreshDetail(selectedId.value)
}

async function onLeave() {
  if (!selectedId.value) return
  if (!confirm('确定离开该房间？')) return
  acting.value = true
  try {
    await leaveRoom(selectedId.value)
    flash('已离开')
    enteredRoomId.value = null
    stopMsgPoll()
    messages.value = []
    await load()
    detail.value = null
    selectedId.value = null
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '离开失败')
  } finally {
    acting.value = false
  }
}

async function onClose() {
  if (!selectedId.value) return
  if (!confirm('关闭后房间将从大厅消失，确定关闭？')) return
  acting.value = true
  try {
    await closeRoom(selectedId.value)
    flash('房间已关闭')
    enteredRoomId.value = null
    stopMsgPoll()
    messages.value = []
    selectedId.value = null
    detail.value = null
    await load()
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '关闭失败')
  } finally {
    acting.value = false
  }
}

async function loadMessages(id: number, incremental: boolean) {
  try {
    const data = await fetchRoomMessages(id, incremental ? lastMsgId : 0)
    const { messages: list, roomStatus } = unwrapRoomMessages(data)
    if (!incremental) {
      lastMsgId = 0
      messages.value = list
    } else if (list.length) {
      const known = new Set(messages.value.map((m) => Number(m.id || 0)))
      const fresh = list.filter((m) => {
        const mid = Number(m.id || 0)
        return !mid || !known.has(mid)
      })
      if (fresh.length) messages.value = [...messages.value, ...fresh]
    }
    for (const m of list) {
      const mid = Number(m.id || 0)
      if (mid > lastMsgId) lastMsgId = mid
    }
    if (roomStatus && String(roomStatus).toUpperCase() === 'CLOSED') {
      stopMsgPoll()
      await load()
    }
  } catch (e) {
    /* Poll errors stay quiet; initial load should surface membership/API issues. */
    if (!incremental) {
      const msg = e instanceof ApiError ? e.message : '加载聊天记录失败'
      flash(msg)
    }
  }
}

async function onSend() {
  if (!selectedId.value || !chatInput.value) return
  sending.value = true
  try {
    const msg = await postRoomMessage(selectedId.value, chatInput.value, 'text')
    chatInput.value = ''
    if (msg) {
      messages.value = [...messages.value, msg]
      const mid = Number(msg.id || 0)
      if (mid > lastMsgId) lastMsgId = mid
      await scrollChat()
    } else {
      await loadMessages(selectedId.value, false)
    }
  } catch (e) {
    flash(e instanceof ApiError ? e.message : '发送失败')
  } finally {
    sending.value = false
  }
}

function startListPoll() {
  stopListPoll()
  listTimer = window.setInterval(() => {
    load()
  }, 8000)
}
function stopListPoll() {
  if (listTimer != null) {
    clearInterval(listTimer)
    listTimer = null
  }
}
function startMsgPoll(id: number) {
  stopMsgPoll()
  msgTimer = window.setInterval(() => {
    if (enteredRoomId.value === id) loadMessages(id, true)
  }, 2500)
}
function stopMsgPoll() {
  if (msgTimer != null) {
    clearInterval(msgTimer)
    msgTimer = null
  }
}


watch(enteredRoomId, (id) => writeStoredRoomId(ENTERED_KEY, id))
watch(selectedId, (id) => writeStoredRoomId(SELECTED_KEY, id))
watch(
  () => auth.isLoggedIn,
  (ok) => {
    if (!ok) {
      writeStoredRoomId(ENTERED_KEY, null)
      writeStoredRoomId(SELECTED_KEY, null)
      enteredRoomId.value = null
      detail.value = null
      selectedId.value = null
      messages.value = []
      stopMsgPoll()
    }
  },
)

onMounted(async () => {
  document.body.classList.add('lobby-page')
  await load()
  startListPoll()
  const restoreId = selectedId.value || enteredRoomId.value
  if (restoreId) {
    await selectRoom(restoreId)
    // Still a member after leaving the page → stay "entered", no second click
    if (detail.value?.room?.joinedByMe || detail.value?.room?.isHost) {
      if (enteredRoomId.value !== restoreId) enteredRoomId.value = restoreId
      await loadMessages(restoreId, false)
      startMsgPoll(restoreId)
      await scrollChat()
    }
  }
})
onUnmounted(() => {
  document.body.classList.remove('lobby-page')
  stopListPoll()
  stopMsgPoll()
})
</script>
