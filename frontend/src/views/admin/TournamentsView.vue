<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">赛事管理：创建 / 编辑 / 状态 / 代签到 / 生成对阵 / 录入比分</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-primary" @click="openCreate">
          <i class="fas fa-plus"></i> 创建赛事
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
        <h3 class="card-title">赛事列表</h3>
        <div class="card-actions"><span class="article-count">共 {{ items.length }} 场</span></div>
      </div>
      <div class="table-container">
        <p v-if="!loading && !error && !items.length" class="vue-state">暂无赛事</p>
        <table v-else-if="items.length" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>状态</th>
              <th>赛制</th>
              <th>报名</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in items" :key="t.id">
              <td>{{ t.id }}</td>
              <td class="cell-ellipsis">{{ t.title || '-' }}</td>
              <td>{{ statusLabel[t.status || ''] || t.status || '-' }}</td>
              <td>{{ bracketLabel(t.bracketType) }}</td>
              <td>
                {{ t.registrationCount ?? 0 }}
                <span v-if="t.maxSlots != null"> / {{ t.maxSlots }}</span>
              </td>
              <td class="cell-actions">
                <button type="button" class="btn btn-secondary btn-sm" @click="openDetail(t.id)">详情</button>
                <button type="button" class="btn btn-secondary btn-sm" @click="openEdit(t)">编辑</button>
                <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === t.id" @click="onDelete(t)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="detailOpen" class="content-card" style="margin-top:1rem" id="adminTournamentDetail">
      <div class="card-header">
        <h3 class="card-title">{{ detail?.title || '赛事详情' }}</h3>
        <div class="card-actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="detailOpen = false">收起</button>
        </div>
      </div>
      <div class="table-container" style="padding:1rem">
        <p v-if="detailLoading" class="vue-state">加载中…</p>
        <p v-else-if="detailError" class="vue-state vue-state-error">{{ detailError }}</p>
        <template v-else-if="detail">
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:12px">
            <label style="display:flex;gap:8px;align-items:center">
              状态
              <select v-model="detailStatus" class="inline-select">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ statusLabel[s] || s }}</option>
              </select>
            </label>
            <button type="button" class="btn btn-primary btn-sm" :disabled="busyId === detail.id" @click="onStatus">更新状态</button>
            <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === detail.id" @click="onGenerateBracket">生成对阵</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="openEdit(detail)">编辑信息</button>
          </div>
          <p class="vue-detail-meta">
            赛制 {{ bracketLabel(detail.bracketType) }} · 名额 {{ detail.maxSlots ?? '-' }} ·
            报名 {{ regs.length }} · 已签到 {{ checkedInCount }}
          </p>
          <p class="vue-detail-block" style="white-space:pre-wrap">{{ detail.description || '无描述' }}</p>

          <h4 style="margin:1rem 0 0.5rem;font-size:1rem">报名选手（{{ regs.length }}）</h4>
          <ul v-if="regs.length" style="margin:8px 0 0;padding-left:18px">
            <li v-for="(r, i) in regs" :key="i" style="margin:4px 0">
              <span :class="adminNameClass(r)">{{ r.nickname || r.username || ('用户' + r.userId) }}</span>
              <template v-if="r.rating != null"> · Elo {{ r.rating }}</template>
              <template v-if="r.seed != null"> · 签位{{ r.seed }}</template>
              <template v-if="r.finalPlacement != null"> · 名次 #{{ r.finalPlacement }}</template>
              <template v-if="r.wins != null || r.losses != null"> · {{ r.wins || 0 }}胜{{ r.losses || 0 }}负</template>
              —
              <span v-if="isCheckedIn(r)" style="color:#5fd9cc">已签到</span>
              <span v-else style="opacity:.55">未签到</span>
              <button
                v-if="!isCheckedIn(r) && r.userId"
                type="button"
                class="btn btn-secondary btn-sm"
                style="margin-left:6px"
                :disabled="busyId === detail.id"
                @click="onForceCheckIn(Number(r.userId))"
              >代签到</button>
            </li>
          </ul>
          <div v-else style="opacity:.6;margin-top:6px">暂无报名</div>

          <div v-if="matches.length" style="margin-top:14px">
            <h4 style="margin:0 0 8px">录入比分</h4>
            <div style="display:grid;gap:8px">
              <div
                v-for="m in matches"
                :key="matchKey(m)"
                style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px;border:1px solid var(--border-color);border-radius:8px"
              >
                <span style="min-width:120px">{{ matchLabel(m) }}</span>
                <span :class="adminNameClass({ isAdmin: m.player1IsAdmin })">{{ m.player1Nickname || (m.player1UserId ? '用户' + m.player1UserId : '待定') }}</span>
                <input
                  v-model.number="scoreDraft[matchKey(m)].s1"
                  type="number"
                  min="0"
                  style="width:64px"
                  :disabled="isMatchDone(m)"
                />
                <span>:</span>
                <input
                  v-model.number="scoreDraft[matchKey(m)].s2"
                  type="number"
                  min="0"
                  style="width:64px"
                  :disabled="isMatchDone(m)"
                />
                <span :class="adminNameClass({ isAdmin: m.player2IsAdmin })">{{ m.player2Nickname || (m.player2UserId ? '用户' + m.player2UserId : '待定') }}</span>
                <button
                  v-if="!isMatchDone(m)"
                  type="button"
                  class="btn btn-primary btn-sm"
                  :disabled="busyMatchId === matchKey(m)"
                  @click="onSubmitScore(m)"
                >录入</button>
                <span v-else style="opacity:.7">已结束</span>
              </div>
            </div>
          </div>
          <p v-else style="opacity:.6;margin-top:14px">尚未生成对阵</p>
        </template>
      </div>
    </div>

    <p v-if="actionMsg" class="vue-state" :class="actionErr ? 'vue-state-error' : ''">{{ actionMsg }}</p>

    <div v-if="showForm" class="modal" style="display:block" @click.self="showForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ form.id ? '编辑赛事' : '创建赛事' }}</h3>
          <button type="button" class="modal-close" @click="showForm = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="form-group"><label>名称 *</label><input v-model.trim="form.title" type="text" /></div>
          <div class="form-group"><label>描述</label><textarea v-model.trim="form.description" rows="3" style="width:100%"></textarea></div>
          <div class="form-group">
            <label>名额</label>
            <select v-model.number="form.maxSlots">
              <option :value="8">8</option>
              <option :value="16">16</option>
            </select>
          </div>
          <div class="form-group">
            <label>赛制</label>
            <select v-model="form.bracketType">
              <option value="single_elim">单败淘汰</option>
              <option value="double_elim">双败淘汰</option>
            </select>
          </div>
          <div v-if="!form.id" class="form-group">
            <label>初始状态</label>
            <select v-model="form.status">
              <option v-for="s in statusOptions" :key="s" :value="s">{{ statusLabel[s] || s }}</option>
            </select>
          </div>
          <div class="form-group"><label>报名开始</label><input v-model="form.registrationOpensAt" type="datetime-local" /></div>
          <div class="form-group"><label>报名截止</label><input v-model="form.registrationClosesAt" type="datetime-local" /></div>
          <div class="form-group"><label>开赛时间</label><input v-model="form.startsAt" type="datetime-local" /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="showForm = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="savingForm" @click="onSaveForm">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  adminForceCheckIn,
  createAdminTournament,
  deleteAdminTournament,
  fetchAdminTournamentDetail,
  fetchAdminTournaments,
  generateTournamentBracket,
  submitMatchResult,
  updateAdminTournament,
  updateTournamentStatus,
  type TournamentMatch,
  type TournamentRegistration,
} from '@/api/admin/tournaments'
import { ApiError, type Tournament } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'

const statusOptions = ['draft', 'registration', 'closed', 'ongoing', 'finished', 'cancelled']
const statusLabel: Record<string, string> = {
  draft: '草稿',
  registration: '报名中',
  closed: '报名截止',
  ongoing: '进行中',
  finished: '已结束',
  cancelled: '已取消',
}

const items = ref<Tournament[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)
const busyMatchId = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref(false)

const detailOpen = ref(false)
const detail = ref<Tournament | null>(null)
const regs = ref<TournamentRegistration[]>([])
const matches = ref<TournamentMatch[]>([])
const detailStatus = ref('draft')
const detailLoading = ref(false)
const detailError = ref('')
const scoreDraft = reactive<Record<number, { s1: number; s2: number }>>({})

const showForm = ref(false)
const savingForm = ref(false)
const form = ref({
  id: 0,
  title: '',
  description: '',
  maxSlots: 16,
  bracketType: 'single_elim',
  status: 'draft',
  registrationOpensAt: '',
  registrationClosesAt: '',
  startsAt: '',
})

const checkedInCount = computed(() => regs.value.filter((r) => isCheckedIn(r)).length)

function bracketLabel(t?: string) {
  if (t === 'double_elim') return '双败'
  if (t === 'single_elim') return '单败'
  return t || '-'
}
function isCheckedIn(r: TournamentRegistration) {
  return r.checkedIn === 1 || r.checkedIn === true
}
function matchKey(m: TournamentMatch) {
  return Number(m.id ?? m.matchId ?? 0)
}
function isMatchDone(m: TournamentMatch) {
  const st = String(m.status || '').toLowerCase()
  return st === 'finished' || st === 'done' || st === 'completed'
}
function matchLabel(m: TournamentMatch) {
  const side =
    m.bracketSide === 'winners'
      ? '[胜] '
      : m.bracketSide === 'losers'
        ? '[败] '
        : m.bracketSide === 'grand_final'
          ? '[总决] '
          : ''
  return side + (m.roundLabel || ('R' + (m.round ?? '?'))) + ' #' + ((m.matchIndex || 0) + 1)
}
function toLocalInput(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(v: string) {
  if (!v) return undefined
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchAdminTournaments()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载赛事失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = {
    id: 0,
    title: '',
    description: '',
    maxSlots: 16,
    bracketType: 'single_elim',
    status: 'draft',
    registrationOpensAt: '',
    registrationClosesAt: '',
    startsAt: '',
  }
  showForm.value = true
}

function openEdit(t: Tournament) {
  form.value = {
    id: t.id,
    title: t.title || '',
    description: String(t.description || ''),
    maxSlots: Number(t.maxSlots) === 8 ? 8 : 16,
    bracketType: String(t.bracketType || 'single_elim'),
    status: String(t.status || 'draft'),
    registrationOpensAt: toLocalInput(t.registrationOpensAt as string),
    registrationClosesAt: toLocalInput(t.registrationClosesAt as string),
    startsAt: toLocalInput(t.startsAt as string),
  }
  showForm.value = true
}

async function onSaveForm() {
  if (!form.value.title) {
    actionMsg.value = '请填写名称'
    actionErr.value = true
    return
  }
  savingForm.value = true
  actionMsg.value = ''
  try {
    const payload: Record<string, unknown> = {
      title: form.value.title,
      description: form.value.description,
      maxSlots: form.value.maxSlots,
      bracketType: form.value.bracketType,
    }
    const opens = fromLocalInput(form.value.registrationOpensAt)
    const closes = fromLocalInput(form.value.registrationClosesAt)
    const starts = fromLocalInput(form.value.startsAt)
    if (opens) payload.registrationOpensAt = opens
    if (closes) payload.registrationClosesAt = closes
    if (starts) payload.startsAt = starts
    let tid = form.value.id
    if (form.value.id) {
      await updateAdminTournament(form.value.id, payload)
    } else {
      payload.status = form.value.status
      const created = await createAdminTournament(payload)
      tid = (created as Tournament)?.id || tid
    }
    showForm.value = false
    actionMsg.value = '保存成功'
    actionErr.value = false
    await load()
    if (tid) await openDetail(tid)
  } catch (e) {
    actionMsg.value = e instanceof ApiError ? e.message : '保存失败'
    actionErr.value = true
  } finally {
    savingForm.value = false
  }
}

async function openDetail(id: number) {
  detailOpen.value = true
  detail.value = null
  regs.value = []
  matches.value = []
  detailError.value = ''
  detailLoading.value = true
  try {
    const data = await fetchAdminTournamentDetail(id)
    detail.value = data?.tournament || null
    detailStatus.value = String(data?.tournament?.status || 'draft')
    regs.value = Array.isArray(data?.registrations) ? data!.registrations! : []
    const ms = data?.bracket?.matches
    matches.value = Array.isArray(ms) ? ms : []
    for (const m of matches.value) {
      const key = matchKey(m)
      scoreDraft[key] = {
        s1: Number(m.score1 ?? 0),
        s2: Number(m.score2 ?? 0),
      }
    }
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

async function onStatus() {
  if (!detail.value) return
  busyId.value = detail.value.id
  try {
    await updateTournamentStatus(detail.value.id, detailStatus.value)
    actionMsg.value = '状态已更新'
    actionErr.value = false
    await load()
    await openDetail(detail.value.id)
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '更新失败'
  } finally {
    busyId.value = null
  }
}

async function onGenerateBracket() {
  if (!detail.value) return
  if (
    !confirm(
      '将按全部已报名选手（不论是否签到）用 Elo 分桶排签生成对阵图，确认？\n未到场/未签到由主办方事后处理。\n建议先把状态设为「报名截止」或「进行中」。',
    )
  )
    return
  busyId.value = detail.value.id
  try {
    await generateTournamentBracket(detail.value.id, true)
    actionMsg.value = '对阵已生成'
    actionErr.value = false
    await load()
    await openDetail(detail.value.id)
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '生成失败'
  } finally {
    busyId.value = null
  }
}

async function onForceCheckIn(userId: number) {
  if (!detail.value) return
  if (!confirm('确认为该选手代签到？')) return
  busyId.value = detail.value.id
  try {
    await adminForceCheckIn(detail.value.id, userId)
    actionMsg.value = '已代签到'
    actionErr.value = false
    await openDetail(detail.value.id)
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '代签到失败'
  } finally {
    busyId.value = null
  }
}

async function onSubmitScore(m: TournamentMatch) {
  const id = matchKey(m)
  if (!id || !detail.value) return
  const draft = scoreDraft[id]
  if (!draft || Number.isNaN(draft.s1) || Number.isNaN(draft.s2)) {
    actionMsg.value = '请填写双方比分'
    actionErr.value = true
    return
  }
  busyMatchId.value = id
  try {
    await submitMatchResult(id, Number(draft.s1), Number(draft.s2))
    actionMsg.value = '比分已录入'
    actionErr.value = false
    await openDetail(detail.value.id)
  } catch (e) {
    actionErr.value = true
    actionMsg.value = e instanceof ApiError ? e.message : '录入失败'
  } finally {
    busyMatchId.value = null
  }
}

async function onDelete(t: Tournament) {
  if (!confirm(`确认删除赛事「${t.title || t.id}」？将同时删除报名与对阵。`)) return
  busyId.value = t.id
  try {
    await deleteAdminTournament(t.id)
    actionMsg.value = '已删除'
    actionErr.value = false
    if (detail.value?.id === t.id) detailOpen.value = false
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
