<template>
  <section class="page active">
    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">用户反馈</h3>
        <div class="card-actions">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
            <select v-model="status" class="select-input" @change="page = 1; load()">
              <option value="">全部状态</option>
              <option value="0">待处理</option>
              <option value="1">处理中</option>
              <option value="2">已处理</option>
              <option value="3">已关闭</option>
            </select>
            <select v-model="category" class="select-input" @change="page = 1; load()">
              <option value="">全部类型</option>
              <option value="bug">故障/Bug</option>
              <option value="suggestion">功能建议</option>
              <option value="other">其他</option>
            </select>
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
              <i class="fas fa-sync-alt"></i> 刷新
            </button>
          </div>
        </div>
      </div>
      <div class="table-container">
        <p v-if="loading" class="vue-state">加载中…</p>
        <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
        <p v-else-if="!items.length" class="vue-state">暂无反馈</p>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>类型</th>
              <th>标题</th>
              <th>内容</th>
              <th>状态</th>
              <th>提交时间</th>
              <th>处理回复</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in items" :key="f.id">
              <td>{{ f.id }}</td>
              <td><span :class="adminNameClass(f)">{{ f.username || f.userId || f.user_id || '-' }}</span></td>
              <td>{{ catText[String(f.category || '')] || f.category || '-' }}</td>
              <td>
                <div class="cell-ellipsis" style="max-width: 140px" :title="f.title || ''">{{ f.title || '-' }}</div>
              </td>
              <td>
                <div class="cell-ellipsis" style="max-width: 200px" :title="String(f.content || '')">
                  {{ f.content || '-' }}
                </div>
              </td>
              <td>{{ statusText[Number(f.status)] || f.status || '-' }}</td>
              <td>{{ f.createdAt || f.created_at || '-' }}</td>
              <td>
                <div
                  class="cell-ellipsis"
                  style="max-width: 160px"
                  :title="String(f.adminReply || f.admin_reply || '')"
                >
                  {{ f.adminReply || f.admin_reply || '-' }}
                </div>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openHandle(f)">处理</button>
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

    <div v-if="handleOpen" class="vue-drawer-mask" @click.self="handleOpen = false">
      <aside class="vue-drawer">
        <header class="vue-drawer-head">
          <h2>处理反馈 #{{ handleItem?.id }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="handleOpen = false">关闭</button>
        </header>
        <div class="form-field">
          <label>状态</label>
          <select v-model.number="handleStatus">
            <option :value="0">待处理</option>
            <option :value="1">处理中</option>
            <option :value="2">已处理</option>
            <option :value="3">已关闭</option>
          </select>
        </div>
        <div class="form-field">
          <label>回复</label>
          <textarea v-model="handleReply" rows="4"></textarea>
        </div>
        <button type="button" class="btn btn-primary" :disabled="busyId === handleItem?.id" @click="confirmHandle">
          提交
        </button>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminFeedback, updateFeedbackStatus } from '@/api/admin/feedback'
import type { AdminFeedback } from '@/api/admin/types'
import { ApiError } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'

const statusText: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已关闭' }
const catText: Record<string, string> = { bug: '故障/Bug', suggestion: '功能建议', other: '其他' }

const items = ref<AdminFeedback[]>([])
const loading = ref(false)
const error = ref('')
const status = ref('')
const category = ref('')
const page = ref(1)
const size = 10
const total = ref(0)
const busyId = ref<number | null>(null)
const handleOpen = ref(false)
const handleItem = ref<AdminFeedback | null>(null)
const handleStatus = ref(2)
const handleReply = ref('')
const actionMsg = ref('')
const actionErr = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminFeedback({
      page: page.value,
      size,
      status: status.value,
      category: category.value || undefined,
    })
    items.value = data?.list || []
    total.value = data?.total != null ? Number(data.total) : 0
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载反馈失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openHandle(f: AdminFeedback) {
  handleItem.value = f
  const rs = Number(f.status ?? 0)
  handleStatus.value = rs === 0 ? 1 : rs
  handleReply.value = String(f.adminReply || f.admin_reply || '')
  actionMsg.value = ''
  handleOpen.value = true
}

async function confirmHandle() {
  if (!handleItem.value) return
  busyId.value = handleItem.value.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateFeedbackStatus(handleItem.value.id, handleStatus.value, handleReply.value || undefined)
    actionMsg.value = '更新成功'
    handleOpen.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '处理失败'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
