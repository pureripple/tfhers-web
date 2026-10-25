<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>资讯管理</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p class="page-desc">列表 / 置顶 / 删除。富文本新建编辑未迁入（占位）。</p>

    <div class="toolbar filter-bar">
      <input v-model.trim="keyword" type="search" placeholder="搜索标题…" @keyup.enter="load" />
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">搜索</button>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无资讯</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>作者</th>
            <th>阅读</th>
            <th>置顶</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in items" :key="a.id">
            <td>{{ a.id }}</td>
            <td class="cell-ellipsis" :title="a.title">{{ a.title || '无标题' }}</td>
            <td>{{ a.author || '-' }}</td>
            <td>{{ a.viewCount ?? a.view_count ?? 0 }}</td>
            <td>
              <span class="badge" :class="isPinned(a) ? 'badge-ok' : ''">
                {{ isPinned(a) ? '已置顶' : '否' }}
              </span>
            </td>
            <td>{{ a.createdAt || a.created_at || '-' }}</td>
            <td class="cell-actions">
              <button type="button" class="ghost-btn" :disabled="busyId === a.id" @click="onTogglePin(a)">
                {{ isPinned(a) ? '取消置顶' : '置顶' }}
              </button>
              <button type="button" class="ghost-btn danger-btn" :disabled="busyId === a.id" @click="onDelete(a)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
  </div>
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