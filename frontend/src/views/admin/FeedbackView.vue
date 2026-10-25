<template>
  <section class="page active">
    <div class="action-bar">
      <div class="action-buttons" style="display:flex;gap:8px;flex-wrap:wrap">
        <select v-model="status" class="inline-select" @change="page=1; load()">
          <option value="">全部状态</option>
          <option value="open">open</option>
          <option value="replied">replied</option>
          <option value="closed">closed</option>
        </select>
        <select v-model="category" class="inline-select" @change="page=1; load()">
          <option value="">全部分类</option>
          <option value="bug">bug</option>
          <option value="idea">idea</option>
          <option value="other">other</option>
        </select>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">问题反馈</h3><div class="card-actions"><span class="article-count">共 {{ total }} 条</span></div></div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无反馈</p>
        <table v-else-if="items.length" class="data-table">
          <thead><tr><th>ID</th><th>分类</th><th>内容</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="f in items" :key="f.id">
              <td>{{ f.id }}</td>
              <td>{{ f.category || '-' }}</td>
              <td class="cell-ellipsis" :title="f.content">{{ f.content || f.title || '-' }}</td>
              <td>{{ f.status || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openHandle(f)">处理</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>
    <div v-if="handleOpen" class="vue-drawer-mask" @click.self="handleOpen=false">
      <aside class="vue-drawer">
        <header class="vue-drawer-head"><h2>处理反馈 #{{ handleItem?.id }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="handleOpen=false">关闭</button>
        </header>
        <div class="form-field"><label>状态</label>
          <select v-model="handleStatus"><option value="open">open</option><option value="replied">replied</option><option value="closed">closed</option></select>
        </div>
        <div class="form-field"><label>回复</label>
          <textarea v-model="handleReply" rows="4"></textarea>
        </div>
        <button type="button" class="btn btn-primary" :disabled="busyId === handleItem?.id" @click="confirmHandle">提交</button>
      </aside>
    </div>
  </section>
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