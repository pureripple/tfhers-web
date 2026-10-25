<template>
  <section class="page active">
    <div class="action-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model.trim="keyword" type="text" placeholder="搜索文章标题、内容、作者..." @keyup.enter="load" />
        <button type="button" class="search-btn" :disabled="loading" @click="load">搜索</button>
      </div>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" disabled title="富文本新建未迁入">
          <i class="fas fa-plus"></i> 新增文章
        </button>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </div>
    </div>

    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>

    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">文章列表</h3>
        <div class="card-actions">
          <span class="article-count">共 <span>{{ items.length }}</span> 篇</span>
        </div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无资讯</p>
        <table v-else-if="items.length" class="data-table">
          <thead>
            <tr>
              <th>ID</th><th>标题</th><th>作者</th><th>阅读</th><th>置顶</th><th>创建时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in items" :key="a.id">
              <td>{{ a.id }}</td>
              <td class="cell-ellipsis" :title="a.title">{{ a.title || '无标题' }}</td>
              <td>{{ a.author || '-' }}</td>
              <td>{{ a.viewCount ?? a.view_count ?? 0 }}</td>
              <td>{{ isPinned(a) ? '已置顶' : '否' }}</td>
              <td>{{ a.createdAt || a.created_at || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === a.id" @click="onTogglePin(a)">
                  {{ isPinned(a) ? '取消置顶' : '置顶' }}
                </button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === a.id" @click="onDelete(a)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteAdminArticle,
  fetchAdminArticles,
  searchAdminArticles,
  setArticlePinned,
} from '@/api/admin/articles'
import { ApiError, type Article } from '@/api/types'

const items = ref<Article[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

function isPinned(a: Article) {
  return Number(a.isPinned ?? a.is_pinned ?? 0) === 1
}

async function load() {
  loading.value = true
  error.value = ''
  actionMsg.value = ''
  try {
    const data = keyword.value
      ? await searchAdminArticles(keyword.value)
      : await fetchAdminArticles()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资讯失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function onTogglePin(a: Article) {
  busyId.value = a.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await setArticlePinned(a.id, !isPinned(a))
    actionMsg.value = '已更新置顶'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '置顶失败'
  } finally {
    busyId.value = null
  }
}

async function onDelete(a: Article) {
  if (!confirm(`确认删除资讯「${a.title || a.id}」？不可恢复。`)) return
  busyId.value = a.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await deleteAdminArticle(a.id)
    actionMsg.value = '已删除'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '删除失败'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>