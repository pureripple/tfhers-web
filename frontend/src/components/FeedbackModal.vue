<template>
  <div
    id="feedbackModal"
    class="modal"
    :style="{ display: open ? 'block' : 'none' }"
    :aria-hidden="open ? 'false' : 'true'"
    @click.self="emit('close')"
  >
    <div class="modal-content modal-large feedback-modal-content">
      <div class="modal-header">
        <h3>问题反馈</h3>
        <button class="modal-close" type="button" aria-label="关闭" @click="emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body feedback-modal-body">
        <div class="feedback-tabs" role="tablist">
          <button type="button" class="feedback-tab" :class="{ active: tab === 'submit' }" @click="switchTab('submit')">提交反馈</button>
          <button type="button" class="feedback-tab" :class="{ active: tab === 'mine' }" @click="switchTab('mine')">
            我的反馈
            <span class="feedback-tab-unread-dot" :hidden="unreadCount <= 0"></span>
          </button>
        </div>

        <div v-show="tab === 'submit'" class="feedback-pane">
          <form id="feedbackForm" @submit.prevent="submit">
            <div class="form-group">
              <label for="feedbackCategory">类型 *</label>
              <select id="feedbackCategory" v-model="category" class="select-input" style="width:100%;">
                <option value="bug">问题 / Bug</option>
                <option value="suggestion">功能建议</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label for="feedbackTitle">标题 *</label>
              <input id="feedbackTitle" v-model.trim="title" type="text" maxlength="100" placeholder="一句话概括问题或建议" required />
            </div>
            <div class="form-group">
              <label for="feedbackContent">详细描述 *</label>
              <textarea id="feedbackContent" v-model.trim="content" rows="6" maxlength="2000" class="feedback-content-ta" placeholder="请尽量描述复现步骤、期望结果等" required></textarea>
            </div>
            <div class="form-group">
              <label for="feedbackContact">联系方式（可选）</label>
              <input id="feedbackContact" v-model.trim="contact" type="text" maxlength="100" placeholder="QQ / 邮箱 / Steam，方便我们回访" />
            </div>
          </form>
          <div class="modal-footer" style="padding:0;border:none;justify-content:flex-end;">
            <button type="button" class="btn btn-outline" @click="emit('close')">取消</button>
            <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
              <i class="fas fa-paper-plane"></i> 提交
            </button>
          </div>
        </div>

        <div v-show="tab === 'mine'" class="feedback-pane">
          <div class="feedback-mine-list">
            <div v-if="mineLoading" class="feedback-empty">加载中…</div>
            <div v-else-if="mineError" class="feedback-empty">{{ mineError }}</div>
            <div v-else-if="!mineList.length" class="feedback-empty">暂无反馈记录，去「提交反馈」告诉我们吧</div>
            <div v-for="item in mineList" :key="item.id" class="feedback-item" :class="{ 'feedback-item--unread': isUnread(item) }">
              <div class="feedback-item-head">
                <div class="feedback-item-title">{{ item.title || '' }}</div>
                <span class="feedback-status" :class="'status-' + Number(item.status || 0)">{{ statusText(item.status) }}</span>
              </div>
              <div class="feedback-item-meta">{{ categoryText(item.category) }} · {{ fmtTime(item.createdAt || item.created_at) }}</div>
              <div class="feedback-item-content">{{ item.content || '' }}</div>
              <div class="feedback-item-reply">
                <div class="feedback-item-reply-label">
                  处理结果
                  <template v-if="item.adminReply || item.admin_reply">
                    <template v-if="item.repliedAt || item.replied_at"> · {{ fmtTime(item.repliedAt || item.replied_at) }}</template>
                  </template>
                </div>
                <div v-if="item.adminReply || item.admin_reply" class="feedback-item-content">{{ item.adminReply || item.admin_reply }}</div>
                <div v-else class="feedback-item-content" style="color:var(--text-secondary);">暂未回复，请耐心等待</div>
              </div>
            </div>
          </div>
          <div class="feedback-mine-pager">
            <button v-if="page > 1" type="button" class="btn btn-outline btn-sm" @click="loadMine(page - 1)">上一页</button>
            <span v-if="total > 0" style="font-size:12px;color:var(--text-secondary);">第 {{ page }} / {{ totalPages }} 页</span>
            <button v-if="page < totalPages" type="button" class="btn btn-outline btn-sm" @click="loadMine(page + 1)">下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchFeedbackUnreadCount,
  fetchMyFeedback,
  markFeedbackRead,
  submitFeedback,
  type FeedbackItem,
} from '@/api/user'
import { ApiError } from '@/api/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; unread: [number] }>()

const tab = ref<'submit' | 'mine'>('submit')
const category = ref('bug')
const title = ref('')
const content = ref('')
const contact = ref('')
const submitting = ref(false)

const mineList = ref<FeedbackItem[]>([])
const mineLoading = ref(false)
const mineError = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = 8
const unreadCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

watch(
  () => props.open,
  (v) => {
    if (v) {
      tab.value = 'submit'
      category.value = 'bug'
      title.value = ''
      content.value = ''
      contact.value = ''
      refreshUnread()
    }
  },
)

function statusText(status?: number) {
  const map: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '已处理', 3: '已关闭' }
  const n = Number(status || 0)
  return map[n] != null ? map[n] : '状态' + n
}
function categoryText(cat?: string) {
  const map: Record<string, string> = { bug: '问题/Bug', suggestion: '功能建议', other: '其他' }
  return map[cat || ''] || cat || '其他'
}
function fmtTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').substring(0, 19)
}
function isUnread(item: FeedbackItem) {
  return item.unread === true || item.unread === 1 || item.unread === 'true'
}

async function refreshUnread() {
  try {
    const data = await fetchFeedbackUnreadCount()
    unreadCount.value = Number(data?.count) || 0
    emit('unread', unreadCount.value)
  } catch {
    unreadCount.value = 0
  }
}

async function switchTab(next: 'submit' | 'mine') {
  tab.value = next
  if (next === 'mine') {
    await loadMine(1)
    try {
      await markFeedbackRead()
      await refreshUnread()
    } catch {
      /* ignore */
    }
  }
}

async function loadMine(p: number) {
  page.value = p
  mineLoading.value = true
  mineError.value = ''
  try {
    const data = await fetchMyFeedback(p, pageSize)
    mineList.value = Array.isArray(data?.list) ? data.list : []
    total.value = Number(data?.total) || 0
  } catch (e) {
    mineError.value = e instanceof ApiError ? e.message : '加载失败'
    mineList.value = []
  } finally {
    mineLoading.value = false
  }
}

async function submit() {
  if (!title.value) {
    window.alert('请填写标题')
    return
  }
  if (!content.value) {
    window.alert('请填写详细描述')
    return
  }
  submitting.value = true
  try {
    await submitFeedback({
      category: category.value,
      title: title.value,
      content: content.value,
      contact: contact.value || null,
    })
    window.alert('提交成功')
    title.value = ''
    content.value = ''
    contact.value = ''
    await switchTab('mine')
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.feedback-content-ta {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
