<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>用户反馈</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <div class="toolbar filter-bar">
      <label>
        状态
        <select v-model="status" @change="page = 1; load()">
          <option value="">全部</option>
          <option value="0">待处理</option>
          <option value="1">处理中</option>
          <option value="2">已处理</option>
          <option value="3">已关闭</option>
        </select>
      </label>
      <label>
        分类
        <select v-model="category" @change="page = 1; load()">
          <option value="">全部</option>
          <option value="bug">故障/Bug</option>
          <option value="suggestion">功能建议</option>
          <option value="other">其他</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无反馈</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>分类</th>
            <th>标题</th>
            <th>内容</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in items" :key="f.id">
            <td>{{ f.id }}</td>
            <td>{{ f.username || f.userId || f.user_id || '-' }}</td>
            <td>{{ catText[f.category || ''] || f.category || '-' }}</td>
            <td class="cell-ellipsis" :title="f.title">{{ f.title || '-' }}</td>
            <td class="cell-ellipsis" :title="f.content">{{ f.content || '-' }}</td>
            <td>{{ statusText[Number(f.status ?? -1)] || f.status }}</td>
            <td class="cell-actions">
              <button
                v-if="f.status === 0 || f.status === 1 || f.status === 2"
                type="button"
                class="ghost-btn"
                :disabled="busyId === f.id"
                @click="openHandle(f)"
              >
                处理
              </button>
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

    <div v-if="handleOpen" class="drawer-mask" @click.self="handleOpen = false">
      <aside class="drawer">
        <header class="drawer-head">
          <h2>处理反馈 #{{ handleItem?.id }}</h2>
          <button type="button" class="ghost-btn" @click="handleOpen = false">关闭</button>
        </header>
        <p class="detail-block">{{ handleItem?.content }}</p>
        <label class="form-field">
          状态
          <select v-model.number="handleStatus">
            <option :value="1">处理中</option>
            <option :value="2">已处理</option>
            <option :value="3">已关闭</option>
          </select>
        </label>
        <label class="form-field">
          回复
          <textarea v-model.trim="handleReply" rows="3" />
        </label>
        <button type="button" class="auth-btn" :disabled="busyId != null" @click="confirmHandle">提交</button>
        <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminFeedback, updateFeedbackStatus } from '@/api/admin/feedback'
import type { AdminFeedback } from '@/api/admin/types'
import { ApiError } from '@/api/types'

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
    actionMsg.value = e instanceof ApiError ? e.message : '更新失败'
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>