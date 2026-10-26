<template>
  <section class="page active">
    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">评论审核</h3>
        <div class="card-actions">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
            <select v-model="status" class="select-input" @change="page = 1; load()">
              <option value="0">待审核</option>
              <option value="1">已通过</option>
              <option value="2">已拒绝</option>
              <option value="">全部</option>
            </select>
            <input
              v-model.trim="articleId"
              type="number"
              class="select-input"
              placeholder="资讯 ID（可选）"
              style="width: 140px"
              min="1"
              step="1"
              @keyup.enter="page = 1; load()"
            />
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i> 刷新
            </button>
          </div>
        </div>
      </div>
      <p style="padding: 0 16px 8px; color: rgba(255, 255, 255, 0.65); font-size: 13px; margin: 0">
        说明：用户发表的评论会默认进入审核；未通过审核的评论也不会在前端对访客展示。
      </p>
      <div class="table-container">
        <p v-if="loading" class="vue-state">加载中…</p>
        <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
        <p v-else-if="!items.length" class="vue-state">暂无评论</p>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>资讯ID</th>
              <th>用户</th>
              <th>内容</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in items" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ c.articleId ?? c.article_id ?? '-' }}</td>
              <td><span :class="adminNameClass(c)">{{ c.authorName || c.author_name || c.userId || c.user_id || '-' }}</span></td>
              <td>
                <div class="cell-ellipsis" style="max-width: 260px" :title="c.content || ''">{{ c.content || '-' }}</div>
              </td>
              <td>{{ statusText[Number(c.status)] || c.status || '-' }}</td>
              <td>{{ c.createdAt || c.created_at || '-' }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 160px" :title="String(c.adminRemark || c.admin_remark || '')">
                  {{ c.adminRemark || c.admin_remark || '-' }}
                </div>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openReview(c)">审核</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="pagination" style="padding: 12px; display: flex; gap: 8px; align-items: center">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="page <= 1 || loading" @click="page--; load()">
          上一页
        </button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="page >= totalPages || loading"
          @click="page++; load()"
        >
          下一页
        </button>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="reviewOpen" class="vue-drawer-mask" @click.self="reviewOpen = false">
      <aside class="vue-drawer">
        <header class="vue-drawer-head">
          <h2>评论审核 #{{ reviewItem?.id }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="reviewOpen = false">关闭</button>
        </header>
        <p class="vue-detail-block">{{ reviewItem?.content }}</p>
        <div class="form-field">
          <label>状态</label>
          <select v-model.number="reviewStatus">
            <option :value="1">通过</option>
            <option :value="2">拒绝</option>
            <option :value="0">待审核</option>
          </select>
        </div>
        <div class="form-field">
          <label>备注</label>
          <textarea v-model="reviewRemark" rows="3"></textarea>
        </div>
        <button type="button" class="btn btn-primary" :disabled="busyId === reviewItem?.id" @click="confirmReview">
          提交
        </button>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminComments, updateCommentStatus } from '@/api/admin/comments'
import type { AdminComment } from '@/api/admin/types'
import { ApiError } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'

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
  const cur = Number(c.status ?? 0)
  reviewStatus.value = cur === 0 ? 1 : cur
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
