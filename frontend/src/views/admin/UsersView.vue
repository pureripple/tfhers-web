<template>
  <section class="page active">
    <div class="action-bar">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          v-model.trim="keyword"
          type="text"
          placeholder="搜索用户名/昵称…"
          @keyup.enter="onSearch"
        />
        <button type="button" class="search-btn" :disabled="loading" @click="onSearch">搜索</button>
      </div>
      <div class="action-buttons" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
        <select v-model="role" class="inline-select" @change="onSearch">
          <option value="">全部角色</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <select v-model="status" class="inline-select" @change="onSearch">
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="0">禁用</option>
        </select>
        <button type="button" class="btn btn-primary" @click="openCreate">
          <i class="fas fa-plus"></i> 创建用户
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
        <h3 class="card-title">用户列表</h3>
        <div class="card-actions"><span class="article-count">共 {{ total }} 人</span></div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无用户</p>
        <table v-else-if="items.length" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>邮箱</th>
              <th>手机</th>
              <th>角色</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in items" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td><span :class="adminNameClass(u)">{{ u.nickname || '-' }}</span></td>
              <td>{{ u.email || '-' }}</td>
              <td>{{ u.phone || '-' }}</td>
              <td>{{ roleLabel(u.role) }}</td>
              <td>{{ Number(u.status) === 1 ? '正常' : '禁用' }}</td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === u.id" @click="openEdit(u)">
                  编辑
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="busyId === u.id"
                  @click="onToggleStatus(u)"
                >
                  {{ Number(u.status) === 1 ? '禁用' : '启用' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="busyId === u.id"
                  @click="onToggleRole(u)"
                >
                  切换角色
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :disabled="busyId === u.id"
                  @click="openReset(u)"
                >
                  重置密码
                </button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  :disabled="busyId === u.id"
                  @click="onDelete(u)"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="pagination" style="padding: 12px; display: flex; gap: 8px; align-items: center">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="page <= 1 || loading"
          @click="page--; load()"
        >
          上一页
        </button>
        <span class="muted">{{ page }} / {{ totalPages }}</span>
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

    <!-- Create -->
    <div v-if="showCreate" class="modal" style="display: block" @click.self="showCreate = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建用户</h3>
          <button type="button" class="modal-close" @click="showCreate = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>用户名 *</label><input v-model.trim="createForm.username" type="text" /></div>
          <div class="form-group"><label>昵称</label><input v-model.trim="createForm.nickname" type="text" /></div>
          <div class="form-group"><label>密码 *</label><input v-model="createForm.password" type="password" /></div>
          <div class="form-group"><label>邮箱</label><input v-model.trim="createForm.email" type="email" /></div>
          <div class="form-group"><label>手机</label><input v-model.trim="createForm.phone" type="text" /></div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="createForm.role">
              <option value="USER">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showCreate = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onCreate">保存</button>
        </div>
      </div>
    </div>

    <!-- Edit -->
    <div v-if="showEdit" class="modal" style="display: block" @click.self="showEdit = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑用户</h3>
          <button type="button" class="modal-close" @click="showEdit = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>昵称</label><input v-model.trim="editForm.nickname" type="text" /></div>
          <div class="form-group"><label>邮箱</label><input v-model.trim="editForm.email" type="email" /></div>
          <div class="form-group"><label>手机</label><input v-model.trim="editForm.phone" type="text" /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showEdit = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onEditSave">保存</button>
        </div>
      </div>
    </div>

    <!-- Reset password -->
    <div v-if="showReset" class="modal" style="display: block" @click.self="showReset = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>重置密码 — {{ resetUser?.username }}</h3>
          <button type="button" class="modal-close" @click="showReset = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>新密码 *</label>
            <input v-model="newPassword" type="password" placeholder="请输入新密码" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showReset = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="saving" @click="onResetSave">确认重置</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  createManagedUser,
  deleteManagedUser,
  fetchManagedUsers,
  resetManagedUserPassword,
  updateManagedUser,
  updateManagedUserRole,
  updateManagedUserStatus,
  type ManagedUser,
} from '@/api/admin/users'
import { ApiError } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'

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
const saving = ref(false)

const showCreate = ref(false)
const createForm = ref({
  username: '',
  nickname: '',
  password: '',
  email: '',
  phone: '',
  role: 'USER',
})

const showEdit = ref(false)
const editForm = ref({ id: 0, nickname: '', email: '', phone: '' })

const showReset = ref(false)
const resetUser = ref<ManagedUser | null>(null)
const newPassword = ref('')

function roleLabel(r?: string) {
  const v = String(r || '').toUpperCase()
  if (v === 'ADMIN') return '管理员'
  if (v === 'USER') return '普通用户'
  return r || '-'
}

function isAdminRole(r?: string) {
  return String(r || '').toUpperCase() === 'ADMIN'
}

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
    totalPages.value =
      data?.totalPages != null ? Number(data.totalPages) : Math.max(1, Math.ceil(total.value / size))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载用户失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  return load()
}

function openCreate() {
  createForm.value = { username: '', nickname: '', password: '', email: '', phone: '', role: 'USER' }
  showCreate.value = true
}

async function onCreate() {
  if (!createForm.value.username || !createForm.value.password) {
    actionMsg.value = '请填写用户名和密码'
    actionErr.value = true
    return
  }
  saving.value = true
  try {
    await createManagedUser({
      username: createForm.value.username,
      nickname: createForm.value.nickname || undefined,
      password: createForm.value.password,
      email: createForm.value.email || null,
      phone: createForm.value.phone || null,
      role: createForm.value.role,
    })
    showCreate.value = false
    actionMsg.value = '用户创建成功'
    actionErr.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '用户创建失败'
  } finally {
    saving.value = false
  }
}

function openEdit(u: ManagedUser) {
  editForm.value = {
    id: u.id,
    nickname: u.nickname || '',
    email: u.email || '',
    phone: u.phone || '',
  }
  showEdit.value = true
}

async function onEditSave() {
  saving.value = true
  try {
    await updateManagedUser(editForm.value.id, {
      nickname: editForm.value.nickname,
      email: editForm.value.email || null,
      phone: editForm.value.phone || null,
    })
    showEdit.value = false
    actionMsg.value = '用户信息更新成功'
    actionErr.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '用户信息更新失败'
  } finally {
    saving.value = false
  }
}

function openReset(u: ManagedUser) {
  resetUser.value = u
  newPassword.value = ''
  showReset.value = true
}

async function onResetSave() {
  if (!resetUser.value) return
  if (!newPassword.value) {
    actionMsg.value = '请输入新密码'
    actionErr.value = true
    return
  }
  saving.value = true
  try {
    await resetManagedUserPassword(resetUser.value.id, newPassword.value)
    showReset.value = false
    actionMsg.value = '密码重置成功'
    actionErr.value = false
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '密码重置失败'
  } finally {
    saving.value = false
  }
}

async function onToggleStatus(u: ManagedUser) {
  const next = Number(u.status) === 1 ? 0 : 1
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
  const next = isAdminRole(u.role) ? 'USER' : 'ADMIN'
  if (!confirm(`确认将「${u.username}」角色改为 ${next === 'ADMIN' ? '管理员' : '普通用户'}？`)) return
  busyId.value = u.id
  try {
    await updateManagedUserRole(u.id, next)
    actionMsg.value = '角色已更新'
    actionErr.value = false
    await load()
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '更新失败'
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
