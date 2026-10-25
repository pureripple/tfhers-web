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
            <div class="profile-page-facts"></div>
          </div>
        </div>

        <section class="profile-home" aria-labelledby="profileHomeHeading">
          <header class="profile-home-header">
            <h2 id="profileHomeHeading" class="profile-home-title">主页</h2>
            <p class="profile-home-desc">发布的资讯与连段作品</p>
          </header>
          <div class="profile-home-tabs" role="tablist" aria-label="主页内容">
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'articles' }" role="tab" :aria-selected="tab === 'articles'" @click="tab = 'articles'">
              资讯 <span class="profile-home-tab-count">{{ articles.length }}</span>
            </button>
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'combos' }" role="tab" :aria-selected="tab === 'combos'" @click="tab = 'combos'">
              连段 <span class="profile-home-tab-count">{{ combos.length }}</span>
            </button>
            <button type="button" class="profile-home-tab" :class="{ 'is-active': tab === 'tournaments' }" role="tab" :aria-selected="tab === 'tournaments'" @click="tab = 'tournaments'">
              赛事 <span class="profile-home-tab-count">0</span>
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
                <div class="profile-works-empty">暂无赛事记录</div>
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
import { fetchMyCombos, fetchUserProfile, type ComboItem } from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError, type Article } from '@/api/types'

const emit = defineEmits<{ 'open-settings': [] }>()
const auth = useUserAuthStore()

const tab = ref<'articles' | 'combos' | 'tournaments'>('articles')
const articles = ref<Article[]>([])
const combos = ref<ComboItem[]>([])
const loading = ref(false)
const error = ref('')
const profileCover = ref('')
const profileBio = ref('')

const nickname = computed(() => auth.user?.nickname || auth.user?.username || '昵称')
const username = computed(() => auth.user?.username || 'username')
const avatarUrl = computed(() => auth.user?.avatarUrl || '/images/CSel3_LargePortTianhuo.png')
const coverUrl = computed(() => profileCover.value || (auth.user as { coverUrl?: string } | null)?.coverUrl || '')
const bio = computed(() => profileBio.value || (auth.user as { signature?: string } | null)?.signature || '')

function fmt(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    try {
      const p = await fetchUserProfile()
      if (p.coverUrl) profileCover.value = String(p.coverUrl)
      if (p.signature) profileBio.value = String(p.signature)
      if (p.nickname || p.avatarUrl || p.email) {
        auth.hydrate()
        const raw = localStorage.getItem('user')
        if (raw) {
          const u = JSON.parse(raw) as Record<string, unknown>
          Object.assign(u, {
            nickname: p.nickname ?? u.nickname,
            avatarUrl: p.avatarUrl ?? u.avatarUrl,
            email: p.email ?? u.email,
            coverUrl: p.coverUrl ?? u.coverUrl,
            signature: p.signature ?? u.signature,
          })
          localStorage.setItem('user', JSON.stringify(u))
          auth.hydrate()
        }
      }
    } catch {
      /* profile optional */
    }
    const [a, c] = await Promise.all([
      fetchMyArticles().catch(() => [] as Article[]),
      fetchMyCombos().catch(() => [] as ComboItem[]),
    ])
    articles.value = Array.isArray(a) ? a : []
    combos.value = Array.isArray(c) ? c : []
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
</style>
