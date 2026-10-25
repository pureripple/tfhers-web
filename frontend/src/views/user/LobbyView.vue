<template>
  <section class="page active">
    <div class="rooms-page">
      <div v-if="!userAuth.isLoggedIn" class="auth-card-legacy" style="margin-top:2rem">
        <h1>大厅</h1>
        <p>大厅需要登录后才能查看房间列表与加入约战。</p>
        <RouterLink class="btn btn-primary" to="/login?redirect=/lobby" style="display:inline-flex;margin-top:0.75rem;text-decoration:none">
          去登录
        </RouterLink>
      </div>

      <div v-else class="rooms-layout">
        <div class="rooms-list-col">
          <header class="rooms-rail-head" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <button type="button" class="rooms-icon-btn" title="刷新列表" aria-label="刷新列表" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button type="button" class="rooms-icon-btn" title="创建房间（待接）" aria-label="创建房间" disabled>
              <i class="fas fa-plus"></i>
            </button>
          </header>
          <div class="room-list" aria-label="房间列表">
            <p v-if="loading" class="vue-state">加载中…</p>
            <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
            <p v-else-if="!rooms.length" class="room-empty">暂无房间</p>
            <button
              v-for="room in rooms"
              :key="room.id"
              type="button"
              class="room-tile"
              :class="[
                selectedId === room.id ? 'is-active' : '',
                'room-tile--' + roomStatus(room).toLowerCase(),
              ]"
              :title="tileTitle(room)"
              :aria-label="tileTitle(room)"
              @click="selectedId = room.id"
            >
              <span class="room-tile-face">
                <i v-if="room.hasPassword" class="fas fa-lock" style="position:absolute;top:8px;left:8px;font-size:0.7rem;opacity:0.8"></i>
                <span v-if="room.joinedByMe" class="room-tile-mark room-tile-mark--joined">在</span>
                <span class="room-tile-abbr">{{ abbrOf(room) }}</span>
                <span class="room-tile-count">
                  {{ room.memberCount ?? 0 }}<template v-if="room.maxPlayers != null">/{{ room.maxPlayers }}</template>
                </span>
              </span>
            </button>
          </div>
        </div>
        <div class="room-detail" :class="selected ? 'has-room' : 'is-idle'" aria-label="房间详情">
          <div v-if="!selected" class="room-idle-panel" aria-hidden="true"></div>
          <div v-else class="room-detail-panel">
            <div class="room-detail-toolbar">
              <div class="room-detail-toolbar-title">{{ selected.title || ('房间 #' + selected.id) }}</div>
            </div>
            <div class="room-info-panel">
              <div class="room-info-block">
                <div class="room-info-title">房间信息</div>
                <div class="room-info-meta">
                  <div class="room-info-row">
                    <span class="room-info-label">状态</span>
                    <span class="room-info-value room-status">{{ roomStatusLabel(roomStatus(selected)) }}</span>
                  </div>
                  <div class="room-info-row">
                    <span class="room-info-label">人数</span>
                    <span class="room-info-value room-info-count">
                      {{ selected.memberCount ?? 0 }}
                      <template v-if="selected.maxPlayers != null"> / {{ selected.maxPlayers }}</template>
                    </span>
                  </div>
                  <div class="room-info-row">
                    <span class="room-info-label">房主</span>
                    <span class="room-info-value">{{ selected.hostNickname || '未知' }}</span>
                  </div>
                  <div v-if="selected.hasPassword" class="room-info-row">
                    <span class="room-info-label">密码</span>
                    <span class="room-info-value">有密码</span>
                  </div>
                </div>
                <p class="room-info-tip">房间仅用于互相联系、约定上线对战；对局请自行在 Steam 启动游戏。</p>
                <div class="room-info-actions">
                  <button type="button" class="btn btn-primary" disabled title="下一步再接">加入（待接）</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { fetchRooms } from '@/api/rooms'
import { ApiError, type Room } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

const userAuth = useUserAuthStore()
const rooms = ref<Room[]>([])
const loading = ref(false)
const error = ref('')
const selectedId = ref<number | null>(null)

const selected = computed(() => rooms.value.find((r) => r.id === selectedId.value) || null)

function roomStatus(r: Room) {
  const raw = (r.status || '').toString().toUpperCase()
  if (raw === 'CLOSED') return 'CLOSED'
  const cnt = r.memberCount ?? 0
  const max = r.maxPlayers ?? 99
  if (cnt >= max) return 'FULL'
  return 'OPEN'
}
function roomStatusLabel(st: string) {
  if (st === 'FULL') return '已满'
  if (st === 'CLOSED') return '已关闭'
  return '开放中'
}
function abbrOf(r: Room) {
  const title = (r.title || ('R' + r.id)).trim()
  const chars = [...title]
  const hasCjk = chars.some((ch) => {
    const code = ch.codePointAt(0) || 0
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)
  })
  if (hasCjk) return chars.slice(0, 2).join('')
  return chars.slice(0, 4).join('').toUpperCase()
}
function tileTitle(r: Room) {
  const st = roomStatus(r)
  return (r.title || ('房间 #' + r.id)) + ' · ' + (r.memberCount ?? 0) + '/' + (r.maxPlayers ?? '?') + ' · ' + roomStatusLabel(st)
}

async function load() {
  if (!userAuth.isLoggedIn) {
    rooms.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await fetchRooms()
    rooms.value = Array.isArray(data) ? data : []
    if (selectedId.value && !rooms.value.some((r) => r.id === selectedId.value)) {
      selectedId.value = null
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载房间失败'
    rooms.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => userAuth.isLoggedIn,
  (ok) => {
    if (ok) load()
    else {
      rooms.value = []
      selectedId.value = null
    }
  },
)

onMounted(load)
</script>
