<template>
  <div class="page">
    <header class="page-head">
      <h1>大厅</h1>
      <button
        v-if="userAuth.isLoggedIn"
        type="button"
        class="ghost-btn"
        :disabled="loading"
        @click="load"
      >
        刷新
      </button>
    </header>

    <div v-if="!userAuth.isLoggedIn" class="gate-card">
      <p>大厅需要登录后才能查看房间列表与加入约战。</p>
      <RouterLink class="auth-btn" to="/login?redirect=/lobby">去登录</RouterLink>
    </div>

    <template v-else>
      <p class="page-desc">房间仅用于互相联系、约定上线对战；对局请自行在 Steam 启动游戏。</p>
      <div class="toolbar">
        <button type="button" class="auth-btn" disabled title="下一步再接创建/加入">创建房间（待接）</button>
      </div>

      <p v-if="loading" class="state">加载中…</p>
      <p v-else-if="error" class="state state-error">{{ error }}</p>
      <p v-else-if="!rooms.length" class="state">暂无房间</p>

      <div v-else class="stack">
        <article v-for="room in rooms" :key="room.id" class="card">
          <div class="card-body">
            <h2 class="card-title">
              {{ room.title || ('房间 #' + room.id) }}
              <span v-if="room.hasPassword" class="badge">有密码</span>
            </h2>
            <p class="card-meta">
              <span>{{ room.status || 'open' }}</span>
              <span>
                {{ room.memberCount ?? 0 }}
                <template v-if="room.maxPlayers != null"> / {{ room.maxPlayers }}</template>
                人
              </span>
              <span>房主 {{ room.hostNickname || '未知' }}</span>
              <span v-if="room.joinedByMe" class="badge badge-ok">已加入</span>
            </p>
            <div class="row-actions">
              <button type="button" class="ghost-btn" disabled title="下一步再接">加入（待接）</button>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchRooms } from '@/api/rooms'
import { ApiError, type Room } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'

const userAuth = useUserAuthStore()
const rooms = ref<Room[]>([])
const loading = ref(false)
const error = ref('')

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
    else rooms.value = []
  },
)

onMounted(load)
</script>
