<template>
  <section class="page active">
    <div class="rooms-page">
      <div class="rooms-layout">
        <div class="rooms-list-col">
          <header class="rooms-rail-head" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <button type="button" class="rooms-icon-btn" title="刷新列表" aria-label="刷新列表" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i>
            </button>
            <button type="button" class="rooms-icon-btn" title="创建房间（占位）" aria-label="创建房间" disabled>
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
                <span v-if="room.joinedByMe" class="room-tile-mark room-tile-mark--joined">我</span>
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
                    <span class="room-info-value">已加密</span>
                  </div>
                </div>
                <p class="room-info-tip">约战房间用于群内约战或本地对战；对局请自行用 Steam 启动游戏。</p>
                <div class="room-info-actions">
                  <button type="button" class="btn btn-primary" disabled title="下一步再接">加入（占位）</button>
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
import { computed, onMounted, ref } from 'vue'
import { fetchRooms } from '@/api/rooms'
import { ApiError, type Room } from '@/api/types'

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
  return '可加入'
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

onMounted(load)
</script>
