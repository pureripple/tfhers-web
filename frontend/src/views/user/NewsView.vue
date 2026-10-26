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
                            
                          </div>
                          <div class="article-card-glass">
                            <div class="article-card-author">
                              <div class="article-card-author-meta">
                                <button type="button" class="article-author-name player-name-link" :class="adminNameClass(hotItems[hotIndex])" @click.stop="goPlayerProfile(router, null, hotItems[hotIndex])">{{ hotItems[hotIndex].author || '作者' }}</button>
                              </div>
                            </div>
                            <h3 class="article-title article-card-title">{{ hotItems[hotIndex].title || '无标题' }}</h3>
                            <p class="article-excerpt article-card-summary">{{ hotItems[hotIndex].summary || '' }}</p>
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
            </div>
          </div>
          <div class="hot-news-split-divider" role="separator" aria-hidden="true"></div>
          <aside class="hot-news-split-pinned" aria-label="置顶资讯">
            <h2 class="hot-news-block-title hot-news-block-title--pinned">
              <i class="fas fa-thumbtack" aria-hidden="true"></i> 置顶资讯
            </h2>
            <div class="pinned-news-list">
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
                  <div class="pinned-news-item-meta"><button type="button" class="player-name-link" :class="adminNameClass(a)" @click.stop="goPlayerProfile(router, null, a)">{{ a.author || '作者' }}</button> · {{ dateOf(a) }}</div>
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

      <p v-if="loading" class="room-empty">加载中…</p>
      <p v-else-if="error" class="room-empty">{{ error }}</p>
      <div v-else-if="filteredItems.length" class="articles-grid">
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
              
            </div>
            <div class="article-card-glass">
              <div class="article-card-author">
                <div class="article-card-author-meta">
                  <button type="button" class="article-author-name player-name-link" :class="adminNameClass(item)" @click.stop="goPlayerProfile(router, null, item)">{{ item.author || '作者' }}</button>
                  <time v-if="dateOf(item)" class="article-card-time">{{ dateOf(item) }}</time>
                </div>
              </div>
              <h3 class="article-title article-card-title">
                <span v-if="isPinned(item)" class="badge" style="margin-right:6px">置顶</span>
                {{ item.title || '无标题' }}
              </h3>
              <p class="article-excerpt article-card-summary">{{ item.summary || '' }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div
      v-if="detailOpen"
      id="articleModal"
      class="modal"
      style="display:block"
      @click.self="closeDetail"
    >
      <div class="modal-content modal-large article-modal-content">
        <div class="modal-header">
          <h3>{{ detail?.title || '资讯详情' }}</h3>
          <button type="button" class="modal-close" @click="closeDetail">
            <i class="fas fa-times"></i>
          </button>
          <div class="article-header-actions">
            <button
              type="button"
              class="article-header-action-btn"
              title="点赞"
              :disabled="acting || !detail"
              @click="onLike"
            >
              <i :class="liked ? 'fas fa-heart' : 'far fa-heart'"></i>
              <span class="article-header-like-count">{{ likeCount ?? 0 }}</span>
            </button>
            <button
              type="button"
              class="article-header-action-btn"
              title="举报"
              :disabled="acting || !detail"
              @click="onReport"
            >
              <i class="fas fa-exclamation"></i>
            </button>
          </div>
        </div>
        <div class="modal-body article-modal-body">
          <p v-if="detailLoading" class="room-empty" style="padding:24px">加载中…</p>
          <p v-else-if="detailError" class="room-empty" style="padding:24px">{{ detailError }}</p>
          <div v-else-if="detail" class="article-modal-split">
            <aside class="article-modal-pane article-modal-pane--comments" aria-label="评论">
              <div class="article-comments-section article-comments-section--pane">
                <h4 class="comments-title">评论</h4>
                <div class="article-comment-editor">
                  <div v-if="replyParentId" class="article-comment-reply-hint" style="margin-bottom:6px;font-size:13px;color:var(--text-muted)">
                    <span>回复 <span class="reply-hint-name">{{ replyToName || 'user' }}</span></span>
                    <button type="button" class="link-btn" style="margin-left:8px" @click="clearReply">取消</button>
                  </div>
                  <textarea
                    v-model.trim="commentText"
                    class="article-comment-textarea"
                    :placeholder="commentPlaceholder"
                    rows="3"
                  ></textarea>
                  <div class="article-comment-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <input ref="commentImageInput" type="file" accept="image/*" style="display:none" @change="onCommentImage" />
                    <button type="button" class="btn btn-outline btn-sm" :disabled="acting || !auth.isLoggedIn" @click="commentImageInput && commentImageInput.click()">
                      <i class="fas fa-image"></i> Image
                    </button>
                    <span v-if="commentImageName" style="font-size:12px;color:var(--text-muted)">{{ commentImageName }}</span>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm article-comment-submit-btn"
                      :disabled="acting || (!commentText && !commentImageFile)"
                      @click="onComment"
                    >
                      Post
                    </button>
                  </div>
                </div>
                <div v-if="commentsLoading" class="room-empty">加载中…</div>
                <div v-else class="comment-list">
                  <div
                    v-for="(c, idx) in comments"
                    :key="c.id || idx"
                    class="comment-item comment-item--root"
                  >
                    <button type="button" class="comment-author player-name-link" :class="adminNameClass(c)" @click.stop="goPlayerProfile(router, null, c)">{{ commentAuthor(c) }}</button>
                    <div class="comment-time">{{ c.createdAt || c.created_at || '' }}</div>
                    <div class="comment-content" v-html="formatCommentContentHtml(c.content)"></div>
                    <div class="comment-actions" style="margin-top:4px">
                      <button type="button" class="link-btn comment-reply-btn" @click="setReply(c)">回复</button>
                      <button type="button" class="link-btn comment-report-btn" style="margin-left:10px" @click="onReportComment(c)">举报</button>
                    </div>
                    <div v-if="Array.isArray(c.replies) && c.replies.length" class="comment-replies" style="margin-left:16px;margin-top:8px;border-left:2px solid var(--border-color);padding-left:10px">
                      <div
                        v-for="(r, ri) in visibleReplies(c)"
                        :key="r.id || ri"
                        class="comment-item comment-item--reply"
                        style="margin-bottom:8px"
                      >
                        <button type="button" class="comment-author player-name-link" :class="adminNameClass(r)" @click.stop="goPlayerProfile(router, null, r)">{{ commentAuthor(r) }}</button>
                        <div class="comment-time">{{ r.createdAt || r.created_at || '' }}</div>
                        <div class="comment-content" v-html="formatCommentContentHtml(r.content)"></div>
                        <div class="comment-actions" style="margin-top:4px">
                          <button type="button" class="link-btn comment-reply-btn" @click="setReply(r)">回复</button>
                          <button type="button" class="link-btn comment-report-btn" style="margin-left:10px" @click="onReportComment(r)">举报</button>
                        </div>
                      </div>
                      <button
                        v-if="replyExtra(c) > 0 && !expandedRoots[c.id]"
                        type="button"
                        class="link-btn"
                        @click="expandedRoots[c.id] = true"
                      >展开更多回复（{{ replyExtra(c) }})</button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
            <div class="article-modal-pane article-modal-pane--article" aria-label="资讯正文">
              <div class="article-detail">
                <div
                  class="article-detail-cover-wrap"
                  :class="{ 'article-detail-cover-wrap--empty': !coverOf(detail) }"
                >
                  <div
                    v-if="coverOf(detail)"
                    class="article-detail-cover-bg"
                    :style="{ backgroundImage: 'url(' + coverOf(detail) + ')' }"
                    aria-hidden="true"
                  ></div>
                  <div
                    v-else
                    class="article-detail-cover-bg article-detail-cover-bg--empty"
                    aria-hidden="true"
                  ></div>
                  <img
                    v-if="coverOf(detail)"
                    class="article-detail-cover-img"
                    :src="coverOf(detail)"
                    :alt="detail.title || ''"
                  />
                  <div class="article-detail-glassbar">
                    <div class="article-detail-author">
                      <img
                        class="article-detail-author-avatar"
                        :src="authorAvatarOf(detail)"
                        alt=""
                      />
                      <div class="article-detail-author-text">
                        <button type="button" class="article-detail-author-name player-name-link" :class="adminNameClass(detail)" @click.stop="goPlayerProfile(router, null, detail)">{{ detail.author || '作者' }}</button>
                        <div v-if="dateOf(detail)" class="article-detail-time">
                          <i class="far fa-clock"></i> {{ dateOf(detail) }}
                        </div>
                      </div>
                    </div>
                    <div class="article-detail-title-wrap">
                      <h2 class="article-detail-title-right">{{ detail.title }}</h2>
                    </div>
                  </div>
                </div>
                <div v-if="detail.summary" class="article-detail-summary">{{ detail.summary }}</div>
                <div class="article-detail-content" v-html="formatArticleContentHtml(detail.content)"></div>
                <div class="article-actions">
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    :class="{ active: liked }"
                    :disabled="acting"
                    @click="onLike"
                  >
                    <i :class="liked ? 'fas fa-heart' : 'far fa-heart'"></i>
                    <span class="like-count">{{ likeCount ?? 0 }}</span> 点赞
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    style="margin-left:10px"
                    :disabled="acting"
                    @click="onReport"
                  >
                    举报
                  </button>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchArticle, fetchArticles, fetchArticleComments, likeArticle, postArticleComment, reportArticle, reportComment, uploadArticleContentImage } from '@/api/articles'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError, type Article } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'
import { goPlayerProfile } from '@/utils/playerProfile'

import { formatArticleContentHtml, formatCommentContentHtml } from '@/utils/contentHtml'

const router = useRouter()

const auth = useUserAuthStore()
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
  return String(a.coverUrl || a.cover_url || '')
}
function authorAvatarOf(a: Article) {
  return String(
    a.authorAvatarUrl ||
      a.author_avatar_url ||
      a.avatarUrl ||
      a.avatar_url ||
      '/images/CSel3_LargePortTianhuo.png',
  )
}
function commentAuthor(c: Record<string, unknown>) {
  return String(c.authorName || c.author_name || c.nickname || c.username || '用户')
}

const commentPlaceholder = computed(() => {
  if (!auth.isLoggedIn) return '登录后即可评论'
  if (replyParentId.value) return replyToName.value ? `回复 @${replyToName.value}` : '回复评论…'
  return '写点什么吧…'
})

function visibleReplies(c: Record<string, unknown>) {
  const replies = Array.isArray(c.replies) ? (c.replies as Record<string, unknown>[]) : []
  if (expandedRoots.value[c.id as number] || replies.length <= 2) return replies
  return replies.slice(0, 2)
}
function replyExtra(c: Record<string, unknown>) {
  const replies = Array.isArray(c.replies) ? c.replies : []
  return Math.max(0, replies.length - 2)
}
function setReply(c: Record<string, unknown>) {
  const id = Number(c.id)
  if (!Number.isFinite(id)) return
  replyParentId.value = id
  replyToName.value = commentAuthor(c)
}
function clearReply() {
  replyParentId.value = null
  replyToName.value = ''
}
function onCommentImage(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    window.alert('请选择图片文件')
    input.value = ''
    return
  }
  commentImageFile.value = file
  commentImageName.value = file.name
}
async function onReportComment(c: Record<string, unknown>) {
  if (!auth.isLoggedIn) {
    window.alert('请先登录')
    return
  }
  const id = Number(c.id)
  if (!Number.isFinite(id)) return
  const reason = window.prompt('请输入举报原因（可选）') || ''
  acting.value = true
  try {
    await reportComment(id, reason)
    window.alert('已提交举报')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '举报失败')
  } finally {
    acting.value = false
  }
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


const comments = ref<any[]>([])
const commentsLoading = ref(false)
const commentText = ref('')
const replyParentId = ref<number | null>(null)
const replyToName = ref('')
const commentImageInput = ref<HTMLInputElement | null>(null)
const commentImageFile = ref<File | null>(null)
const commentImageName = ref('')
const expandedRoots = ref<Record<string | number, boolean>>({})

const acting = ref(false)
const likeCount = ref<number | null>(null)
const liked = ref(false)

async function loadComments(id: number) {
  commentsLoading.value = true
  try {
    const data = await fetchArticleComments(id)
    comments.value = Array.isArray(data) ? data : []
  } catch {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

async function onLike() {
  if (!detail.value) return
  if (!auth.isLoggedIn) { window.alert('请先登录'); return }
  acting.value = true
  try {
    await likeArticle(detail.value.id)
    const next = !liked.value
    liked.value = next
    const base = likeCount.value || 0
    likeCount.value = next ? base + 1 : Math.max(0, base - 1)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '操作失败')
  } finally {
    acting.value = false
  }
}

async function onReport() {
  if (!detail.value) return
  if (!auth.isLoggedIn) { window.alert('请先登录'); return }
  const reason = window.prompt('请输入举报理由', '') || ''
  acting.value = true
  try {
    await reportArticle(detail.value.id, reason)
    window.alert('已提交举报')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : 'error')
  } finally {
    acting.value = false
  }
}

async function onComment() {
  if (!detail.value?.id) return
  if (!auth.isLoggedIn) {
    window.alert('请先登录')
    return
  }
  if (!commentText.value && !commentImageFile.value) return
  acting.value = true
  try {
    let content = commentText.value
    if (commentImageFile.value) {
      const url = await uploadArticleContentImage(commentImageFile.value)
      content = content ? content + '\n[[img:' + url + ']]' : '[[img:' + url + ']]'
    }
    await postArticleComment(detail.value.id, content, replyParentId.value)
    commentText.value = ''
    commentImageFile.value = null
    commentImageName.value = ''
    if (commentImageInput.value) commentImageInput.value.value = ''
    clearReply()
    await loadComments(detail.value.id)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '评论失败')
  } finally {
    acting.value = false
  }
}

async function openDetail(id: number) {
  detailOpen.value = true
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  comments.value = []
  commentText.value = ''
  likeCount.value = null
  liked.value = false
  try {
    detail.value = await fetchArticle(id)
    const d = detail.value as any
    likeCount.value = d?.likeCount ?? d?.like_count ?? d?.likes ?? null
    liked.value = !!d?.liked
    await loadComments(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  clearReply()
  commentImageFile.value = null
  commentImageName.value = ''

  detailOpen.value = false
}

function onArticlesChanged() { load() }
onMounted(() => {
  load()
  window.addEventListener('tfhers:articles-changed', onArticlesChanged)
})
onUnmounted(() => {
  window.removeEventListener('tfhers:articles-changed', onArticlesChanged)
})
</script>
