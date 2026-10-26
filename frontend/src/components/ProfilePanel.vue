<template>
  <section id="profile" class="page page-profile active" aria-labelledby="profileHomeHeading">
    <div class="profile-page-wrap">
      <div
        class="profile-cover"
        :class="{ 'has-image': !!coverUrl }"
        :style="coverUrl ? { backgroundImage: 'url(' + coverUrl + ')' } : undefined"
      >
        <div v-if="!coverUrl" class="profile-cover-placeholder">
          <i class="fas fa-image" aria-hidden="true"></i>
          <span>暂无背景图片</span>
        </div>
      </div>
      <div class="profile-page-body">
        <div class="profile-identity">
          <div class="profile-identity-top">
            <img class="profile-page-avatar" :src="avatarUrl" alt="头像" />
            <div v-if="isOwnProfile" class="profile-page-actions">
              <button type="button" class="btn btn-primary" @click="editOpen = true">
                <i class="fas fa-user-edit"></i> 编辑个人资料
              </button>
            </div>
          </div>
          <div class="profile-identity-meta">
            <h1 class="profile-page-nickname" :class="adminNameClass(displayUser)">{{ nickname }}</h1>
            <p class="profile-page-username">@{{ username }}</p>
            <p class="profile-page-bio">{{ bio }}</p>
            <div class="profile-page-facts">
              <span>性别 {{ genderText }}</span>
              <span>年龄 {{ ageText }}</span>
              <span>生日 {{ birthdayText }}</span>
            </div>
          </div>
        </div>

        <section class="profile-home" aria-labelledby="profileHomeHeading">
          <div class="profile-home-tabs profile-section-tabs" role="tablist" aria-label="主页分区">
            <button
              type="button"
              class="profile-home-tab"
              :class="{ 'is-active': section === 'home' }"
              role="tab"
              :aria-selected="section === 'home'"
              @click="setSection('home')"
            >
              主页
            </button>
            <button
              type="button"
              class="profile-home-tab"
              :class="{ 'is-active': section === 'data' }"
              role="tab"
              :aria-selected="section === 'data'"
              @click="setSection('data')"
            >
              数据
            </button>
          </div>

          <!-- 主页：与老站 profile-home 一致 -->
          <div v-show="section === 'home'" class="profile-section-home">
            <header class="profile-home-header">
              <h2 id="profileHomeHeading" class="profile-home-title">主页</h2>
              <p v-if="isOwnProfile" class="profile-home-desc">你发布的资讯、连招等作品</p>
            </header>
            <div class="profile-home-tabs" role="tablist" aria-label="主页内容">
              <button
                type="button"
                class="profile-home-tab"
                :class="{ 'is-active': tab === 'articles' }"
                role="tab"
                :aria-selected="tab === 'articles'"
                @click="tab = 'articles'"
              >
                资讯 <span class="profile-home-tab-count">{{ articles.length }}</span>
              </button>
              <button
                type="button"
                class="profile-home-tab"
                :class="{ 'is-active': tab === 'combos' }"
                role="tab"
                :aria-selected="tab === 'combos'"
                @click="tab = 'combos'"
              >
                连招 <span class="profile-home-tab-count">{{ combos.length }}</span>
              </button>
              <button
                type="button"
                class="profile-home-tab"
                :class="{ 'is-active': tab === 'tournaments' }"
                role="tab"
                :aria-selected="tab === 'tournaments'"
                @click="tab = 'tournaments'"
              >
                比赛 <span class="profile-home-tab-count">{{ history.length }}</span>
              </button>
            </div>
            <div class="profile-home-panels">
              <div class="profile-home-panel" :class="{ 'is-active': tab === 'articles' }" role="tabpanel" :hidden="tab !== 'articles'">
                <div class="profile-works-list">
                  <div v-if="loading" class="profile-works-empty">加载中…</div>
                  <div v-else-if="error" class="profile-works-empty">{{ error }}</div>
                  <div v-else-if="!articles.length" class="profile-works-empty">
                    <div class="profile-works-empty-title">还没有资讯作品</div>
                    <p v-if="isOwnProfile" class="profile-works-empty-desc">去资讯页发布后，会出现在这里</p>
                  </div>
                  <article
                    v-for="a in articles"
                    :key="a.id"
                    class="profile-work-card"
                    role="button"
                    tabindex="0"
                    @click="openArticleDetail(a.id)"
                    @keydown.enter.prevent="openArticleDetail(a.id)"
                    @keydown.space.prevent="openArticleDetail(a.id)"
                  >
                    <div class="profile-work-cover">
                      <img v-if="articleCover(a)" :src="articleCover(a)" alt="" loading="lazy" />
                      <div v-else class="profile-work-cover-fallback" aria-hidden="true"><i class="fas fa-image"></i></div>
                    </div>
                    <div class="profile-work-body">
                      <h3 class="profile-work-title">{{ a.title || '无标题' }}</h3>
                      <p v-if="a.summary" class="profile-work-summary">{{ a.summary }}</p>
                      <p class="profile-work-meta">{{ fmt(a.createdAt || a.created_at) }} · {{ a.viewCount ?? a.view_count ?? 0 }} 阅读</p>
                    </div>
                  </article>
                </div>
              </div>
              <div class="profile-home-panel" :class="{ 'is-active': tab === 'combos' }" role="tabpanel" :hidden="tab !== 'combos'">
                <div class="profile-works-list">
                  <div v-if="loading" class="profile-works-empty">加载中…</div>
                  <div v-else-if="!combos.length" class="profile-works-empty">
                    <div class="profile-works-empty-title">还没有连招作品</div>
                    <p v-if="isOwnProfile" class="profile-works-empty-desc">去角色页发布连招后，会出现在这里</p>
                  </div>
                  <article
                    v-for="c in combos"
                    :key="c.id"
                    class="profile-work-card profile-work-card--combo"
                    role="button"
                    tabindex="0"
                    :class="{ 'is-clickable': !!comboVideo(c) }"
                    @click="openComboVideo(c)"
                    @keydown.enter.prevent="openComboVideo(c)"
                    @keydown.space.prevent="openComboVideo(c)"
                  >
                    <div class="profile-work-cover">
                      <img v-if="comboCover(c)" :src="comboCover(c)" alt="" loading="lazy" />
                      <div v-else class="profile-work-cover-fallback" aria-hidden="true"><span>连招</span></div>
                      <span v-if="comboVideo(c)" class="profile-work-play" aria-hidden="true"></span>
                    </div>
                    <div class="profile-work-body">
                      <h3 class="profile-work-title">{{ c.title || '未命名连招' }}</h3>
                      <p class="profile-work-meta">{{ comboMeta(c) }}</p>
                    </div>
                  </article>
                </div>
              </div>
              <div class="profile-home-panel" :class="{ 'is-active': tab === 'tournaments' }" role="tabpanel" :hidden="tab !== 'tournaments'">
                <div class="profile-works-list">
                  <div v-if="histLoading" class="profile-works-empty">加载中…</div>
                  <div v-else-if="!history.length" class="profile-works-empty">暂无比赛记录</div>
                  <div v-for="(h, i) in history" :key="i" class="profile-works-item">
                    <div class="profile-works-item-title">{{ histTitle(h) }}</div>
                    <div class="profile-works-item-meta">{{ histMeta(h) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据：与老站 page-data 内容一致 -->
          <div v-show="section === 'data'" class="profile-section-data data-page-wrap">
            <header class="data-page-header">
              <div class="data-page-header-text">
                <h1 class="data-page-title">数据</h1>
                <p class="data-page-desc">已绑定的 Steam 账号与游戏数据</p>
              </div>
              <button
                v-if="steamBound && isOwnProfile"
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
              <div v-if="steamBound" class="data-steam-bound">
                <div class="data-profile-card">
                  <img class="data-steam-avatar" :src="steamAvatar || '/images/CSel3_LargePortTianhuo.png'" alt="Steam 头像" />
                  <div class="data-steam-meta">
                    <div class="data-steam-name">{{ steamName || 'Steam' }}</div>
                    <div class="data-steam-chips">
                      <span class="data-chip"><span class="data-chip-label">等级</span> <strong>{{ steamLevel != null ? steamLevel : '—' }}</strong></span>
                      <span class="data-chip"><span class="data-chip-label">好友代码</span> <strong>{{ friendCode || '—' }}</strong></span>
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
                    <span class="data-achv-count">{{ achCountLabel }}</span>
                  </header>
                  <div class="data-achievements-list">
                    <div v-if="steamLoading" class="achv-empty">加载中…</div>
                    <template v-else-if="!sortedAchievements.length">
                      <div class="achv-empty">暂无成就数据</div>
                    </template>
                    <template v-else>
                      <div class="achv-summary">
                        <span>{{ achCountLabel || ("共 " + sortedAchievements.length + " 项") }}</span>
                        <button
                          v-if="sortedAchievements.length > dataAchvLimit"
                          type="button"
                          class="achv-toggle"
                          @click="dataAchvExpanded = !dataAchvExpanded"
                        >
                          {{ dataAchvExpanded ? '收起' : '展开全部' }}
                        </button>
                      </div>
                      <div class="achv-list">
                        <div
                          v-for="(a, i) in visibleAchievements"
                          :key="achKey(a, i)"
                          class="achv-item"
                          :class="isAchieved(a) ? 'achv-item--achieved' : 'achv-item--locked'"
                        >
                          <img v-if="achIcon(a)" class="achv-icon" :src="achIcon(a)" alt="" />
                          <div v-else class="achv-icon" aria-hidden="true"></div>
                          <div class="achv-meta">
                            <div class="achv-name">{{ achName(a) }}</div>
                            <div v-if="achDesc(a)" class="achv-desc">{{ achDesc(a) }}</div>
                            <div class="achv-unlock">{{ achUnlockStatus(a) }}</div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </section>
              </div>
              <div v-else class="data-steam-unbound">
                <div class="data-unbound-card">
                  <i class="fab fa-steam" aria-hidden="true"></i>
                  <p>{{ isOwnProfile ? '尚未绑定 Steam 账号' : '对方未绑定 Steam' }}</p>
                  <button v-if="isOwnProfile" type="button" class="btn btn-primary" @click="emit('open-settings')">去设置绑定</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>

    <!-- 资讯详情 -->
    <div
      v-if="articleDetailOpen"
      id="profileArticleModal"
      class="modal"
      style="display:block"
      @click.self="closeArticleDetail"
    >
      <div class="modal-content modal-large article-modal-content">
        <div class="modal-header">
          <h3>{{ articleDetail?.title || '资讯详情' }}</h3>
          <button type="button" class="modal-close" @click="closeArticleDetail">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body article-modal-body">
          <p v-if="articleDetailLoading" class="room-empty" style="padding:24px">加载中…</p>
          <p v-else-if="articleDetailError" class="room-empty" style="padding:24px">{{ articleDetailError }}</p>
          <div v-else-if="articleDetail" class="article-modal-split">
            <aside class="article-modal-pane article-modal-pane--comments" aria-label="评论">
              <div class="article-comments-section article-comments-section--pane">
                <h4 class="comments-title">评论</h4>
                <div class="comment-list">
                  <div class="room-empty" style="padding:8px 0;opacity:0.7">在资讯页打开可评论</div>
                </div>
              </div>
            </aside>
            <div class="article-modal-pane article-modal-pane--article" aria-label="资讯正文">
              <div class="article-detail">
                <div
                  class="article-detail-cover-wrap"
                  :class="{ 'article-detail-cover-wrap--empty': !articleCover(articleDetail) }"
                >
                  <div
                    v-if="articleCover(articleDetail)"
                    class="article-detail-cover-bg"
                    :style="{ backgroundImage: 'url(' + articleCover(articleDetail) + ')' }"
                    aria-hidden="true"
                  ></div>
                  <div
                    v-else
                    class="article-detail-cover-bg article-detail-cover-bg--empty"
                    aria-hidden="true"
                  ></div>
                  <img
                    v-if="articleCover(articleDetail)"
                    class="article-detail-cover-img"
                    :src="articleCover(articleDetail)"
                    :alt="articleDetail.title || ''"
                  />
                  <div class="article-detail-glassbar">
                    <div class="article-detail-author">
                      <div class="article-detail-author-text">
                        <div class="article-detail-author-name" :class="adminNameClass(articleDetail)">{{ articleDetail.author || nickname || '匿名' }}</div>
                        <div
                          v-if="fmt(articleDetail.createdAt || articleDetail.created_at)"
                          class="article-detail-time"
                        >
                          <i class="far fa-clock"></i>
                          {{ fmt(articleDetail.createdAt || articleDetail.created_at) }}
                        </div>
                      </div>
                    </div>
                    <div class="article-detail-title-wrap">
                      <h2 class="article-detail-title-right">{{ articleDetail.title }}</h2>
                    </div>
                  </div>
                </div>
                <div v-if="articleDetail.summary" class="article-detail-summary">{{ articleDetail.summary }}</div>
                <div class="article-detail-content" v-html="formatArticleContentHtml(articleDetail.content)"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 连招视频 -->
    <div v-if="comboVideoOpen" class="modal" style="display:block;z-index:1100" @click.self="closeComboVideo">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ comboVideoTitle }}</h3>
          <button type="button" class="modal-close" @click="closeComboVideo"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="combo-video-player-wrap">
            <video
              class="combo-video-player"
              :src="comboVideoSrc"
              controls
              autoplay
              preload="metadata"
              playsinline
              style="width:100%;max-height:70vh"
            ></video>
          </div>
        </div>
      </div>
    </div>

    <EditProfileModal
      :open="editOpen"
      :profile="editProfileSource"
      @close="editOpen = false"
      @saved="onProfileSaved"
    />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchArticle, fetchArticles, fetchMyArticles } from '@/api/articles'
import { fetchMyTournamentHistory } from '@/api/tournaments'
import {
  fetchCombosByUser,
  fetchMyCombos,
  fetchPublicProfile,
  fetchSteamAchievements,
  fetchSteamPlaytime,
  fetchUserProfile,
  type ComboItem,
  type UserProfile,
} from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError, type Article } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'
import { formatArticleContentHtml } from '@/utils/contentHtml'
import { getSelfUserId } from '@/utils/playerProfile'
import EditProfileModal from '@/components/EditProfileModal.vue'

const emit = defineEmits<{ 'open-settings': [] }>()
const auth = useUserAuthStore()
const route = useRoute()
const router = useRouter()
const editOpen = ref(false)
const otherProfile = ref<UserProfile | null>(null)
const viewingUserId = computed(() => {
  const p = route.params.userId
  if (p == null || p === '') return null
  const n = Number(Array.isArray(p) ? p[0] : p)
  return !Number.isNaN(n) && n > 0 ? n : null
})
const isOwnProfile = computed(() => {
  const vid = viewingUserId.value
  if (vid == null) return true
  const self = getSelfUserId()
  return self != null && String(self) === String(vid)
})
const displayUser = computed(() => {
  if (!isOwnProfile.value && otherProfile.value) return otherProfile.value
  return auth.user
})
const editProfileSource = computed(() => (auth.user || {}) as UserProfile)

const section = ref<'home' | 'data'>('home')
const tab = ref<'articles' | 'combos' | 'tournaments'>('articles')
const articles = ref<Article[]>([])
const combos = ref<ComboItem[]>([])
const history = ref<unknown[]>([])
const loading = ref(false)
const histLoading = ref(false)
const error = ref('')
const profileCover = ref('')
const profileBio = ref('')
const gender = ref('')
const birthday = ref('')

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
const steamLoaded = ref(false)

const nickname = computed(() => {
  const u = displayUser.value as Record<string, unknown> | null
  return String(u?.nickname || u?.username || '昵称')
})
const username = computed(() => {
  const u = displayUser.value as Record<string, unknown> | null
  return String(u?.username || 'username')
})
const avatarUrl = computed(() => {
  const u = displayUser.value as Record<string, unknown> | null
  return String(u?.avatarUrl || '/images/CSel3_LargePortTianhuo.png')
})
const coverUrl = computed(() => profileCover.value || String((displayUser.value as { coverUrl?: string } | null)?.coverUrl || ''))
const bio = computed(() => {
  const s = profileBio.value || String((displayUser.value as { signature?: string } | null)?.signature || '')
  return s.trim() ? s : '这个人很懒，什么都没写'
})
const genderText = computed(() => (gender.value && gender.value.trim()) || '保密')
const ageText = computed(() => {
  const age = calcAgeFromBirthday(birthday.value)
  return age != null ? String(age) : '保密'
})
const birthdayText = computed(() => formatBirthdayMonthDay(birthday.value) || '保密')
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

function calcAgeFromBirthday(bday?: string): number | null {
  if (!bday) return null
  const m = String(bday).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || !mo || !d) return null
  const now = new Date()
  let age = now.getFullYear() - y
  const md = now.getMonth() + 1
  const dd = now.getDate()
  if (md < mo || (md === mo && dd < d)) age -= 1
  return age >= 0 && age < 150 ? age : null
}
function formatBirthdayMonthDay(bday?: string): string {
  if (!bday) return ''
  const m = String(bday).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${Number(m[2])}月${Number(m[3])}日`
}

const articleDetailOpen = ref(false)
const articleDetailLoading = ref(false)
const articleDetailError = ref('')
const articleDetail = ref<Article | null>(null)
const comboVideoOpen = ref(false)
const comboVideoSrc = ref('')
const comboVideoTitle = ref('')

function articleCover(a: unknown) {
  const r = asRec(a)
  return String(r.coverUrl || r.cover_url || '')
}
function comboVideo(c: unknown) {
  const r = asRec(c)
  return String(r.videoUrl || r.video_url || '')
}
function comboCover(c: unknown) {
  const r = asRec(c)
  return String(r.coverUrl || r.cover_url || r.thumbnailUrl || r.thumbnail_url || '')
}
function comboMeta(c: unknown) {
  const r = asRec(c)
  const bits: string[] = []
  const ch = String(r.characterName || r.character_name || '')
  if (ch) bits.push(ch)
  const created = fmt(String(r.createdAt || r.created_at || ''))
  if (created) bits.push(created)
  return bits.join(' · ')
}
async function openArticleDetail(id: number | string) {
  if (id == null || id === '') return
  articleDetailOpen.value = true
  articleDetail.value = null
  articleDetailError.value = ''
  articleDetailLoading.value = true
  try {
    articleDetail.value = await fetchArticle(id)
  } catch (e) {
    articleDetailError.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    articleDetailLoading.value = false
  }
}
function closeArticleDetail() {
  articleDetailOpen.value = false
}
function openComboVideo(c: unknown) {
  const url = comboVideo(c)
  if (!url) return
  const r = asRec(c)
  comboVideoSrc.value = url
  comboVideoTitle.value = String(r.title || '连招视频')
  comboVideoOpen.value = true
}
function closeComboVideo() {
  comboVideoOpen.value = false
  comboVideoSrc.value = ''
}

function fmt(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}
function asRec(v: unknown) {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
}
function histTitle(h: unknown) {
  const r = asRec(h)
  return String(r.title || r.tournamentTitle || r.name || '比赛 #' + (r.tournamentId || r.id || ''))
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
const dataAchvExpanded = ref(true)
const dataAchvLimit = 24
const achTotalFromApi = ref(0)
const achAchievedFromApi = ref(0)

const achCountLabel = computed(() => {
  const listTotal = sortedAchievements.value.length
  const listGot = sortedAchievements.value.filter((a) => isAchieved(a)).length
  const apiTotal = Number(achTotalFromApi.value || 0) || Number(achTotal.value || 0)
  const rawGot = achAchievedFromApi.value > 0 ? achAchievedFromApi.value : achCount.value
  const apiGot = rawGot == null ? null : Number(rawGot)
  const total = apiTotal > 0 ? apiTotal : listTotal
  const got = apiGot != null && !Number.isNaN(apiGot) ? apiGot : listGot
  if (!steamBound.value && !total) return ''
  return `已获得 ${got}/${total || 0}`
})

const sortedAchievements = computed(() => {
  const raw = achievements.value.slice()
  raw.sort((a, b) => {
    const aAch = isAchieved(a) ? 1 : 0
    const bAch = isAchieved(b) ? 1 : 0
    if (aAch !== bAch) return bAch - aAch
    const aKey = achName(a)
    const bKey = achName(b)
    return aKey.localeCompare(bKey, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
  })
  return raw
})

const visibleAchievements = computed(() =>
  dataAchvExpanded.value ? sortedAchievements.value : sortedAchievements.value.slice(0, dataAchvLimit),
)

function isAchieved(a: unknown) {
  const r = asRec(a)
  if ('achieved' in r) return !!(r.achieved === 1 || r.achieved === true || r.achieved === '1')
  return !!(r.unlockTime || r.unlocktime)
}
function achKey(a: unknown, i: number) {
  const r = asRec(a)
  return String(r.apiName || r.name || i)
}
function achIcon(a: unknown) {
  const r = asRec(a)
  if (isAchieved(a)) return String(r.icon || r.iconGray || r.icongray || '')
  return String(r.iconGray || r.icongray || r.icon || '')
}
function achName(a: unknown) {
  const r = asRec(a)
  return String(r.displayName || r.name || r.apiName || '未知成就')
}
function achDesc(a: unknown) {
  const r = asRec(a)
  return String(r.desc || r.description || '').trim()
}
function formatSteamUnlockTime(unlockTime: unknown) {
  if (unlockTime == null || unlockTime === '' || Number(unlockTime) <= 0) return ''
  const n = Number(unlockTime)
  if (!Number.isFinite(n) || n <= 0) return ''
  const d = new Date(n > 1e12 ? n : n * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}
function achUnlockStatus(a: unknown) {
  if (!isAchieved(a)) return '未解锁'
  const r = asRec(a)
  const unlock = formatSteamUnlockTime(r.unlockTime ?? r.unlocktime)
  return unlock ? `解锁于 ${unlock}` : '已解锁'
}

function setSection(kind: 'home' | 'data') {
  section.value = kind
  const q = { ...route.query } as Record<string, string>
  if (kind === 'data') q.section = 'data'
  else delete q.section
  // Keep profile-user/:userId when viewing someone else — do not jump to own /profile
  router.replace({
    name: route.name === 'profile-user' ? 'profile-user' : 'profile',
    params: route.name === 'profile-user' ? { ...route.params } : {},
    query: q,
  })
  if (kind === 'data' && isOwnProfile.value && steamBound.value && !steamLoaded.value) refreshSteam()
}

function syncSectionFromRoute() {
  section.value = route.query.section === 'data' ? 'data' : 'home'
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

async function refreshSteam(force = false) {
  if (!steamBound.value) return
  // Self Steam APIs only; other profiles use public profile fields
  if (!isOwnProfile.value) {
    steamLoaded.value = true
    return
  }
  steamLoading.value = true
  steamError.value = ''
  try {
    const [pt, ach] = await Promise.all([
      fetchSteamPlaytime(force).catch(() => null),
      fetchSteamAchievements(force).catch(() => null),
    ])
    const ptr = asRec(pt)
    if (ptr.playtimeMinutes != null) playtimeMinutes.value = Number(ptr.playtimeMinutes)
    else if (ptr.playtime_minutes != null) playtimeMinutes.value = Number(ptr.playtime_minutes)
    else if (ptr.playtimeForever != null) playtimeMinutes.value = Number(ptr.playtimeForever)
    if (ptr.steamLevel != null) steamLevel.value = Number(ptr.steamLevel)
    if (ptr.level != null) steamLevel.value = Number(ptr.level)
    if (ptr.friendCode != null) friendCode.value = String(ptr.friendCode)
    if (ptr.personaName != null) steamName.value = String(ptr.personaName)
    if (ptr.avatarUrl != null) steamAvatar.value = String(ptr.avatarUrl)
    if (ptr.avatarfull != null) steamAvatar.value = String(ptr.avatarfull)

    const ar = asRec(ach)
    if (ar.total != null) {
      achTotalFromApi.value = Number(ar.total)
      achTotal.value = Number(ar.total)
    }
    if (ar.achieved != null) {
      achAchievedFromApi.value = Number(ar.achieved)
      achCount.value = Number(ar.achieved)
    }
    const list = (ar.achievements || ar.list || ach) as unknown
    if (Array.isArray(list)) achievements.value = list as Record<string, unknown>[]
    else if (Array.isArray(ar.achievedList)) achievements.value = ar.achievedList as Record<string, unknown>[]
    else achievements.value = []
    if (ar.count != null && achCount.value == null) achCount.value = Number(ar.count)
    if (!(achTotalFromApi.value > 0) && achievements.value.length) {
      achTotalFromApi.value = achievements.value.length
      achTotal.value = achievements.value.length
    }
    if (!(achAchievedFromApi.value > 0) && achievements.value.length) {
      const gotNow = achievements.value.filter((a) => {
        const r = asRec(a)
        return !!(r.achieved === 1 || r.achieved === true || r.achieved === '1' || r.unlockTime || r.unlocktime)
      }).length
      achAchievedFromApi.value = gotNow
      achCount.value = gotNow
    }
    steamLoaded.value = true
  } catch (e) {
    steamError.value = e instanceof ApiError ? e.message : 'Steam 数据加载失败'
  } finally {
    steamLoading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!isOwnProfile.value && viewingUserId.value != null) {
      otherProfile.value = null
      profileCover.value = ''
      profileBio.value = ''
      gender.value = ''
      birthday.value = ''
      steamBound.value = false
      const p = await fetchPublicProfile(viewingUserId.value)
      otherProfile.value = p
      if (p.coverUrl) profileCover.value = String(p.coverUrl)
      if (p.signature) profileBio.value = String(p.signature)
      gender.value = String(p.gender || '')
      birthday.value = normalizeBday(p.birthday)
      const pr = p as Record<string, unknown>
      steamBound.value = !!(p.steamId || pr.steam_id || pr.steamId)
      steamName.value = String(p.steamName || pr.steamPersonaName || pr.steam_persona_name || '')
      steamAvatar.value = String(pr.steamAvatarUrl || pr.steam_avatar_url || p.avatarUrl || '')
      if (pr.steamLevel != null || pr.steam_level != null) {
        steamLevel.value = Number(pr.steamLevel ?? pr.steam_level)
      } else {
        steamLevel.value = null
      }
      if (pr.steamPlaytimeMinutes != null || pr.steam_playtime_minutes != null) {
        playtimeMinutes.value = Number(pr.steamPlaytimeMinutes ?? pr.steam_playtime_minutes)
      } else {
        playtimeMinutes.value = null
      }
      if (pr.steamAchievementsCount != null || pr.steam_achievements_count != null) {
        achCount.value = Number(pr.steamAchievementsCount ?? pr.steam_achievements_count)
      } else {
        achCount.value = null
      }
      if (pr.steamAchievementsTotal != null || pr.steam_achievements_total != null) {
        achTotal.value = Number(pr.steamAchievementsTotal ?? pr.steam_achievements_total)
      } else {
        achTotal.value = null
      }
      friendCode.value = String(pr.friendCode || pr.friend_code || '')
      achievements.value = []
      steamLoaded.value = true
      const uid = viewingUserId.value
      const [allArts, c] = await Promise.all([
        fetchArticles().catch(() => [] as Article[]),
        fetchCombosByUser(uid).catch(() => [] as ComboItem[]),
      ])
      articles.value = (Array.isArray(allArts) ? allArts : []).filter((a) => {
        const r = a as Record<string, unknown>
        const aid = r.authorId ?? r.author_id ?? r.userId ?? r.user_id
        return aid != null && String(aid) === String(uid)
      })
      combos.value = Array.isArray(c) ? c : []
      history.value = []
      return
    }

    otherProfile.value = null
    try {
      const p = await fetchUserProfile()
      if (p.coverUrl) profileCover.value = String(p.coverUrl)
      if (p.signature) profileBio.value = String(p.signature)
      gender.value = String(p.gender || '')
      birthday.value = normalizeBday(p.birthday)
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
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw) as Record<string, unknown>
        Object.assign(u, {
          nickname: p.nickname ?? u.nickname,
          avatarUrl: p.avatarUrl ?? u.avatarUrl,
          email: p.email ?? u.email,
          coverUrl: p.coverUrl ?? u.coverUrl,
          signature: p.signature ?? u.signature,
          gender: p.gender ?? u.gender,
          birthday: p.birthday ?? u.birthday,
          steamId: p.steamId ?? u.steamId,
          steamName: steamName.value || u.steamName,
          role: (p as { role?: string }).role ?? u.role,
          isAdmin: (p as { isAdmin?: boolean }).isAdmin ?? u.isAdmin,
        })
        localStorage.setItem('user', JSON.stringify(u))
        auth.hydrate()
      }
    } catch {
      const u = auth.user as Record<string, unknown> | null
      gender.value = String(u?.gender || '')
      birthday.value = normalizeBday(u?.birthday)
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
    if (section.value === 'data' && steamBound.value) await refreshSteam()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function normalizeBday(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v) && v.length >= 3) {
    return `${v[0]}-${String(v[1]).padStart(2, '0')}-${String(v[2]).padStart(2, '0')}`
  }
  return String(v).slice(0, 10)
}

function onProfileSaved(p: UserProfile) {
  if (p.coverUrl != null) profileCover.value = String(p.coverUrl || '')
  if (p.signature != null) profileBio.value = String(p.signature || '')
  gender.value = String(p.gender || '')
  birthday.value = normalizeBday(p.birthday)
  auth.hydrate()
}

watch(() => route.query.section, syncSectionFromRoute)
watch(
  () => route.params.userId,
  () => {
    load()
  },
)
onMounted(() => {
  syncSectionFromRoute()
  load()
})
defineExpose({ reload: load })
</script>

<style scoped>
.profile-cover.has-image {
  background-size: cover;
  background-position: center;
}
.profile-section-tabs {
  margin-bottom: 18px;
}
.profile-section-data {
  max-width: none;
  margin: 0;
  padding: 0;
}
.profile-section-data .data-page-header {
  margin-top: 4px;
}

.profile-work-card {
  cursor: pointer;
}
.profile-work-card--combo:not(.is-clickable) {
  cursor: default;
}
</style>