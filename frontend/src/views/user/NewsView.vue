<template>
  <div class="page">
    <header class="page-head">
      <h1>资讯</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无资讯</p>

    <div v-else class="card-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="card card-click"
        @click="openDetail(item.id)"
      >
        <div v-if="coverOf(item)" class="card-cover-wrap">
          <img class="card-cover" :src="coverOf(item)" alt="" />
        </div>
        <div class="card-body">
          <h2 class="card-title">
            <span v-if="isPinned(item)" class="badge">置顶</span>
            {{ item.title || '无标题' }}
          </h2>
          <p class="card-meta">
            <span>{{ item.author || '匿名' }}</span>
            <span>{{ dateOf(item) }}</span>
          </p>
          <p v-if="item.summary" class="card-summary">{{ item.summary }}</p>
        </div>
      </article>
    </div>

    <div v-if="detailOpen" class="drawer-mask" @click.self="closeDetail">
      <aside class="drawer">
        <header class="drawer-head">
          <h2>{{ detail?.title || '资讯详情' }}</h2>
          <button type="button" class="ghost-btn" @click="closeDetail">关闭</button>
        </header>
        <p v-if="detailLoading" class="state">加载中…</p>
        <p v-else-if="detailError" class="state state-error">{{ detailError }}</p>
        <template v-else-if="detail">
          <p class="card-meta">
            <span>{{ detail.author || '匿名' }}</span>
            <span>{{ dateOf(detail) }}</span>
            <span>阅读 {{ viewsOf(detail) }}</span>
          </p>
          <img
            v-if="coverOf(detail)"
            class="detail-cover"
            :src="coverOf(detail)"
            alt=""
          />
          <div class="detail-content">{{ detail.content || detail.summary || '暂无正文' }}</div>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchArticle, fetchArticles } from '@/api/articles'
import { ApiError, type Article } from '@/api/types'

const items = ref<Article[]>([])
const loading = ref(false)
const error = ref('')

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

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchArticles()
    items.value = Array.isArray(data) ? data : []
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
