<template>
  <section class="page active">
    <div class="action-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          v-model.trim="keyword"
          type="text"
          placeholder="搜索文章标题、内容、作者..."
          @keyup.enter="load"
        />
        <button type="button" class="search-btn" :disabled="loading" @click="load">搜索</button>
      </div>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate">
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
              <td>{{ isPinned(a) ? '已置顶' : '否' }}</td>
              <td>{{ a.createdAt || a.created_at || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openEdit(a)">编辑</button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="busyId === a.id"
                  @click="onTogglePin(a)"
                >
                  {{ isPinned(a) ? '取消置顶' : '置顶' }}
                </button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  :disabled="busyId === a.id"
                  @click="onDelete(a)"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="showForm" class="modal" style="display:block" @click.self="showForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ form.id ? '编辑文章' : '新增文章' }}</h3>
          <button type="button" class="modal-close" @click="showForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>标题 *</label><input v-model.trim="form.title" type="text" /></div>
          <div class="form-group"><label>摘要</label><input v-model.trim="form.summary" type="text" /></div>
          <div class="form-group"><label>作者 *</label><input v-model.trim="form.author" type="text" /></div>
          <div class="form-group"><label>封面 URL</label><input v-model.trim="form.coverUrl" type="text" /></div>
          <div class="form-group"><label>内容 *</label><textarea v-model.trim="form.content" rows="10" style="width:100%"></textarea></div>
          <div class="form-group">
            <label><input v-model="form.pinned" type="checkbox" /> 置顶</label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onSave">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  createAdminArticle,
  deleteAdminArticle,
  fetchAdminArticles,
  searchAdminArticles,
  setArticlePinned,
  updateAdminArticle,
} from '@/api/admin/articles'
import { ApiError, type Article } from '@/api/types'
import { useAdminAuthStore } from '@/stores/auth'

const adminAuth = useAdminAuthStore()
const items = ref<Article[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

const showForm = ref(false)
const saving = ref(false)
const form = ref({
  id: 0,
  title: '',
  summary: '',
  author: '',
  coverUrl: '',
  content: '',
  pinned: false,
})

function isPinned(a: Article) {
  return Number(a.isPinned ?? a.is_pinned ?? 0) === 1
}

function defaultAuthor() {
  return adminAuth.userInfo?.nickname || adminAuth.userInfo?.username || 'admin'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = keyword.value ? await searchAdminArticles(keyword.value) : await fetchAdminArticles()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资讯失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    id: 0,
    title: '',
    summary: '',
    author: defaultAuthor(),
    coverUrl: '',
    content: '',
    pinned: false,
  }
  showForm.value = true
}

async function openEdit(a: Article) {
  form.value = {
    id: a.id,
    title: a.title || '',
    summary: String(a.summary || ''),
    author: a.author || defaultAuthor(),
    coverUrl: String(a.coverUrl || a.cover_url || ''),
    content: String(a.content || ''),
    pinned: isPinned(a),
  }
  // Prefer full content from detail if list omitted it
  if (!form.value.content) {
    try {
      const full = await fetchAdminArticles()
      const hit = (Array.isArray(full) ? full : []).find((x) => x.id === a.id)
      if (hit?.content) form.value.content = String(hit.content)
    } catch {
      /* ignore */
    }
  }
  showForm.value = true
}

async function onSave() {
  if (!form.value.title || !form.value.content) {
    actionMsg.value = '请填写标题和内容'
    actionErr.value = true
    return
  }
  if (!form.value.author) {
    actionMsg.value = '请填写作者'
    actionErr.value = true
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.value.title,
      summary: form.value.summary,
      content: form.value.content,
      coverUrl: form.value.coverUrl,
      author: form.value.author,
      isPinned: form.value.pinned ? 1 : 0,
    }
    if (form.value.id) {
      await updateAdminArticle({ id: form.value.id, ...payload })
    } else {
      await createAdminArticle({ ...payload, viewCount: 0 })
    }
    showForm.value = false
    actionMsg.value = '保存成功'
    actionErr.value = false
    await load()
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '保存失败'
    actionErr.value = true
  } finally {
    saving.value = false
  }
}

async function onTogglePin(a: Article) {
  busyId.value = a.id
  try {
    await setArticlePinned(a.id, !isPinned(a))
    actionMsg.value = '已更新置顶'
    actionErr.value = false
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
  try {
    await deleteAdminArticle(a.id)
    actionMsg.value = '已删除'
    actionErr.value = false
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
