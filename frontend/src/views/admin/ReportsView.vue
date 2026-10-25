<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>内容举报</h1>
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
          <option value="3">已驳回</option>
        </select>
      </label>
      <label>
        类型
        <select v-model="targetType" @change="page = 1; load()">
          <option value="">全部</option>
          <option value="article">资讯</option>
          <option value="comment">评论</option>
          <option value="combo">连招</option>
          <option value="user">用户</option>
          <option value="other">其他</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无举报</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>类型</th>
            <th>目标</th>
            <th>原因</th>
            <th>内容</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in items" :key="r.id">
            <td>{{ r.id }}</td>
            <td>{{ r.userId ?? r.user_id ?? '-' }}</td>
            <td>{{ typeText[String(r.targetType || r.target_type || '')] || r.targetType || r.target_type || '-' }}</td>
            <td>{{ r.targetId ?? r.target_id ?? '-' }}</td>
            <td>{{ reasonText[String(r.reason || '')] || r.reason || '-' }}</td>
            <td class="cell-ellipsis" :title="r.content">{{ r.content || '-' }}</td>
            <td>{{ statusText[Number(r.status ?? -1)] || r.status }}</td>
            <td class="cell-actions">
              <button
                v-if="r.status === 0 || r.status === 1"
                type="button"
                class="ghost-btn"
                :disabled="busyId === r.id"
                @click="openHandle(r)"
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
          <h2>处理举报 #{{ handleItem?.id }}</h2>
          <button type="button" class="ghost-btn" @click="handleOpen = false">关闭</button>
        </header>
        <label class="form-field">
          状态
          <select v-model.number="handleStatus">
            <option :value="1">处理中</option>
            <option :value="2">已处理</option>
            <option :value="3">已驳回</option>
          </select>
        </label>
        <label class="form-field">
          备注
          <input v-model.trim="handleRemark" type="text" />
        </label>
        <button type="button" class="auth-btn" :disabled="busyId != null" @click="confirmHandle">提交</button>
        <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
      </aside>
    </div>
  </div>
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