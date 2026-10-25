<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>评论审核</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <div class="toolbar filter-bar">
      <label>
        状态
        <select v-model="status" @change="page = 1; load()">
          <option value="0">待审核</option>
          <option value="1">已通过</option>
          <option value="2">已拒绝</option>
          <option value="">全部</option>
        </select>
      </label>
      <label>
        资讯 ID
        <input v-model.trim="articleId" type="text" placeholder="可选" @keyup.enter="page = 1; load()" />
      </label>
      <button type="button" class="ghost-btn" @click="page = 1; load()">筛选</button>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无评论</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>资讯</th>
            <th>用户</th>
            <th>内容</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in items" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.articleId ?? c.article_id ?? '-' }}</td>
            <td>{{ c.authorName || c.author_name || `用户 ${c.userId ?? c.user_id ?? '-'}` }}</td>
            <td class="cell-ellipsis" :title="c.content">{{ c.content || '-' }}</td>
            <td>{{ statusText[Number(c.status ?? 0)] || c.status }}</td>
            <td>{{ c.createdAt || c.created_at || '-' }}</td>
            <td class="cell-actions">
              <button type="button" class="ghost-btn" :disabled="busyId === c.id" @click="openReview(c)">审核</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button type="button" class="ghost-btn" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 条</span>
      <button type="button" class="ghost-btn" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>

    <div v-if="reviewOpen" class="drawer-mask" @click.self="reviewOpen = false">
      <aside class="drawer">
        <header class="drawer-head">
          <h2>审核评论 #{{ reviewItem?.id }}</h2>
          <button type="button" class="ghost-btn" @click="reviewOpen = false">关闭</button>
        </header>
        <p class="detail-block">{{ reviewItem?.content }}</p>
        <label class="form-field">
          结果
          <select v-model.number="reviewStatus">
            <option :value="1">通过</option>
            <option :value="2">拒绝</option>
          </select>
        </label>
        <label class="form-field">
          备注
          <input v-model.trim="reviewRemark" type="text" />
        </label>
        <button type="button" class="auth-btn" :disabled="busyId != null" @click="confirmReview">提交</button>
        <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminComments, updateCommentStatus } from '@/api/admin/comments'
import type { AdminComment } from '@/api/admin/types'
import { ApiError } from '@/api/types'

const statusText: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
const items = ref<AdminComment[]>([])
const loading = ref(false)
const error = ref('')
const status = ref<string | number>('0')
const articleId = ref('')
const page = ref(1)
const size = 10
const total = ref(0)
const busyId = ref<number | null>(null)
const reviewOpen = ref(false)
const reviewItem = ref<AdminComment | null>(null)
const reviewStatus = ref(1)
const reviewRemark = ref('')
const actionMsg = ref('')
const actionErr = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminComments({
      page: page.value,
      size,
      status: status.value,
      articleId: articleId.value || undefined,
    })
    items.value = data?.list || []
    total.value = data?.total != null ? Number(data.total) : 0
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载评论失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openReview(c: AdminComment) {
  reviewItem.value = c
  reviewStatus.value = 1
  reviewRemark.value = String(c.adminRemark || c.admin_remark || '')
  actionMsg.value = ''
  reviewOpen.value = true
}

async function confirmReview() {
  if (!reviewItem.value) return
  busyId.value = reviewItem.value.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateCommentStatus(reviewItem.value.id, reviewStatus.value, reviewRemark.value || undefined)
    actionMsg.value = '审核成功'
    reviewOpen.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '审核失败'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>