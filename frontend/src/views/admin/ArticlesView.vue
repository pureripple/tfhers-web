<template>
  <section class="page active">
    <div class="action-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          v-model.trim="keyword"
          type="text"
          placeholder="搜索文章标题、内容、作者..."
          @keyup.enter="onSearch"
        />
        <button type="button" class="search-btn" :disabled="loading" @click="onSearch">搜索</button>
      </div>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate">
          <i class="fas fa-plus"></i> 添加文章
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
          <span class="article-count">共 <span>{{ items.length }}</span> 篇文章</span>
        </div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无资讯</p>
        <table v-else-if="pageItems.length" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>作者</th>
              <th>摘要</th>
              <th>阅读量</th>
              <th>置顶</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in pageItems" :key="a.id">
              <td>{{ a.id }}</td>
              <td>
                <div class="article-title-cell">
                  <div class="article-cover-thumb">
                    <img
                      v-if="coverOf(a)"
                      :src="coverOf(a)"
                      alt="封面"
                      @error="onCoverImgError"
                    />
                    <div v-else class="article-cover-empty">无封面</div>
                  </div>
                  <div class="cell-ellipsis" style="max-width: 200px" :title="a.title">
                    {{ a.title || '无标题' }}
                  </div>
                </div>
              </td>
              <td><span :class="adminNameClass(a)">{{ a.author || '未知' }}</span></td>
              <td>
                <div class="cell-ellipsis" style="max-width: 150px" :title="summaryOf(a)">
                  {{ summaryOf(a) || '暂无摘要' }}
                </div>
              </td>
              <td>{{ a.viewCount ?? a.view_count ?? 0 }}</td>
              <td style="text-align: center">
                <button
                  type="button"
                  class="action-btn btn-sm article-pin-btn"
                  :class="{ 'article-pin-btn--on': isPinned(a) }"
                  :title="isPinned(a) ? '取消置顶' : '置顶'"
                  :disabled="busyId === a.id"
                  @click="onTogglePin(a)"
                >
                  <i class="fas" :class="isPinned(a) ? 'fa-thumbtack' : 'fa-thumbtack'"></i>
                </button>
              </td>
              <td>{{ a.createdAt || a.created_at || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="action-btn edit btn-sm" title="编辑" @click="openEdit(a)">
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  type="button"
                  class="action-btn delete btn-sm"
                  title="删除"
                  :disabled="busyId === a.id"
                  @click="askDelete(a)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="pagination">
        <button
          type="button"
          class="pagination-btn"
          :class="{ disabled: pageNum <= 1 }"
          :disabled="pageNum <= 1"
          @click="changePage(pageNum - 1)"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <template v-for="p in pageButtons" :key="'p-' + p">
          <span v-if="p === '...'" class="pagination-ellipsis">...</span>
          <button
            v-else
            type="button"
            class="pagination-btn"
            :class="{ active: p === pageNum }"
            @click="changePage(Number(p))"
          >
            {{ p }}
          </button>
        </template>
        <button
          type="button"
          class="pagination-btn"
          :class="{ disabled: pageNum >= totalPages }"
          :disabled="pageNum >= totalPages"
          @click="changePage(pageNum + 1)"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <!-- Add / Edit modal -->
    <div v-if="showForm" class="modal" style="display: block" @click.self="closeForm">
      <div class="modal-content large">
        <div class="modal-header">
          <h3>{{ form.id ? '编辑文章' : '添加文章' }}</h3>
          <button type="button" class="modal-close" @click="closeForm"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文章标题 *</label>
            <input v-model.trim="form.title" type="text" placeholder="请输入文章标题" />
          </div>
          <div class="form-group">
            <label>作者 *</label>
            <input
              v-model.trim="form.author"
              type="text"
              :placeholder="form.id ? '请输入作者名称' : '默认当前登录管理员，可修改'"
            />
          </div>
          <div class="form-group">
            <label>文章摘要</label>
            <textarea v-model.trim="form.summary" rows="3" placeholder="请输入文章摘要（可选）"></textarea>
          </div>
          <div class="form-group">
            <label>封面图片</label>
            <div class="image-upload-container">
              <input
                ref="coverFileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onCoverFileChange"
              />
              <div
                v-show="!form.coverUrl"
                class="image-upload-area"
                :class="{ uploading: coverUploading, dragover: coverDragover, error: coverUploadErr }"
                @click="coverFileInput?.click()"
                @dragover.prevent="coverDragover = true"
                @dragleave.prevent="coverDragover = false"
                @drop.prevent="onCoverDrop"
              >
                <i class="fas fa-cloud-upload-alt"></i>
                <p>{{ coverUploading ? '上传中…' : '点击选择封面图片' }}</p>
                <small>支持 JPG、PNG、GIF 格式，最大 5MB</small>
              </div>
              <div v-show="form.coverUrl" class="image-preview">
                <img :src="form.coverUrl" alt="封面预览" />
                <button type="button" class="remove-image-btn" title="移除封面" @click="clearCover">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-inline-label">
              <input v-model="form.pinned" type="checkbox" />
              置顶展示（App 首页右侧「置顶资讯」区域最多显示 3 条）
            </label>
          </div>
          <div class="form-group">
            <label>文章内容 *</label>
            <textarea
              ref="contentTextarea"
              v-model="form.content"
              rows="8"
              required
              placeholder="请输入文章内容"
              style="width: 100%"
            ></textarea>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              style="margin-top: 8px"
              :disabled="contentUploading"
              @click="contentFileInput?.click()"
            >
              <i class="fas fa-image"></i>
              {{ contentUploading ? '插入中…' : '在正文插入图片' }}
            </button>
            <input
              ref="contentFileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="onContentFileChange"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeForm">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onSave">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal (legacy parity) -->
    <div v-if="deleteTarget" class="modal" style="display: block" @click.self="deleteTarget = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button type="button" class="modal-close" @click="deleteTarget = null"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p>确定删除资讯「{{ deleteTarget.title || deleteTarget.id }}」？此操作不可恢复。</p>
          <div class="article-preview">
            <div class="article-title-cell">
              <div class="article-cover-thumb">
                <img v-if="coverOf(deleteTarget)" :src="coverOf(deleteTarget)" alt="封面" />
                <div v-else class="article-cover-empty">无封面</div>
              </div>
              <div>
                <strong>{{ deleteTarget.title || '无标题' }}</strong>
                <div style="color: var(--text-muted); font-size: 13px"><span :class="adminNameClass(deleteTarget)">{{ deleteTarget.author || '未知' }}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="deleteTarget = null">取消</button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="busyId === deleteTarget.id"
            @click="confirmDelete"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createAdminArticle,
  deleteAdminArticle,
  fetchAdminArticles,
  searchAdminArticles,
  setArticlePinned,
  updateAdminArticle,
  uploadAdminArticleContentImage,
  uploadAdminArticleCover,
} from '@/api/admin/articles'
import { ApiError, type Article } from '@/api/types'
import { useAdminAuthStore } from '@/stores/auth'
import { adminNameClass } from '@/utils/adminName'

const PAGE_SIZE = 10

const adminAuth = useAdminAuthStore()
const items = ref<Article[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)
const pageNum = ref(1)

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

const coverFileInput = ref<HTMLInputElement | null>(null)
const contentFileInput = ref<HTMLInputElement | null>(null)
const contentTextarea = ref<HTMLTextAreaElement | null>(null)
const coverUploading = ref(false)
const coverDragover = ref(false)
const coverUploadErr = ref(false)
const contentUploading = ref(false)
const deleteTarget = ref<Article | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / PAGE_SIZE)))
const pageItems = computed(() => {
  const start = (pageNum.value - 1) * PAGE_SIZE
  return items.value.slice(start, start + PAGE_SIZE)
})
const pageButtons = computed(() => {
  const total = totalPages.value
  const cur = pageNum.value
  if (total <= 1) return [] as (number | string)[]
  const buttons: (number | string)[] = []
  const startPage = Math.max(1, cur - 2)
  const endPage = Math.min(total, cur + 2)
  if (startPage > 1) {
    buttons.push(1)
    if (startPage > 2) buttons.push('...')
  }
  for (let i = startPage; i <= endPage; i++) buttons.push(i)
  if (endPage < total) {
    if (endPage < total - 1) buttons.push('...')
    buttons.push(total)
  }
  return buttons
})

function isPinned(a: Article) {
  return Number(a.isPinned ?? a.is_pinned ?? 0) === 1
}

function coverOf(a: Article) {
  return String(a.coverUrl || a.cover_url || '')
}

function summaryOf(a: Article) {
  return String(a.summary || '')
}

function defaultAuthor() {
  return adminAuth.userInfo?.nickname || adminAuth.userInfo?.username || 'admin'
}

function onCoverImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent && !parent.querySelector('.article-cover-empty')) {
    const d = document.createElement('div')
    d.className = 'article-cover-empty'
    d.textContent = '无封面'
    parent.appendChild(d)
  }
}

function changePage(n: number) {
  if (n < 1 || n > totalPages.value) return
  pageNum.value = n
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = keyword.value ? await searchAdminArticles(keyword.value) : await fetchAdminArticles()
    items.value = Array.isArray(data) ? data : []
    if (pageNum.value > totalPages.value) pageNum.value = 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载资讯失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  pageNum.value = 1
  return load()
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
  coverUploadErr.value = false
  showForm.value = true
}

async function openEdit(a: Article) {
  form.value = {
    id: a.id,
    title: a.title || '',
    summary: String(a.summary || ''),
    author: a.author || defaultAuthor(),
    coverUrl: coverOf(a),
    content: String(a.content || ''),
    pinned: isPinned(a),
  }
  coverUploadErr.value = false
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

function closeForm() {
  showForm.value = false
}

function clearCover() {
  form.value.coverUrl = ''
  if (coverFileInput.value) coverFileInput.value.value = ''
  coverUploadErr.value = false
}

async function uploadCover(file: File) {
  coverUploading.value = true
  coverUploadErr.value = false
  try {
    form.value.coverUrl = await uploadAdminArticleCover(file)
    actionMsg.value = '图片上传成功'
    actionErr.value = false
  } catch (e) {
    coverUploadErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '封面上传失败'
    actionErr.value = true
    setTimeout(() => {
      coverUploadErr.value = false
    }, 3000)
  } finally {
    coverUploading.value = false
    coverDragover.value = false
  }
}

function onCoverFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void uploadCover(file)
  input.value = ''
}

function onCoverDrop(e: DragEvent) {
  coverDragover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    actionMsg.value = '请选择图片文件'
    actionErr.value = true
    return
  }
  void uploadCover(file)
}

async function onContentFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  contentUploading.value = true
  try {
    const url = await uploadAdminArticleContentImage(file)
    const ta = contentTextarea.value
    const insertText = `\n<img src="${url}" alt="" />\n`
    if (ta) {
      const start = ta.selectionStart ?? form.value.content.length
      const end = ta.selectionEnd ?? form.value.content.length
      const before = form.value.content.substring(0, start)
      const after = form.value.content.substring(end)
      form.value.content = before + insertText + after
      requestAnimationFrame(() => {
        const pos = before.length + insertText.length
        ta.focus()
        ta.setSelectionRange(pos, pos)
      })
    } else {
      form.value.content += insertText
    }
    actionMsg.value = '正文图片插入成功'
    actionErr.value = false
  } catch (err) {
    actionMsg.value = err instanceof ApiError ? err.message : '正文图片上传失败'
    actionErr.value = true
  } finally {
    contentUploading.value = false
  }
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
    actionMsg.value = form.value.id ? '更新文章成功' : '添加文章成功'
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

function askDelete(a: Article) {
  deleteTarget.value = a
}

async function confirmDelete() {
  const a = deleteTarget.value
  if (!a) return
  busyId.value = a.id
  try {
    await deleteAdminArticle(a.id)
    deleteTarget.value = null
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

<style scoped>
.article-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.article-cover-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-tertiary);
}
.article-cover-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.article-cover-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
  background: var(--bg-tertiary);
}
.checkbox-inline-label {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}
.checkbox-inline-label input {
  margin-top: 3px;
}
</style>
