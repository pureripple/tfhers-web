<template>
  <section class="page active">
    <div class="action-bar" style="padding: 8px clamp(18px, 4vw, 28px) 0; max-width: 1200px; margin: 0 auto;">
      <h2 class="hot-news-block-title" style="margin:0">角色教程</h2>
      <button type="button" class="btn btn-secondary btn-sm" :disabled="loading" @click="load">
        <i class="fas fa-sync-alt"></i> 刷新
      </button>
    </div>

    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="vue-state">暂无角色</p>

    <div v-else class="characters-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="character-card"
        @click="openDetail(item.id)"
      >
        <div class="character-avatar-container">
          <img
            class="character-avatar"
            :src="item.avatarUrl || '/images/CSel3_LargePortTianhuo.png'"
            :alt="item.nameZh || item.nameEn || '角色'"
          />
        </div>
        <h3 class="character-name">{{ item.nameZh || item.nameEn || '角色' }}</h3>
        <p v-if="item.nameEn && item.nameZh" class="character-subtitle" style="opacity:0.7;margin:0.25rem 0 0;font-size:0.85rem">
          {{ item.nameEn }}
        </p>
      </article>
    </div>

    <div v-if="detailOpen" class="vue-drawer-mask" @click.self="closeDetail">
      <aside class="vue-drawer">
        <header class="vue-drawer-head">
          <h2>{{ detailChar?.nameZh || detailChar?.nameEn || '角色详情' }}</h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="closeDetail">关闭</button>
        </header>
        <p v-if="detailLoading" class="vue-state">加载中…</p>
        <p v-else-if="detailError" class="vue-state vue-state-error">{{ detailError }}</p>
        <template v-else-if="detailChar">
          <img
            v-if="detailChar.avatarUrl"
            class="vue-detail-cover vue-detail-cover--sq"
            :src="detailChar.avatarUrl"
            alt=""
          />
          <p class="vue-detail-meta">
            <span v-if="detailChar.nameEn">{{ detailChar.nameEn }}</span>
            <span v-if="detailChar.difficultyLevel != null">难度 {{ detailChar.difficultyLevel }}</span>
          </p>
          <p v-if="detailChar.intro" class="vue-detail-block">{{ detailChar.intro }}</p>
          <p v-if="detailChar.background" class="vue-detail-block">{{ detailChar.background }}</p>
          <p v-if="videoUrl" class="vue-detail-block">
            官方视频：
            <a :href="videoUrl" target="_blank" rel="noopener">打开链接</a>
          </p>
          <p class="vue-detail-meta">
            出招 {{ moveCount }} · 官方连段 {{ officialCount }} · 玩家连段 {{ userComboCount }}
          </p>
        </template>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchCharacter, fetchCharacters } from '@/api/characters'
import { ApiError, type CharacterDetail, type GameCharacter } from '@/api/types'

const items = ref<GameCharacter[]>([])
const loading = ref(false)
const error = ref('')

const detailOpen = ref(false)
const detail = ref<CharacterDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

const detailChar = computed(() => detail.value?.character || null)
const videoUrl = computed(
  () => detail.value?.officialVideoUrl || detailChar.value?.officialVideoUrl || '',
)
const moveCount = computed(() => detail.value?.moves?.length ?? 0)
const officialCount = computed(() => detail.value?.officialCombos?.length ?? 0)
const userComboCount = computed(() => detail.value?.userCombos?.length ?? 0)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchCharacters()
    items.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载角色失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detailOpen.value = true
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    detail.value = await fetchCharacter(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载详情失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

onMounted(load)
</script>
