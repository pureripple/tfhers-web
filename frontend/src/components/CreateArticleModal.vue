<template>
  <div
    id="createArticleModal"
    class="modal"
    :style="{ display: open ? 'block' : 'none' }"
    :aria-hidden="open ? 'false' : 'true'"
    @click.self="emit('close')"
  >
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>发布资讯</h3>
        <button class="modal-close" type="button" @click="emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="createArticleForm" @submit.prevent="submit">
          <div class="form-group">
            <label for="createArticleTitle">标题 *</label>
            <input id="createArticleTitle" v-model.trim="title" type="text" required placeholder="请输入资讯标题" />
          </div>
          <div class="form-group">
            <label for="createArticleSummary">摘要</label>
            <input id="createArticleSummary" v-model.trim="summary" type="text" placeholder="一句话概括资讯内容（可选）" />
          </div>
          <div class="form-group">
            <label>封面（可选）</label>
            <div style="margin-bottom:8px;">
              <input ref="coverInput" type="file" accept="image/*" style="display:none;" @change="onCoverPick" />
              <button type="button" class="btn btn-outline btn-sm" @click="coverInput && coverInput.click()">
                <i class="fas fa-image"></i> 选择封面
              </button>
            </div>
            <div v-if="coverUrl" style="margin-top:8px;">
              <img :src="coverUrl" alt="" style="max-width:200px;max-height:120px;border-radius:8px;border:1px solid var(--border-color);" />
              <button type="button" class="btn btn-outline btn-sm" style="margin-left:8px;vertical-align:top;" @click="clearCover">移除封面</button>
            </div>
          </div>
          <div class="form-group">
            <label for="createArticleContent">内容 *</label>
            <textarea
              id="createArticleContent"
              v-model.trim="content"
              rows="8"
              class="create-article-content"
              placeholder="请输入资讯正文内容"
            ></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" @click="emit('close')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
          <i class="fas fa-paper-plane"></i> 发布
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { createArticle } from '@/api/articles'
import { uploadArticleCover } from '@/api/user'
import { useUserAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const auth = useUserAuthStore()
const title = ref('')
const summary = ref('')
const content = ref('')
const coverUrl = ref('')
const submitting = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      title.value = ''
      summary.value = ''
      content.value = ''
      coverUrl.value = ''
      if (coverInput.value) coverInput.value.value = ''
    }
  },
)

function clearCover() {
  coverUrl.value = ''
  if (coverInput.value) coverInput.value.value = ''
}

async function onCoverPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    window.alert('请选择图片文件')
    return
  }
  try {
    coverUrl.value = await uploadArticleCover(file)
  } catch (err) {
    window.alert(err instanceof ApiError ? err.message : '上传失败')
  }
}

async function submit() {
  if (!title.value) {
    window.alert('请输入资讯标题')
    return
  }
  if (!content.value) {
    window.alert('请输入资讯内容')
    return
  }
  submitting.value = true
  try {
    const u = auth.user
    await createArticle({
      title: title.value,
      summary: summary.value || '',
      content: content.value,
      coverUrl: coverUrl.value || '',
      author: u?.nickname || u?.username || '匿名用户',
      viewCount: 0,
    })
    window.alert('发布成功！')
    emit('created')
    emit('close')
  } catch (err) {
    window.alert(err instanceof ApiError ? err.message : '发布失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-article-content {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
</style>
