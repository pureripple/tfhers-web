<template>
  <section class="page page-news active">
    <div class="hot-news-hero">
      <div class="news-page-wrap hot-news-hero-inner">
        <div class="hot-news-split">
          <div class="hot-news-split-main">
            <h2 class="hot-news-block-title">热门资讯</h2>
            <div class="hot-news-hero-body">
              <div v-if="hotItems.length" class="hot-news-wrap">
                <div class="hot-news-carousel">
                  <button type="button" class="hot-news-nav hot-news-nav-prev" aria-label="上一条" @click="stepHot(-1)">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <div class="hot-news-slider-outer">
                    <div class="hot-news-slider">
                      <article
                        class="article-card article-card--glass"
                        @click="openDetail(hotItems[hotIndex].id)"
                      >
                        <div class="article-card-media">
                          <img
                            v-if="coverOf(hotItems[hotIndex])"
                            class="article-cover"
                            :src="coverOf(hotItems[hotIndex])"
                            alt=""
                          />
                          <div v-else class="article-cover-placeholder" style="display:flex">
                            <i class="fas fa-image"></i>
                            <span>暂无图片</span>
                          </div>
                          <div class="article-card-glass">
                            <div class="article-card-author">
                              <div class="article-card-author-meta">
                                <span class="article-author-name">{{ hotItems[hotIndex].author || '匿名' }}</span>
                              </div>
                            </div>
                            <h3 class="article-title article-card-title">{{ hotItems[hotIndex].title || '无标题' }}</h3>
                            <p class="article-excerpt article-card-summary">{{ hotItems[hotIndex].summary || '暂无摘要' }}</p>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                  <button type="button" class="hot-news-nav hot-news-nav-next" aria-label="下一条" @click="stepHot(1)">
                    <i class="fas fa-chevron-right"></i>
                  </button>
                </div>
                <div class="hot-news-dots">
                  <button
                    v-for="(a, i) in hotItems"
                    :key="a.id"
                    type="button"
                    class="hot-news-dot"
                    :class="{ active: i === hotIndex }"
                    :aria-label="'第 ' + (i + 1) + ' 条'"
                    @click="hotIndex = i"
                  ></button>
                </div>
              </div>
              <p v-else-if="!loading" class="vue-state">暂无热门</p>
            </div>
          </div>
          <div class="hot-news-split-divider" role="separator" aria-hidden="true"></div>
          <aside class="hot-news-split-pinned" aria-label="置顶资讯">
            <h2 class="hot-news-block-title hot-news-block-title--pinned">
              <i class="fas fa-thumbtack" aria-hidden="true"></i> 置顶资讯
            </h2>
            <div class="pinned-news-list">
              <div v-if="!pinnedItems.length" class="pinned-news-empty">暂无置顶</div>
              <div
                v-for="a in pinnedItems"
                :key="'pin-' + a.id"
                class="pinned-news-item"
                role="button"
                tabindex="0"
                @click="openDetail(a.id)"
                @keyup.enter="openDetail(a.id)"
              >
                <div class="pinned-news-text">
                  <div class="pinned-news-item-title">{{ a.title || '无标题' }}</div>
                  <div class="pinned-news-item-meta">{{ a.author || '匿名' }} · {{ dateOf(a) }}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <div class="news-page-wrap news-latest-wrap">
      <div class="news-latest-bar">
        <h2 class="news-latest-title">最新资讯</h2>
        <div class="news-latest-search">
          <label class="hot-news-sr-only" for="vueArticleSearch">搜索资讯</label>
          <div class="hot-news-search-wrap">
            <i class="fas fa-search hot-news-search-icon" aria-hidden="true"></i>
            <input
              id="vueArticleSearch"
              v-model.trim="keyword"
              type="search"
              class="hot-news-search-input"
              placeholder="搜索标题、摘要、作者"
              autocomplete="off"
              enterkeyhint="search"
            />
            <button
              v-if="keyword"
              type="button"
              class="hot-news-search-clear"
              aria-label="清除搜索"
              @click="keyword = ''"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <p v-if="loading" class="vue-state">加载中…</p>
      <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
      <p v-else-if="!filteredItems.length" class="vue-state">暂无资讯</p>
      <div v-else class="articles-grid">
        <article
          v-for="item in filteredItems"
          :key="item.id"
          class="article-card article-card--glass"
          @click="openDetail(item.id)"
        >
          <div class="article-card-media">
            <img v-if="coverOf(item)" class="article-cover" :src="coverOf(item)" alt="" />
            <div v-else class="article-cover-placeholder" style="display:flex">
              <i class="fas fa-image"></i>
              <span>暂无图片</span>
            </div>
            <div class="article-card-glass">
              <div class="article-card-author">
                <div class="article-card-author-meta">
                  <span class="article-author-name">{{ item.author || '匿名' }}</span>
                  <time v-if="dateOf(item)" class="article-card-time">{{ dateOf(item) }}</time>
                </div>
              </div>
              <h3 class="article-title article-card-title">
                <span v-if="isPinned(item)" class="badge" style="margin-right:6px">置顶</span>
                {{ item.title || '无标题' }}
              </h3>
              <p class="article-excerpt article-card-summary">{{ item.summary || '暂无摘要' }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-if="detailOpen" class="vue-drawer-mask" @click.self="closeDetail">
      <aside class="vue-drawer">
        <header class="vue-drawer-head">
          <h2>{{ detail?.title || '资讯详情' }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="closeDetail">关闭</button>
        </header>
        <p v-if="detailLoading" class="vue-state">加载中…</p>
        <p v-else-if="detailError" class="vue-state vue-state-error">{{ detailError }}</p>
        <template v-else-if="detail">
          <p class="vue-detail-meta">
            <span>{{ detail.author || '匿名' }}</span>
            <span>{{ dateOf(detail) }}</span>
            <span>阅读 {{ viewsOf(detail) }}</span>
          </p>
          <img v-if="coverOf(detail)" class="vue-detail-cover" :src="coverOf(detail)" alt="" />
          <div class="vue-detail-content">{{ detail.content || detail.summary || '暂无正文' }}</div>
        </template>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchArticle, fetchArticles } from '@/api/articles'
import { ApiError, type Article } from '@/api/types'

const items = ref<Article[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const hotIndex = ref(0)

const detailOpen = ref(false)
const detail = ref<Article | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

function coverOf(a: Article) {
  return a.coverUrl || a.cover_url || ''
}
function dateOf(a: Article) {
  return a.createdAt || a.created_at || ''
}
function viewsOf(a: Article) {
  return a.viewCount ?? a.view_count ?? 0
}
function isPinned(a: Article) {
  return Number(a.isPinned ?? a.is_pinned ?? 0) === 1
}

const pinnedItems = computed(() => items.value.filter(isPinned).slice(0, 8))
const hotItems = computed(() => {
  const pinned = items.value.filter(isPinned)
  const rest = items.value.filter((a) => !isPinned(a))
  const pool = [...pinned, ...rest]
  return pool.slice(0, Math.min(5, pool.length))
})
const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((a) => {
    const hay = [a.title, a.summary, a.author, a.content].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })
})

function stepHot(delta: number) {
  const n = hotItems.value.length
  if (!n) return
  hotIndex.value = (hotIndex.value + delta + n) % n
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchArticles()
    items.value = Array.isArray(data) ? data : []
    hotIndex.value = 0
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资讯失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detailOpen.value = true
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await fetchArticle(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

onMounted(load)
</script>
