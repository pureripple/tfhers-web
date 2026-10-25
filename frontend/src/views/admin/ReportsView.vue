<template>
  <section class="page active">
    <div class="action-bar">
      <div class="action-buttons" style="display:flex;gap:8px;flex-wrap:wrap">
        <select v-model="status" class="inline-select" @change="page=1; load()">
          <option value="">全部状态</option>
          <option value="open">open</option>
          <option value="handled">handled</option>
          <option value="rejected">rejected</option>
        </select>
        <select v-model="targetType" class="inline-select" @change="page=1; load()">
          <option value="">全部类型</option>
          <option value="article">article</option>
          <option value="comment">comment</option>
          <option value="combo">combo</option>
          <option value="user">user</option>
        </select>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">举报列表</h3><div class="card-actions"><span class="article-count">共 {{ total }} 条</span></div></div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无举报</p>
        <table v-else-if="items.length" class="data-table">
          <thead><tr><th>ID</th><th>类型</th><th>目标</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="r in items" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.targetType || '-' }}</td>
              <td class="cell-ellipsis">{{ r.targetId ?? r.reason ?? '-' }}</td>
              <td>{{ r.status || '-' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openHandle(r)">处理</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="handleOpen" class="vue-drawer-mask" @click.self="handleOpen=false">
      <aside class="vue-drawer">
        <header class="vue-drawer-head"><h2>处理举报 #{{ handleItem?.id }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="handleOpen=false">关闭</button>
        </header>
        <div class="form-field"><label>状态</label>
          <select v-model="handleStatus"><option value="handled">handled</option><option value="rejected">rejected</option><option value="open">open</option></select>
        </div>
        <div class="form-field"><label>备注</label>
          <textarea v-model="handleRemark" rows="4"></textarea>
        </div>
        <button type="button" class="btn btn-primary" :disabled="busyId === handleItem?.id" @click="confirmHandle">提交</button>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchAdminReports, updateReportStatus } from '@/api/admin/reports'
import type { AdminReport } from '@/api/admin/types'
import { ApiError } from '@/api/types'

const statusText: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已驳回' }
const typeText: Record<string, string> = {
  article: '资讯',
  comment: '评论',
  user: '用户',
  combo: '连招',
  move: '招式',
  other: '其他',
}
const reasonText: Record<string, string> = {
  copyright: '版权',
  porn: '色情低俗',
  spam: '违规广告',
  illegal: '违法欺诈',
  abuse: '人身攻击',
  other: '其他',
}

const items = ref<AdminReport[]>([])
const loading = ref(false)
const error = ref('')
const status = ref('')
const targetType = ref('')
const page = ref(1)
const size = 10
const total = ref(0)
const busyId = ref<number | null>(null)
const handleOpen = ref(false)
const handleItem = ref<AdminReport | null>(null)
const handleStatus = ref(2)
const handleRemark = ref('')
const actionMsg = ref('')
const actionErr = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminReports({
      page: page.value,
      size,
      status: status.value,
      targetType: targetType.value || undefined,
    })
    items.value = data?.list || []
    total.value = data?.total != null ? Number(data.total) : 0
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载举报失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openHandle(r: AdminReport) {
  handleItem.value = r
  handleStatus.value = r.status === 0 ? 1 : Number(r.status || 2)
  handleRemark.value = String(r.adminRemark || r.admin_remark || '')
  actionMsg.value = ''
  handleOpen.value = true
}

async function confirmHandle() {
  if (!handleItem.value) return
  busyId.value = handleItem.value.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateReportStatus(handleItem.value.id, handleStatus.value, handleRemark.value || undefined)
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