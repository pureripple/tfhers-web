<template>
  <section class="page active">
    <div class="action-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model.trim="keyword" type="text" placeholder="搜索用户名/昵称…" @keyup.enter="load" />
        <button type="button" class="search-btn" :disabled="loading" @click="load">搜索</button>
      </div>
      <div class="action-buttons" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select v-model="role" class="inline-select" @change="load">
          <option value="">全部角色</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <select v-model="status" class="inline-select" @change="load">
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="0">禁用</option>
        </select>
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load"><i class="fas fa-sync-alt"></i> 刷新</button>
      </div>
    </div>
    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">用户列表</h3><div class="card-actions"><span class="article-count">共 {{ total }} 人</span></div></div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无用户</p>
        <table v-else-if="items.length" class="data-table">
          <thead><tr><th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="u in items" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.nickname || '-' }}</td>
              <td>{{ u.role || '-' }}</td>
              <td>{{ u.status }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === u.id" @click="onToggleStatus(u)">切换状态</button>
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === u.id" @click="onResetPassword(u)">重置密码</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="pagination" style="padding:12px;display:flex;gap:8px;align-items:center">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="page<=1 || loading" @click="page--; load()">上一页</button>
        <span class="muted">{{ page }} / {{ totalPages }}</span>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="page>=totalPages || loading" @click="page++; load()">下一页</button>
      </div>
    </div>
    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteManagedUser,
  fetchManagedUsers,
  updateManagedUserRole,
  updateManagedUserStatus,
  type ManagedUser,
} from '@/api/admin/users'
import { ApiError } from '@/api/types'

const items = ref<ManagedUser[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const role = ref('')
const status = ref('')
const page = ref(1)
const size = 10
const total = ref(0)
const totalPages = ref(1)
const busyId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)


async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchManagedUsers({
      page: page.value,
      size,
      keyword: keyword.value || undefined,
      role: role.value || undefined,
      status: status.value,
    })
    items.value = data?.users || []
    total.value = data?.total != null ? Number(data.total) : items.value.length
    totalPages.value = data?.totalPages != null ? Number(data.totalPages) : Math.max(1, Math.ceil(total.value / size))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载用户失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function onToggleStatus(u: ManagedUser) {
  const next = u.status === 1 ? 0 : 1
  busyId.value = u.id
  actionMsg.value = ''
  actionErr.value = false
  try {
    await updateManagedUserStatus(u.id, next)
    actionMsg.value = next === 1 ? '已启用' : '已禁用'
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '操作失败'
  } finally {
    busyId.value = null
  }
}

async function onToggleRole(u: ManagedUser) {
  const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
  if (!confirm(`确认将「${u.username}」角色改为 ${next === 'ADMIN' ? '管理员' : '普通用户'}？`)) return
  busyId.value = u.id
  try {
    await updateManagedUserRole(u.id, next)
    actionMsg.value = '角色已更新'
    actionErr.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '操作失败'
  } finally {
    busyId.value = null
  }
}

async function onDelete(u: ManagedUser) {
  if (!confirm(`确认删除用户「${u.username}」？不可恢复。`)) return
  busyId.value = u.id
  try {
    await deleteManagedUser(u.id)
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