<template>
  <section class="page active">
    <div class="rooms-page">
      <div class="rooms-layout">
        <div class="rooms-list-col">
          <header class="rooms-rail-head" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <button type="button" class="rooms-icon-btn" title="刷新" aria-label="刷新" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button type="button" class="btn btn-primary btn-sm" @click="openCreate">
              <i class="fas fa-plus"></i> 创建房间
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
                <i v-if="room.hasPassword" class="fas fa-lock" style="position:absolute;top:8px;left:8px;font-size:0.7rem;opacity:0.8"></i>
                <span v-if="room.joinedByMe" class="room-tile-mark room-tile-mark--joined">我</span>
                <span class="room-tile-abbr">{{ abbrOf(room) }}</span>
                <span class="room-tile-count">
                  {{ room.memberCount ?? 0 }}<template v-if="room.maxPlayers != null">/{{ room.maxPlayers }}</template>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div class="room-detail" :class="detail ? 'has-room' : 'is-idle'" aria-label="detail">
          <div v-if="!detail" class="room-idle-panel" aria-hidden="true"></div>
          <div v-else class="room-detail-panel">
            <div class="room-detail-toolbar">
              <div class="room-detail-toolbar-title">{{ detail.room?.title || ('#' + detail.room?.id) }}</div>
              <div class="room-detail-toolbar-actions" style="display:flex;gap:8px;flex-wrap:wrap">
                <button
                  v-if="!closed && !joined"
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="acting"
                  @click="onJoin"
                >
                  <i class="fas fa-sign-in-alt"></i> 加入房间
                </button>
                <button
                  v-if="!closed && joined && !entered"
                  type="button"
                  class="btn btn-primary btn-sm"
                  @click="onEnter"
                >
                  <i class="fas fa-door-open"></i> 进入房间
                </button>
                <button
                  v-if="!closed && joined && !isHost"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="acting"
                  @click="onLeave"
                >
                  <i class="fas fa-sign-out-alt"></i> 离开房间
                </button>
                <button
                  v-if="!closed && isHost"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="acting"
                  @click="onClose"
                >
                  <i class="fas fa-times"></i> 关闭房间
                </button>
              </div>
            </div>

            <div class="room-info-panel">
              <div class="room-info-block">
                <div class="room-info-title">房间信息</div>
                <div class="room-info-meta">
                  <div class="room-info-row">
                    <span class="room-info-label">状态</span>
                    <span class="room-info-value room-status">{{ roomStatusLabel(roomStatus(detail.room!)) }}</span>
                  </div>
                  <div class="room-info-row">
                    <span class="room-info-label">房主</span>
                    <span class="room-info-value">{{ detail.room?.hostNickname || '-' }}</span>
                  </div>
                  <div class="room-info-row">
                    <span class="room-info-label">人数</span>
                    <span class="room-info-value">{{ members.length }}/{{ detail.room?.maxPlayers || 4 }}</span>
                  </div>
                  <div v-if="entered && isHost && detail.room?.passwordPlain" class="room-info-row">
                    <span class="room-info-label">密码</span>
                    <span class="room-info-value room-info-pwd">{{ detail.room.passwordPlain }}</span>
                  </div>
                  <div v-else-if="!entered && detail.room?.hasPassword" class="room-info-row">
                    <span class="room-info-label">权限</span>
                    <span class="room-info-value">需要密码</span>
                  </div>
                </div>
              </div>
              <div class="room-info-block">
                <div class="room-info-title">成员</div>
                <ul class="plain-list" style="margin:0;padding-left:18px">
                  <li v-for="(m, i) in members" :key="i">
                    {{ m.nickname || m.username || ('用户' + m.userId) }}
                    <span v-if="m.isHost" style="opacity:.7">（房主）</span>
                  </li>
                </ul>
              </div>
            </div>

            <div v-if="entered" class="room-chat-panel" style="margin-top:12px">
              <div class="room-info-title">聊天</div>
              <div class="room-chat-log" style="max-height:240px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;margin:8px 0">
                <p v-if="!messages.length" class="room-empty" style="padding:8px">暂无消息</p>
                <div v-for="msg in messages" :key="msg.id || JSON.stringify(msg)" style="margin:4px 0">
                  <strong>{{ msg.nickname || ('用户' + msg.userId) }}</strong>：
                  <span>{{ msg.content }}</span>
                </div>
              </div>
              <form style="display:flex;gap:8px" @submit.prevent="onSend">
                <input v-model.trim="chatInput" type="text" placeholder="说点什么…" style="flex:1" />
                <button type="submit" class="btn btn-primary btn-sm" :disabled="!chatInput || sending">发送</button>
              </form>
            </div>
            <p v-else-if="joined" class="room-empty" style="text-align:left;padding:8px 0">已加入，点击「进入房间」可聊天</p>
            <p v-else class="room-empty" style="text-align:left;padding:8px 0">加入房间后可进入聊天</p>
          </div>
        </div>
      </div>
    </div>
    <p v-if="toast" class="vue-state">{{ toast }}</p>

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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  closeRoom,
  createRoom,
  fetchRoomDetail,
  fetchRoomMessages,
  fetchRooms,
  joinRoom,
  leaveRoom,
  postRoomMessage,
  type RoomDetailPayload,
  type RoomMessage,
} from '@/api/rooms'
import { ApiError, type Room } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

const auth = useUserAuthStore()
const rooms = ref<Room[]>([])
const loading = ref(false)
const selectedId = ref<number | null>(null)
const detail = ref<RoomDetailPayload | null>(null)
const enteredRoomId = ref<number | null>(null)
const messages = ref<RoomMessage[]>([])
const chatInput = ref('')
const sending = ref(false)
const acting = ref(false)
const toast = ref('')
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ title: '', maxPlayers: 4, password: '' })

let listTimer: number | null = null
let msgTimer: number | null = null
let lastMsgId = 0

const members = computed(() => (Array.isArray(detail.value?.members) ? detail.value!.members! : []))
const joined = computed(() => !!(detail.value?.room?.joinedByMe || detail.value?.room?.isHost))
const isHost = computed(() => !!detail.value?.room?.isHost)
const closed = computed(() => String(detail.value?.room?.status || '').toLowerCase() === 'closed')
const entered = computed(() => !!selectedId.value && enteredRoomId.value === selectedId.value && joined.value)

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
    if (enteredRoomId.value === id && (detail.value?.room?.joinedByMe || detail.value?.room?.isHost)) {
      await loadMessages(id, false)
      startMsgPoll(id)
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
    const list = Array.isArray(data) ? data : []
    if (!incremental) {
      messages.value = list
    } else if (list.length) {
      messages.value = [...messages.value, ...list]
    }
    for (const m of list) {
      const mid = Number(m.id || 0)
      if (mid > lastMsgId) lastMsgId = mid
    }
  } catch {
    /* ignore poll errors */
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

watch(
  () => auth.isLoggedIn,
  (ok) => {
    if (!ok) {
      enteredRoomId.value = null
      detail.value = null
      selectedId.value = null
      messages.value = []
      stopMsgPoll()
    }
  },
)

onMounted(async () => {
  await load()
  startListPoll()
})
onUnmounted(() => {
  stopListPoll()
  stopMsgPoll()
})
</script>
