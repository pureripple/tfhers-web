<template>
  <section class="page active">
    <div class="tournaments-page">
      <div class="tournaments-layout">
        <div class="tournament-list" aria-label="list">
          <div v-if="loading" class="tournament-empty">加载中…</div>
          <div v-else-if="error" class="tournament-empty">{{ error }}</div>
          <div v-else-if="!items.length" class="tournament-empty">暂无公开比赛</div>
          <article
            v-for="item in items"
            v-else
            :key="item.id"
            class="tournament-card"
            :class="{ active: selectedId === item.id }"
            @click="selectedId = item.id"
          >
            <div class="tournament-card-top">
              <h3 class="tournament-card-title">{{ item.title || '-' }}</h3>
              <span class="tournament-status" :class="item.status || ''">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="tournament-card-meta">
              <span>
                <i class="fas fa-users"></i>
                {{ item.registrationCount ?? 0 }}
                <template v-if="item.maxSlots != null"> / {{ item.maxSlots }}</template>
                <template v-if="item.registeredByMe"> · 已报名</template>
              </span>
              <span v-if="item.startsAt"><i class="fas fa-clock"></i> {{ formatTime(item.startsAt) }}</span>
            </div>
          </article>
        </div>

        <div class="tournament-detail active" aria-label="detail">
          <div v-if="!selectedId" class="tournament-empty">请选择比赛</div>
          <div v-else-if="detailLoading" class="tournament-empty">加载详情…</div>
          <div v-else-if="detailError" class="tournament-empty">{{ detailError }}</div>
          <template v-else-if="selected">
            <div class="tournament-detail-panel">
              <div class="tournament-detail-head">
                <div class="tournament-detail-head-row">
                  <div class="tournament-detail-head-main">
                    <h3 class="tournament-detail-title">{{ selected.title || '-' }}</h3>
                  </div>
                </div>
              </div>

              <h3 class="tournament-section-title">比赛规则</h3>
              <div v-if="selected.description" class="tournament-rules-box">
                <p class="tournament-detail-desc">{{ selected.description }}</p>
              </div>
              <div v-else class="tournament-rules-box tournament-rules-box--empty">
                <p class="tournament-detail-desc tournament-detail-desc--empty">暂无比赛规则，请关注管理员公告</p>
              </div>

              <h3 class="tournament-section-title">选手（已签到：{{ checkInRatio }}）</h3>
              <div class="tournament-reg-list">
                <template v-if="registrations.length">
                  <span
                    v-for="(r, i) in registrations"
                    :key="r.userId || i"
                    class="tournament-reg-chip"
                    :class="{ 'tournament-reg-chip--checked': !!r.checkedIn }"
                  >
                    <img :src="r.avatarUrl || DEFAULT_AVATAR" alt="" @error="onAvatarError" />
                    <i
                      v-if="r.checkedIn"
                      class="fas fa-check-circle tournament-reg-check"
                      title="已签到"
                    ></i>
                    <button type="button" class="player-name-link" :class="adminNameClass(r)" @click="goPlayerProfile(router, r.userId, r)">{{ r.nickname || r.username || ('用户' + r.userId) }}</button>
                  </span>
                </template>
                <span v-else style="color: rgba(255,255,255,0.45)">暂无报名</span>
              </div>

              <h3 class="tournament-section-title">对阵图</h3>
              <div class="bracket-wrap">
                <div v-if="bracketEmpty" class="tournament-empty" style="padding:24px">对阵图尚未生成</div>
                <div v-else-if="isDouble" class="bracket-de">
                  <div class="bracket-de-section">
                    <div class="bracket-de-heading">胜者组</div>
                    <div class="bracket-board">
                      <div v-for="rk in winnerKeys" :key="'w'+rk" class="bracket-round">
                        <div class="bracket-round-title">{{ winnerLabel(rk) }}</div>
                        <div class="bracket-round-body">
                          <div
                            v-for="m in (bracketWinners[rk] || [])"
                            :key="m.id"
                            class="bracket-match"
                          >
                            <div
                              class="bracket-slot"
                              :class="slotClass(m, 1)"
                            >
                              <img
                                v-if="m.player1UserId"
                                class="bracket-avatar"
                                :src="m.player1AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 1)" @click.stop="goBracketPlayer(m, 1)">{{ slotName(m, 1) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score1) }}</span>
                            </div>
                            <div
                              class="bracket-slot"
                              :class="slotClass(m, 2)"
                            >
                              <img
                                v-if="m.player2UserId"
                                class="bracket-avatar"
                                :src="m.player2AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 2)" @click.stop="goBracketPlayer(m, 2)">{{ slotName(m, 2) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score2) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="bracket-de-section bracket-de-losers">
                    <div class="bracket-de-heading">败者组</div>
                    <div class="bracket-board">
                      <div v-for="rk in loserKeys" :key="'l'+rk" class="bracket-round">
                        <div class="bracket-round-title">{{ loserLabel(rk) }}</div>
                        <div class="bracket-round-body">
                          <div
                            v-for="m in (bracketLosers[rk] || [])"
                            :key="m.id"
                            class="bracket-match"
                          >
                            <div class="bracket-slot" :class="slotClass(m, 1)">
                              <img
                                v-if="m.player1UserId"
                                class="bracket-avatar"
                                :src="m.player1AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 1)" @click.stop="goBracketPlayer(m, 1)">{{ slotName(m, 1) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score1) }}</span>
                            </div>
                            <div class="bracket-slot" :class="slotClass(m, 2)">
                              <img
                                v-if="m.player2UserId"
                                class="bracket-avatar"
                                :src="m.player2AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 2)" @click.stop="goBracketPlayer(m, 2)">{{ slotName(m, 2) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score2) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="bracket-de-section bracket-de-gf">
                    <div class="bracket-de-heading">总决赛</div>
                    <div class="bracket-board">
                      <div v-for="m in grandFinal" :key="m.id" class="bracket-round">
                        <div class="bracket-round-title">
                          {{ isReset(m) ? '总决赛重置 (GF2)' : '总决赛 (GF1)' }}
                        </div>
                        <div class="bracket-round-body">
                          <div class="bracket-match">
                            <div class="bracket-slot" :class="slotClass(m, 1)">
                              <img
                                v-if="m.player1UserId"
                                class="bracket-avatar"
                                :src="m.player1AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 1)" @click.stop="goBracketPlayer(m, 1)">{{ slotName(m, 1) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score1) }}</span>
                            </div>
                            <div class="bracket-slot" :class="slotClass(m, 2)">
                              <img
                                v-if="m.player2UserId"
                                class="bracket-avatar"
                                :src="m.player2AvatarUrl || DEFAULT_AVATAR"
                                alt=""
                                @error="onAvatarError"
                              />
                              <span v-else class="bracket-avatar"></span>
                              <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 2)" @click.stop="goBracketPlayer(m, 2)">{{ slotName(m, 2) }}</button>
                              <span class="bracket-score">{{ scoreText(m.score2) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="bracket-board">
                  <div v-for="rk in singleKeys" :key="'s'+rk" class="bracket-round">
                    <div class="bracket-round-title">{{ singleLabel(rk) }}</div>
                    <div class="bracket-round-body">
                      <div
                        v-for="m in (bracketRounds[rk] || [])"
                        :key="m.id"
                        class="bracket-match"
                      >
                        <div class="bracket-slot" :class="slotClass(m, 1)">
                          <img
                            v-if="m.player1UserId"
                            class="bracket-avatar"
                            :src="m.player1AvatarUrl || DEFAULT_AVATAR"
                            alt=""
                            @error="onAvatarError"
                          />
                          <span v-else class="bracket-avatar"></span>
                          <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 1)" @click.stop="goBracketPlayer(m, 1)">{{ slotName(m, 1) }}</button>
                          <span class="bracket-score">{{ scoreText(m.score1) }}</span>
                        </div>
                        <div class="bracket-slot" :class="slotClass(m, 2)">
                          <img
                            v-if="m.player2UserId"
                            class="bracket-avatar"
                            :src="m.player2AvatarUrl || DEFAULT_AVATAR"
                            alt=""
                            @error="onAvatarError"
                          />
                          <span v-else class="bracket-avatar"></span>
                          <button type="button" class="bracket-name player-name-link" :class="slotAdminClass(m, 2)" @click.stop="goBracketPlayer(m, 2)">{{ slotName(m, 2) }}</button>
                          <span class="bracket-score">{{ scoreText(m.score2) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  checkInTournament,
  fetchTournament,
  fetchTournamentBracket,
  fetchTournaments,
  registerTournament,
  unregisterTournament,
} from '@/api/tournaments'
import { ApiError, type Tournament } from '@/api/types'
import { useUserAuthStore } from '@/stores/auth'
import { adminNameClass } from '@/utils/adminName'
import { goPlayerProfile } from '@/utils/playerProfile'

const router = useRouter()

const DEFAULT_AVATAR = '/images/CSel3_LargePortTianhuo.png'

interface BracketMatch {
  id?: number
  player1UserId?: number | null
  player2UserId?: number | null
  player1Nickname?: string
  player2Nickname?: string
  player1AvatarUrl?: string
  player2AvatarUrl?: string
  score1?: number | string | null
  score2?: number | string | null
  winnerId?: number | null
  isResetMatch?: number | string | boolean
  [key: string]: unknown
}

interface RegRow {
  userId?: number
  nickname?: string
  username?: string
  avatarUrl?: string
  checkedIn?: boolean | number
  [key: string]: unknown
}

const auth = useUserAuthStore()
const items = ref<Tournament[]>([])
const loading = ref(false)
const error = ref('')
const selectedId = ref<number | null>(null)
const acting = ref(false)

const detailLoading = ref(false)
const detailError = ref('')
const detailTournament = ref<Tournament | null>(null)
const registrations = ref<RegRow[]>([])
const canRegisterFlag = ref<boolean | null>(null)
const canCheckInFlag = ref<boolean | null>(null)
const registeredByMe = ref(false)
const checkedInByMe = ref(false)
const checkedInCount = ref<number | null>(null)

const bracketRaw = ref<Record<string, unknown> | null>(null)

const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  open: '报名中',
  registration: '报名中',
  closed: '报名截止',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
}

const selected = computed(() => {
  if (detailTournament.value && detailTournament.value.id === selectedId.value) {
    return detailTournament.value
  }
  return items.value.find((t) => t.id === selectedId.value) || null
})

const status = computed(() => String(selected.value?.status || '').toLowerCase())

const showRegister = computed(() => {
  if (canRegisterFlag.value != null) return !!canRegisterFlag.value
  if (registeredByMe.value) return false
  return status.value === 'open' || status.value === 'registration'
})

const showUnregister = computed(() => {
  return registeredByMe.value && status.value === 'registration' && !showRegister.value
})

const showCheckIn = computed(() => {
  if (canCheckInFlag.value != null) return !!canCheckInFlag.value
  return false
})

const matchesList = computed(() => {
  const raw = bracketRaw.value
  if (!raw) return [] as BracketMatch[]
  const m = raw.matches
  return Array.isArray(m) ? (m as BracketMatch[]) : []
})

const isDouble = computed(() => {
  const raw = bracketRaw.value
  const t =
    String(
      (raw && (raw.bracketType as string)) ||
        (raw && (raw.tournament as { bracketType?: string } | undefined)?.bracketType) ||
        selected.value?.bracketType ||
        'single',
    ).toLowerCase()
  return t === 'double'
})

const bracketRounds = computed(() => {
  const raw = bracketRaw.value
  const rounds = (raw && (raw.rounds as Record<string, BracketMatch[]>)) || {}
  return rounds
})

const roundLabels = computed(() => {
  const raw = bracketRaw.value
  return ((raw && (raw.roundLabels as Record<string, string>)) || {}) as Record<string, string>
})

const singleKeys = computed(() =>
  Object.keys(bracketRounds.value)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b),
)
const checkInRatio = computed(() => {
  const total = registrations.value.length || selected.value?.registrationCount || 0
  const done =
    checkedInCount.value != null
      ? checkedInCount.value
      : registrations.value.filter((r) => !!r.checkedIn).length
  return done + '/' + total
})

const bracketWinners = computed(() => {
  const raw = bracketRaw.value
  return ((raw && (raw.winners as Record<string, BracketMatch[]>)) || {}) as Record<
    string,
    BracketMatch[]
  >
})

const bracketLosers = computed(() => {
  const raw = bracketRaw.value
  return ((raw && (raw.losers as Record<string, BracketMatch[]>)) || {}) as Record<
    string,
    BracketMatch[]
  >
})

const winnersRoundLabels = computed(() => {
  const raw = bracketRaw.value
  return (
    ((raw &&
      ((raw.winnersRoundLabels as Record<string, string>) ||
        (raw.roundLabels as Record<string, string>))) ||
      {}) as Record<string, string>
  )
})

const losersRoundLabels = computed(() => {
  const raw = bracketRaw.value
  return ((raw && (raw.losersRoundLabels as Record<string, string>)) || {}) as Record<
    string,
    string
  >
})

const winnerKeys = computed(() =>
  Object.keys(bracketWinners.value)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b),
)

const loserKeys = computed(() =>
  Object.keys(bracketLosers.value)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b),
)

const grandFinal = computed(() => {
  const raw = bracketRaw.value
  const gf = raw && raw.grandFinal
  return Array.isArray(gf) ? (gf as BracketMatch[]) : []
})

const bracketEmpty = computed(() => {
  if (!matchesList.value.length) return true
  if (isDouble.value) {
    return !winnerKeys.value.length && !loserKeys.value.length && !grandFinal.value.length
  }
  return !singleKeys.value.length
})

function statusLabel(s?: string) {
  if (!s) return '-'
  return STATUS_MAP[s] || s
}

function bracketTypeLabel(t?: string) {
  const v = String(t || '').toLowerCase()
  if (v === 'double') return '双败淘汰'
  if (v === 'single') return '单败淘汰'
  return t || '-'
}

function formatTime(v?: string) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleString('zh-CN')
  } catch {
    return v
  }
}

function singleLabel(rk: number) {
  return roundLabels.value[String(rk)] || `第${rk}轮`
}

function winnerLabel(rk: number) {
  return winnersRoundLabels.value[String(rk)] || `第${rk}轮`
}

function loserLabel(rk: number) {
  return losersRoundLabels.value[String(rk)] || `第${rk}轮`
}

function slotName(m: BracketMatch, side: 1 | 2) {
  if (side === 1) {
    if (m.player1Nickname) return m.player1Nickname
    if (m.player1UserId) return '用户' + m.player1UserId
    return '待定'
  }
  if (m.player2Nickname) return m.player2Nickname
  if (m.player2UserId) return '用户' + m.player2UserId
  return '待定'
}

function slotClass(m: BracketMatch, side: 1 | 2) {
  const uid = side === 1 ? m.player1UserId : m.player2UserId
  const cls: string[] = []
  if (!uid) cls.push('tbd')
  if (m.winnerId && uid && Number(m.winnerId) === Number(uid)) cls.push('winner')
  return cls
}


function goBracketPlayer(m: BracketMatch, side: 1 | 2) {
  const uid = side === 1 ? m.player1UserId : m.player2UserId
  if (uid == null) return
  const isAdmin =
    side === 1
      ? (m as { player1IsAdmin?: boolean }).player1IsAdmin
      : (m as { player2IsAdmin?: boolean }).player2IsAdmin
  goPlayerProfile(router, uid, { userId: uid, isAdmin })
}

function slotAdminClass(m: BracketMatch, side: 1 | 2) {
  const flag =
    side === 1
      ? { isAdmin: (m as { player1IsAdmin?: boolean }).player1IsAdmin }
      : { isAdmin: (m as { player2IsAdmin?: boolean }).player2IsAdmin }
  return adminNameClass(flag)
}

function scoreText(s: number | string | null | undefined) {
  return s != null && s !== '' ? String(s) : ''
}

function isReset(m: BracketMatch) {
  return m.isResetMatch === 1 || m.isResetMatch === '1' || m.isResetMatch === true
}

function onAvatarError(e: Event) {
  const el = e.target as HTMLImageElement
  if (!el || el.dataset.imgFailed) return
  el.dataset.imgFailed = '1'
  const src = el.getAttribute('src') || ''
  if (src.indexOf('Tianhuo') >= 0) {
    el.style.visibility = 'hidden'
  } else {
    el.src = DEFAULT_AVATAR
  }
}

async function loadList() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchTournaments()
    items.value = Array.isArray(data) ? data : []
    if (items.value.length) {
      const keep = selectedId.value && items.value.some((x) => x.id === selectedId.value)
      selectedId.value = keep ? selectedId.value : items.value[0].id
    } else {
      selectedId.value = null
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    items.value = []
    selectedId.value = null
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: number) {
  detailLoading.value = true
  detailError.value = ''
  bracketRaw.value = null
  registrations.value = []
  canRegisterFlag.value = null
  canCheckInFlag.value = null
  registeredByMe.value = false
  checkedInByMe.value = false
  checkedInCount.value = null
  detailTournament.value = null
  try {
    const [detail, bracket] = await Promise.all([
      fetchTournament(id),
      fetchTournamentBracket(id).catch(() => null),
    ])
    const payload = (detail || {}) as Record<string, unknown>
    const t = (payload.tournament as Tournament) || (payload as unknown as Tournament)
    if (t && typeof t === 'object' && (t as Tournament).id) {
      detailTournament.value = t as Tournament
    } else {
      const fromList = items.value.find((x) => x.id === id)
      detailTournament.value = fromList || null
    }
    registrations.value = Array.isArray(payload.registrations)
      ? (payload.registrations as RegRow[])
      : []
    if (typeof payload.canRegister === 'boolean') canRegisterFlag.value = payload.canRegister
    if (typeof payload.canCheckIn === 'boolean') canCheckInFlag.value = payload.canCheckIn
    registeredByMe.value = !!(
      payload.registeredByMe ??
      detailTournament.value?.registeredByMe
    )
    checkedInByMe.value = !!payload.checkedInByMe
    if (payload.checkedInCount != null) checkedInCount.value = Number(payload.checkedInCount)

    if (bracket && typeof bracket === 'object') {
      bracketRaw.value = bracket as Record<string, unknown>
    } else if (payload.bracket && typeof payload.bracket === 'object') {
      bracketRaw.value = payload.bracket as Record<string, unknown>
    } else {
      bracketRaw.value = { matches: [] }
    }
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

async function doRegister() {
  if (!selected.value) return
  if (!auth.isLoggedIn) {
    window.alert('请先登录')
    return
  }
  acting.value = true
  try {
    await registerTournament(selected.value.id)
    await loadList()
    if (selectedId.value) await loadDetail(selectedId.value)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '报名失败')
  } finally {
    acting.value = false
  }
}

async function doUnregister() {
  if (!selected.value) return
  if (!confirm('确认取消报名？')) return
  acting.value = true
  try {
    await unregisterTournament(selected.value.id)
    await loadList()
    if (selectedId.value) await loadDetail(selectedId.value)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '取消失败')
  } finally {
    acting.value = false
  }
}

async function doCheckIn() {
  if (!selected.value) return
  if (!auth.isLoggedIn) {
    window.alert('请先登录')
    return
  }
  acting.value = true
  try {
    await checkInTournament(selected.value.id)
    window.alert('签到成功')
    await loadList()
    if (selectedId.value) await loadDetail(selectedId.value)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '签到失败')
  } finally {
    acting.value = false
  }
}

watch(selectedId, (id) => {
  if (id != null) loadDetail(id)
})

onMounted(loadList)
</script>
