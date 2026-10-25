<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>用户管理</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p class="page-desc">列表、启停、改角色、删除。创建/编辑/重置密码未迁入完整表单。</p>

    <div class="toolbar filter-bar">
      <input v-model.trim="keyword" type="search" placeholder="搜索用户名/昵称…" @keyup.enter="page = 1; load()" />
      <label>
        角色
        <select v-model="role" @change="page = 1; load()">
          <option value="">全部</option>
          <option value="USER">普通用户</option>
          <option value="ADMIN">管理员</option>
        </select>
      </label>
      <label>
        状态
        <select v-model="status" @change="page = 1; load()">
          <option value="">全部</option>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
      </label>
      <button type="button" class="ghost-btn" @click="page = 1; load()">搜索</button>
    </div>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无用户</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>状态</th>
            <th>最近登录</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id">
            <td>
              <div class="cell-player">
                <img v-if="u.avatarUrl" class="avatar" :src="u.avatarUrl" alt="" />
                <div>
                  <div>{{ u.nickname || u.username }}</div>
                  <div class="muted">@{{ u.username }}</div>
                </div>
              </div>
            </td>
            <td>{{ u.role === 'ADMIN' ? '管理员' : '普通用户' }}</td>
            <td>
              <span class="badge" :class="u.status === 1 ? 'badge-ok' : ''">
                {{ u.status === 1 ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ u.lastLoginTime || '从未登录' }}</td>
            <td>{{ u.createdAt || '-' }}</td>
            <td class="cell-actions">
              <button type="button" class="ghost-btn" :disabled="busyId === u.id" @click="onToggleStatus(u)">
                {{ u.status === 1 ? '禁用' : '启用' }}
              </button>
              <button type="button" class="ghost-btn" :disabled="busyId === u.id" @click="onToggleRole(u)">
                {{ u.role === 'ADMIN' ? '降为用户' : '升为管理员' }}
              </button>
              <button type="button" class="ghost-btn danger-btn" :disabled="busyId === u.id" @click="onDelete(u)">
                删除
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
    <p v-if="actionMsg" class="state" :class="actionErr ? 'state-error' : ''">{{ actionMsg }}</p>
  </div>
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