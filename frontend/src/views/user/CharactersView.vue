<template>
  <section class="page active">
    <div class="characters-grid" v-if="items.length">
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
            :alt="item.nameZh || item.nameEn || ''"
          />
        </div>
        <h3 class="character-name">{{ item.nameZh || item.nameEn || '' }}</h3>
        <p v-if="item.nameEn && item.nameZh" class="character-subtitle" style="opacity:0.7;margin:0.25rem 0 0;font-size:0.85rem">
          {{ item.nameEn }}
        </p>
      </article>
    </div>
    <div v-else-if="!loading" class="characters-grid">
      <div class="room-empty" style="grid-column:1/-1;text-align:center;padding:2rem;">暂无角色</div>
    </div>

    <div v-if="detailOpen" class="modal" style="display:block" @click.self="closeDetail">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ detailChar?.nameZh || detailChar?.nameEn || '' }}</h3>
          <button type="button" class="modal-close" @click="closeDetail"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div v-if="detailLoading" class="room-empty">加载中…</div>
          <div v-else-if="detailError" class="room-empty">{{ detailError }}</div>
          <template v-else-if="detailChar">
            <img v-if="detailChar.avatarUrl" :src="detailChar.avatarUrl" alt="" style="max-width:160px;border-radius:8px;margin-bottom:12px;" />
            <p v-if="detailChar.nameEn"><strong>EN</strong> {{ detailChar.nameEn }}</p>
            <p v-if="detailChar.difficultyLevel != null"><strong>难度</strong> {{ detailChar.difficultyLevel }}</p>
            <p v-if="detailChar.intro">{{ detailChar.intro }}</p>
            <p v-if="detailChar.background">{{ detailChar.background }}</p>
            <p v-if="videoUrl"><a :href="videoUrl" target="_blank" rel="noopener">官方视频</a></p>
            <p class="room-empty" style="text-align:left;padding:0;">
              招式 {{ moveCount }} · 官方连段 {{ officialCount }} · 用户连段 {{ userComboCount }}
            </p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchCharacter, fetchCharacters } from '@/api/characters'
import { ApiError, type CharacterDetail, type GameCharacter } from '@/api/types'

const items = ref<GameCharacter[]>([])
const loading = ref(false)
const detailOpen = ref(false)
const detail = ref<CharacterDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

const detailChar = computed(() => detail.value?.character || null)
const videoUrl = computed(() => detail.value?.officialVideoUrl || detailChar.value?.officialVideoUrl || '')
const moveCount = computed(() => detail.value?.moves?.length ?? 0)
const officialCount = computed(() => detail.value?.officialCombos?.length ?? 0)
const userComboCount = computed(() => detail.value?.userCombos?.length ?? 0)

async function load() {
  loading.value = true
  try {
    const data = await fetchCharacters()
    items.value = Array.isArray(data) ? data : []
  } catch {
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
    detailError.value = e instanceof ApiError ? e.message : 'error'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

onMounted(load)
</script>
