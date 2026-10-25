<template>
  <section id="profile" class="page page-profile active" aria-labelledby="profileHomeHeading">
    <div class="profile-page-wrap">
      <div class="profile-cover" id="profileCover">
        <div v-if="!coverUrl" class="profile-cover-placeholder">
          <i class="fas fa-image" aria-hidden="true"></i>
          <span>暂无背景封面</span>
        </div>
        <div v-else class="profile-cover-img" :style="{ backgroundImage: 'url(' + coverUrl + ')' }"></div>
      </div>
      <div class="profile-page-body">
        <div class="profile-identity">
          <div class="profile-identity-top">
            <img class="profile-page-avatar" :src="avatarUrl" alt="头像" />
            <div class="profile-page-actions">
              <button type="button" class="btn btn-primary" @click="emit('open-settings')">
                <i class="fas fa-user-edit"></i> 编辑个人资料
              </button>
            </div>
          </div>
          <div class="profile-identity-meta">
            <h1 class="profile-page-nickname">{{ nickname }}</h1>
            <p class="profile-page-username">@{{ username }}</p>
            <p class="profile-page-bio">{{ bio }}</p>
            <div class="profile-page-facts">
              <span v-if="steamBound" class="profile-fact"><i class="fab fa-steam-symbol"></i> {{ steamName || 'Steam 已绑定' }}</span>
              <span v-if="playtimeText" class="profile-fact">时长 {{ playtimeText }}</span>
              <span v-if="achSummary" class="profile-fact">成就 {{ achSummary }}</span>
            </div>
          </div>
        </div>

        <section class="profile-home" aria-labelledby="profileHomeHeading">
          <header class="profile-home-header">
            <h2 id="profileHomeHeading" class="profile-home-title">主页</h2>
            <p class="profile-home-desc">发布的资讯、连段、赛事与 Steam 数据</p>
          </header>
          <div class="profile-home-tabs" role="tablist" aria-label="主页内容">
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'articles' }" role="tab" :aria-selected="tab === 'articles'" @click="tab = 'articles'">
              资讯 <span class="profile-home-tab-count">{{ articles.length }}</span>
            </button>
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'combos' }" role="tab" :aria-selected="tab === 'combos'" @click="tab = 'combos'">
              连段 <span class="profile-home-tab-count">{{ combos.length }}</span>
            </button>
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'tournaments' }" role="tab" :aria-selected="tab === 'tournaments'" @click="tab = 'tournaments'">
              赛事 <span class="profile-home-tab-count">{{ history.length }}</span>
            </button>
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'steam' }" role="tab" :aria-selected="tab === 'steam'" @click="openSteamTab">
              Steam
            </button>
          </div>
          <div class="profile-home-panels">
            <div class="profile-home-panel" :class="{ 'is-active': tab === 'articles' }" role="tabpanel" :hidden="tab !== 'articles'">
              <div class="profile-works-list">
                <div v-if="loading" class="profile-works-empty">加载中…</div>
                <div v-else-if="error" class="profile-works-empty">{{ error }}</div>
                <div v-else-if="!articles.length" class="profile-works-empty">暂无资讯</div>
                <div v-for="a in articles" :key="a.id" class="profile-works-item">
                  <div class="profile-works-item-title">{{ a.title || '无标题' }}</div>
                  <div class="profile-works-item-meta">{{ fmt(a.createdAt || a.created_at) }} · {{ a.viewCount ?? a.view_count ?? 0 }} 阅读</div>
                </div>
              </div>
            </div>
            <div class="profile-home-panel" :class="{ 'is-active': tab === 'combos' }" role="tabpanel" :hidden="tab !== 'combos'">
              <div class="profile-works-list">
                <div v-if="loading" class="profile-works-empty">加载中…</div>
                <div v-else-if="!combos.length" class="profile-works-empty">暂无连段</div>
                <div v-for="c in combos" :key="c.id" class="profile-works-item">
                  <div class="profile-works-item-title">{{ c.title || '未命名连段' }}</div>
                  <div class="profile-works-item-meta">{{ fmt(c.createdAt || c.created_at) }}</div>
                </div>
              </div>
            </div>
            <div class="profile-home-panel" :class="{ 'is-active': tab === 'tournaments' }" role="tabpanel" :hidden="tab !== 'tournaments'">
              <div class="profile-works-list">
                <div v-if="histLoading" class="profile-works-empty">加载中…</div>
                <div v-else-if="!history.length" class="profile-works-empty">暂无赛事记录</div>
                <div v-for="(h, i) in history" :key="i" class="profile-works-item">
                  <div class="profile-works-item-title">{{ histTitle(h) }}</div>
                  <div class="profile-works-item-meta">{{ histMeta(h) }}</div>
                </div>
              </div>
            </div>
            <div class="profile-home-panel" :class="{ 'is-active': tab === 'steam' }" role="tabpanel" :hidden="tab !== 'steam'">
              <div class="profile-works-list">
                <div v-if="!steamBound" class="profile-works-empty">
                  尚未绑定 Steam。可在「设置 → 绑定服务」完成绑定。
                </div>
                <template v-else>
                  <div class="profile-works-item">
                    <div class="profile-works-item-title">{{ steamName || 'Steam' }}</div>
                    <div class="profile-works-item-meta">
                      时长 {{ playtimeText || '—' }} · 成就 {{ achSummary || '—' }}
                      <button type="button" class="btn btn-secondary btn-sm" style="margin-left:8px" :disabled="steamLoading" @click="refreshSteam">刷新</button>
                    </div>
                  </div>
                  <div v-if="steamLoading" class="profile-works-empty">同步 Steam 数据中…</div>
                  <div v-else-if="steamError" class="profile-works-empty">{{ steamError }}</div>
                  <div v-for="(ach, i) in achievements" :key="i" class="profile-works-item">
                    <div class="profile-works-item-title">{{ achName(ach) }}</div>
                    <div class="profile-works-item-meta">{{ achMeta(ach) }}</div>
                  </div>
                  <div v-if="!steamLoading && !achievements.length && !steamError" class="profile-works-empty">暂无成就数据</div>
                </template>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchMyArticles } from '@/api/articles'
import { fetchMyTournamentHistory } from '@/api/tournaments'
import {
  fetchMyCombos,
  fetchSteamAchievements,
  fetchSteamPlaytime,
  fetchUserProfile,
  type ComboItem,
} from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError, type Article } from '@/api/types'

const emit = defineEmits<{ 'open-settings': [] }>()
const auth = useUserAuthStore()

const tab = ref<'articles' | 'combos' | 'tournaments' | 'steam'>('articles')
const articles = ref<Article[]>([])
const combos = ref<ComboItem[]>([])
const history = ref<unknown[]>([])
const loading = ref(false)
const histLoading = ref(false)
const error = ref('')
const profileCover = ref('')
const profileBio = ref('')
const steamBound = ref(false)
const steamName = ref('')
const playtimeMinutes = ref<number | null>(null)
const achCount = ref<number | null>(null)
const achTotal = ref<number | null>(null)
const achievements = ref<Record<string, unknown>[]>([])
const steamLoading = ref(false)
const steamError = ref('')

const nickname = computed(() => auth.user?.nickname || auth.user?.username || '昵称')
const username = computed(() => auth.user?.username || 'username')
const avatarUrl = computed(() => auth.user?.avatarUrl || '/images/CSel3_LargePortTianhuo.png')
const coverUrl = computed(() => profileCover.value || (auth.user as { coverUrl?: string } | null)?.coverUrl || '')
const bio = computed(() => profileBio.value || (auth.user as { signature?: string } | null)?.signature || '')
const playtimeText = computed(() => {
  if (playtimeMinutes.value == null) return ''
  const h = Math.floor(playtimeMinutes.value / 60)
  const m = playtimeMinutes.value % 60
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分`
})
const achSummary = computed(() => {
  if (achCount.value == null) return ''
  return achTotal.value != null ? `${achCount.value}/${achTotal.value}` : String(achCount.value)
})

function fmt(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}
function asRec(v: unknown) {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
}
function histTitle(h: unknown) {
  const r = asRec(h)
  return String(r.title || r.tournamentTitle || r.name || ('赛事 #' + (r.tournamentId || r.id || '')))
}
function histMeta(h: unknown) {
  const r = asRec(h)
  const parts = [
    r.status != null ? String(r.status) : '',
    r.finalPlacement != null ? `名次 #${r.finalPlacement}` : '',
    r.placement != null ? `名次 #${r.placement}` : '',
  ].filter(Boolean)
  return parts.join(' · ') || fmt(String(r.createdAt || r.created_at || ''))
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

async function loadHistory() {
  histLoading.value = true
  try {
    const data = await fetchMyTournamentHistory()
    history.value = Array.isArray(data) ? data : []
  } catch {
    history.value = []
  } finally {
    histLoading.value = false
  }
}

async function refreshSteam() {
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

function openSteamTab() {
  tab.value = 'steam'
  if (steamBound.value && !achievements.value.length && !steamLoading.value) refreshSteam()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    try {
      const p = await fetchUserProfile()
      if (p.coverUrl) profileCover.value = String(p.coverUrl)
      if (p.signature) profileBio.value = String(p.signature)
      steamBound.value = !!(p.steamId || (p as { steam_id?: string }).steam_id)
      steamName.value = String(
        p.steamName ||
          (p as { steamPersonaName?: string }).steamPersonaName ||
          '',
      )
      if ((p as { steamPlaytimeMinutes?: number }).steamPlaytimeMinutes != null) {
        playtimeMinutes.value = Number((p as { steamPlaytimeMinutes?: number }).steamPlaytimeMinutes)
      }
      if ((p as { steamAchievementsCount?: number }).steamAchievementsCount != null) {
        achCount.value = Number((p as { steamAchievementsCount?: number }).steamAchievementsCount)
      }
      if ((p as { steamAchievementsTotal?: number }).steamAchievementsTotal != null) {
        achTotal.value = Number((p as { steamAchievementsTotal?: number }).steamAchievementsTotal)
      }
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw) as Record<string, unknown>
        Object.assign(u, {
          nickname: p.nickname ?? u.nickname,
          avatarUrl: p.avatarUrl ?? u.avatarUrl,
          email: p.email ?? u.email,
          coverUrl: p.coverUrl ?? u.coverUrl,
          signature: p.signature ?? u.signature,
          steamId: p.steamId ?? u.steamId,
          steamName: steamName.value || u.steamName,
        })
        localStorage.setItem('user', JSON.stringify(u))
        auth.hydrate()
      }
    } catch {
      const u = auth.user as Record<string, unknown> | null
      steamBound.value = !!(u?.steamId)
      steamName.value = String(u?.steamName || u?.steamPersonaName || '')
    }
    const [a, c] = await Promise.all([
      fetchMyArticles().catch(() => [] as Article[]),
      fetchMyCombos().catch(() => [] as ComboItem[]),
    ])
    articles.value = Array.isArray(a) ? a : []
    combos.value = Array.isArray(c) ? c : []
    await loadHistory()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<style scoped>
.profile-cover-img {
  width: 100%;
  height: 100%;
  min-height: 160px;
  background-size: cover;
  background-position: center;
}
.profile-page-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  opacity: 0.85;
  font-size: 0.9rem;
}
</style>
