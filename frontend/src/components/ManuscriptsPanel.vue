<template>
  <section id="manuscripts" class="page page-manuscripts active">
    <div class="settings-page-wrap manuscripts-page-wrap">
      <header class="settings-page-header">
        <h1 class="settings-page-title">稿件管理</h1>
        <p class="settings-page-desc">管理你发布的资讯与连段</p>
      </header>

      <div class="manuscripts-tabs" role="tablist" aria-label="稿件类型">
        <button type="button" class="manuscripts-tab" :class="{ 'is-active': tab === 'articles' }" role="tab" :aria-selected="tab === 'articles'" @click="tab = 'articles'">
          资讯 <span class="manuscripts-tab-count">{{ articles.length }}</span>
        </button>
        <button type="button" class="manuscripts-tab" :class="{ 'is-active': tab === 'combos' }" role="tab" :aria-selected="tab === 'combos'" @click="tab = 'combos'">
          连段 <span class="manuscripts-tab-count">{{ combos.length }}</span>
        </button>
      </div>

      <div class="manuscripts-panels">
        <div class="manuscripts-panel" :class="{ 'is-active': tab === 'articles' }" role="tabpanel" :hidden="tab !== 'articles'">
          <div class="my-content-list manuscripts-list">
            <div v-if="loading" class="my-content-empty">加载中…</div>
            <div v-else-if="error" class="my-content-empty">{{ error }}</div>
            <div v-else-if="!articles.length" class="my-content-empty">暂无资讯</div>
            <div v-for="a in articles" :key="a.id" class="my-content-item" :data-id="a.id">
              <div class="my-content-item-main">
                <div class="my-content-item-title">{{ a.title || '无标题' }}</div>
                <div class="my-content-item-meta">{{ fmt(a.createdAt || a.created_at) }} · {{ a.viewCount ?? a.view_count ?? 0 }} 阅读</div>
              </div>
              <div class="my-content-item-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === a.id" @click="removeArticle(a.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="manuscripts-panel" :class="{ 'is-active': tab === 'combos' }" role="tabpanel" :hidden="tab !== 'combos'">
          <div class="my-content-list manuscripts-list">
            <div v-if="loading" class="my-content-empty">加载中…</div>
            <div v-else-if="!combos.length" class="my-content-empty">暂无连段</div>
            <div v-for="c in combos" :key="c.id" class="my-content-item" :data-id="c.id">
              <div class="my-content-item-main">
                <div class="my-content-item-title">{{ c.title || '未命名连段' }}</div>
                <div class="my-content-item-meta">{{ fmt(c.createdAt || c.created_at) }}</div>
              </div>
              <div class="my-content-item-actions">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="busyId === c.id" @click="removeCombo(c.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteArticle, fetchMyArticles } from '@/api/articles'
import { deleteMyCombo, fetchMyCombos, type ComboItem } from '@/api/user'
import { ApiError, type Article } from '@/api/types'

const tab = ref<'articles' | 'combos'>('articles')
const articles = ref<Article[]>([])
const combos = ref<ComboItem[]>([])
const loading = ref(false)
const error = ref('')
const busyId = ref<number | null>(null)

function fmt(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [a, c] = await Promise.all([
      fetchMyArticles().catch(() => [] as Article[]),
      fetchMyCombos().catch(() => [] as ComboItem[]),
    ])
    articles.value = Array.isArray(a) ? a : []
    combos.value = Array.isArray(c) ? c : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function removeArticle(id: number) {
  if (!window.confirm('确定删除该资讯？')) return
  busyId.value = id
  try {
    await deleteArticle(id)
    articles.value = articles.value.filter((x) => x.id !== id)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '删除失败')
  } finally {
    busyId.value = null
  }
}

async function removeCombo(id: number) {
  if (!window.confirm('确定删除该连段？')) return
  busyId.value = id
  try {
    await deleteMyCombo(id)
    combos.value = combos.value.filter((x) => x.id !== id)
  } catch (e) {
    window.alert(e instanceof ApiError ? e.message : '删除失败')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>
