<template>
  <section class="page active">
    <div class="rankings-page">
      <div class="rankings-list">
        <div v-if="loading" class="rankings-empty">加载中…</div>
        <div v-else-if="error" class="rankings-empty">{{ error }}</div>
        <div v-else-if="!rows.length" class="rankings-empty">暂无排行</div>
        <div
          v-for="(row, i) in rows"
          v-else
          :key="row.userId ?? i"
          class="ranking-row"
          :class="topClass(row.rank ?? i + 1)"
        >
          <div class="ranking-rank">
            <i v-if="(row.rank ?? i + 1) <= 3" class="fas fa-crown"></i>
            {{ row.rank ?? i + 1 }}
          </div>
          <img class="ranking-avatar" :src="row.avatarUrl || '/images/CSel3_LargePortTianhuo.png'" alt="" />
          <div class="ranking-info">
            <div class="ranking-name">{{ row.nickname || row.username || ('#' + row.userId) }}</div>
            <div class="ranking-meta">
              战绩 {{ row.wins ?? 0 }}胜 / {{ row.losses ?? 0 }}负 · {{ (row.wins ?? 0) + (row.losses ?? 0) }} 场
            </div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">{{ row.rating ?? '-' }}</div>
            <span class="ranking-tier">{{ String(row.tier || 'C').toUpperCase().charAt(0) }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchRankings } from '@/api/rankings'
import { ApiError, type RankingRow } from '@/api/types'

const rows = ref<RankingRow[]>([])
const loading = ref(false)
const error = ref('')

function topClass(rank: number) {
  if (rank === 1) return 'top1'
  if (rank === 2) return 'top2'
  if (rank === 3) return 'top3'
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchRankings(50)
    rows.value = Array.isArray(data?.list) ? data.list : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'error'
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
