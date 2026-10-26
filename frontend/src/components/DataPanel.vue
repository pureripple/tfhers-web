<template>
  <section id="data" class="page page-data active">
    <div class="data-page-wrap">
      <header class="data-page-header">
        <div class="data-page-header-text">
          <h1 class="data-page-title">数据</h1>
          <p class="data-page-desc">已绑定的 Steam 账号与游戏数据</p>
        </div>
        <button
          v-if="steamBound"
          type="button"
          class="btn btn-outline btn-sm data-refresh-btn"
          :disabled="steamLoading"
          title="刷新 Steam 数据"
          @click="refreshSteam(true)"
        >
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </header>

      <div class="data-page-body">
        <div v-if="loading" class="vue-state">加载中…</div>
        <div v-else-if="steamBound" class="data-steam-bound">
          <div class="data-profile-card">
            <img class="data-steam-avatar" :src="steamAvatar || '/images/CSel3_LargePortTianhuo.png'" alt="Steam 头像" />
            <div class="data-steam-meta">
              <div class="data-steam-name">{{ steamName || 'Steam' }}</div>
              <div class="data-steam-chips">
                <span v-if="steamLevel != null" class="data-chip"><span class="data-chip-label">等级</span> <strong>{{ steamLevel }}</strong></span>
                <span v-if="friendCode" class="data-chip"><span class="data-chip-label">好友代码</span> <strong>{{ friendCode }}</strong></span>
              </div>
            </div>
          </div>

          <div class="data-stats-row">
            <div class="data-stat-card">
              <div class="data-stat-label">游戏时长</div>
              <div class="data-stat-value">{{ playtimeHours }}</div>
            </div>
            <div class="data-stat-card data-stat-card--achv">
              <div class="data-stat-label">成就进度</div>
              <div class="data-stat-value"><strong>{{ achSummary }}</strong></div>
              <div class="my-data-achv-bar" aria-hidden="true">
                <span class="my-data-achv-bar-fill" :style="{ width: achPct + '%' }"></span>
              </div>
              <span class="my-data-achv-pct">{{ achPct }}%</span>
            </div>
          </div>

          <p v-if="steamError" class="vue-state vue-state-error">{{ steamError }}</p>

          <section class="data-achv-section">
            <header class="data-achv-header">
              <h2 class="data-achv-title">成就列表</h2>
              <span class="data-achv-count">{{ achievements.length || '' }}</span>
            </header>
            <div class="data-achievements-list">
              <div v-if="steamLoading" class="vue-state">加载中…</div>
              <div v-else-if="!achievements.length" class="vue-state">暂无成就数据</div>
              <div v-for="(a, i) in achievements" :key="i" class="data-achv-item">
                <div class="data-achv-name">{{ achName(a) }}</div>
                <div class="data-achv-meta">{{ achMeta(a) }}</div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="data-steam-unbound">
          <div class="data-unbound-card">
            <i class="fab fa-steam" aria-hidden="true"></i>
            <p>尚未绑定 Steam 账号</p>
            <button type="button" class="btn btn-primary" @click="emit('open-settings')">去设置绑定</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchSteamAchievements,
  fetchSteamPlaytime,
  fetchUserProfile,
} from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/types'

const emit = defineEmits<{ 'open-settings': [] }>()
const auth = useUserAuthStore()

const loading = ref(true)
const steamBound = ref(false)
const steamName = ref('')
const steamAvatar = ref('')
const steamLevel = ref<number | null>(null)
const friendCode = ref('')
const playtimeMinutes = ref<number | null>(null)
const achCount = ref<number | null>(null)
const achTotal = ref<number | null>(null)
const achievements = ref<Record<string, unknown>[]>([])
const steamLoading = ref(false)
const steamError = ref('')

const playtimeHours = computed(() => {
  if (playtimeMinutes.value == null) return '0h'
  const h = Math.floor(playtimeMinutes.value / 60)
  const m = playtimeMinutes.value % 60
  if (h <= 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
})
const achSummary = computed(() => {
  if (achCount.value == null) return '0/0'
  return achTotal.value != null ? `${achCount.value}/${achTotal.value}` : String(achCount.value)
})
const achPct = computed(() => {
  if (achCount.value == null || !achTotal.value) return 0
  return Math.min(100, Math.round((achCount.value / achTotal.value) * 100))
})

function asRec(v: unknown) {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
}
function achName(a: unknown) {
  const r = asRec(a)
  return String(r.displayName || r.name || r.apiName || '成就')
}
function achMeta(a: unknown) {
  const r = asRec(a)
  const unlocked = r.achieved === 1 || r.achieved === true || r.unlocktime
  return unlocked ? '已解锁' : '未解锁'
}

async function refreshSteam(_force = false) {
  if (!steamBound.value) return
  steamLoading.value = true
  steamError.value = ''
  try {
    const [pt, ach] = await Promise.all([
      fetchSteamPlaytime().catch(() => null),
      fetchSteamAchievements().catch(() => null),
    ])
    const ptr = asRec(pt)
    if (ptr.playtimeMinutes != null) playtimeMinutes.value = Number(ptr.playtimeMinutes)
    else if (ptr.playtimeForever != null) playtimeMinutes.value = Number(ptr.playtimeForever)
    if (ptr.steamLevel != null) steamLevel.value = Number(ptr.steamLevel)
    if (ptr.level != null) steamLevel.value = Number(ptr.level)
    if (ptr.friendCode != null) friendCode.value = String(ptr.friendCode)
    if (ptr.avatarUrl != null) steamAvatar.value = String(ptr.avatarUrl)
    if (ptr.avatarfull != null) steamAvatar.value = String(ptr.avatarfull)

    const ar = asRec(ach)
    const list = (ar.achievements || ar.list || ach) as unknown
    if (Array.isArray(list)) achievements.value = list as Record<string, unknown>[]
    else if (Array.isArray(ar.achievedList)) achievements.value = ar.achievedList as Record<string, unknown>[]
    else achievements.value = []
    if (ar.achieved != null) achCount.value = Number(ar.achieved)
    if (ar.total != null) achTotal.value = Number(ar.total)
    if (ar.count != null) achCount.value = Number(ar.count)
  } catch (e) {
    steamError.value = e instanceof ApiError ? e.message : 'Steam 数据加载失败'
  } finally {
    steamLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const p = await fetchUserProfile()
    steamBound.value = !!(p.steamId || (p as { steam_id?: string }).steam_id)
    steamName.value = String(p.steamName || (p as { steamPersonaName?: string }).steamPersonaName || '')
    steamAvatar.value = String((p as { steamAvatarUrl?: string }).steamAvatarUrl || p.avatarUrl || '')
    if ((p as { steamPlaytimeMinutes?: number }).steamPlaytimeMinutes != null) {
      playtimeMinutes.value = Number((p as { steamPlaytimeMinutes?: number }).steamPlaytimeMinutes)
    }
    if ((p as { steamAchievementsCount?: number }).steamAchievementsCount != null) {
      achCount.value = Number((p as { steamAchievementsCount?: number }).steamAchievementsCount)
    }
    if ((p as { steamAchievementsTotal?: number }).steamAchievementsTotal != null) {
      achTotal.value = Number((p as { steamAchievementsTotal?: number }).steamAchievementsTotal)
    }
    if (steamBound.value) await refreshSteam()
  } catch {
    const u = auth.user as Record<string, unknown> | null
    steamBound.value = !!(u?.steamId)
    steamName.value = String(u?.steamName || '')
    if (steamBound.value) await refreshSteam()
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>