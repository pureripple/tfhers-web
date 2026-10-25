<template>
  <div class="page">
    <header class="page-head">
      <h1>角色</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!items.length" class="state">暂无角色</p>

    <div v-else class="card-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="card card-click"
        @click="openDetail(item.id)"
      >
        <div v-if="item.avatarUrl" class="card-cover-wrap card-cover-wrap--sq">
          <img class="card-cover" :src="item.avatarUrl" alt="" />
        </div>
        <div class="card-body">
          <h2 class="card-title">{{ item.nameZh || item.nameEn || '角色' }}</h2>
          <p class="card-meta">
            <span v-if="item.nameEn">{{ item.nameEn }}</span>
            <span v-if="item.difficultyLevel != null">难度 {{ item.difficultyLevel }}</span>
          </p>
          <p v-if="item.intro" class="card-summary">{{ item.intro }}</p>
        </div>
      </article>
    </div>

    <div v-if="detailOpen" class="drawer-mask" @click.self="closeDetail">
      <aside class="drawer">
        <header class="drawer-head">
          <h2>{{ detailChar?.nameZh || detailChar?.nameEn || '角色详情' }}</h2>
          <button type="button" class="ghost-btn" @click="closeDetail">关闭</button>
        </header>
        <p v-if="detailLoading" class="state">加载中…</p>
        <p v-else-if="detailError" class="state state-error">{{ detailError }}</p>
        <template v-else-if="detailChar">
          <img
            v-if="detailChar.avatarUrl"
            class="detail-cover detail-cover--sq"
            :src="detailChar.avatarUrl"
            alt=""
          />
          <p class="card-meta">
            <span v-if="detailChar.nameEn">{{ detailChar.nameEn }}</span>
            <span v-if="detailChar.difficultyLevel != null">难度 {{ detailChar.difficultyLevel }}</span>
          </p>
          <p v-if="detailChar.intro" class="detail-block">{{ detailChar.intro }}</p>
          <p v-if="detailChar.background" class="detail-block">{{ detailChar.background }}</p>
          <p v-if="videoUrl" class="detail-block">
            官方视频：
            <a :href="videoUrl" target="_blank" rel="noopener">打开链接</a>
          </p>
          <p class="card-meta">
            出招 {{ moveCount }} · 官方连段 {{ officialCount }} · 玩家连段 {{ userComboCount }}
          </p>
        </template>
      </aside>
    </div>
  </div>
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
