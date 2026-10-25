<template>
  <div class="page">
    <header class="page-head">
      <h1>排行</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p v-if="description" class="page-desc">{{ description }}</p>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>
    <p v-else-if="!rows.length" class="state">暂无排名</p>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>名次</th>
            <th>玩家</th>
            <th>段位</th>
            <th>积分</th>
            <th>战绩</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="row.userId ?? i">
            <td>{{ row.rank ?? i + 1 }}</td>
            <td class="cell-player">
              <img
                v-if="row.avatarUrl"
                class="avatar"
                :src="row.avatarUrl"
                alt=""
              />
              <span>{{ row.nickname || row.username || ('用户#' + row.userId) }}</span>
            </td>
            <td><span class="tier">{{ row.tier || '-' }}</span></td>
            <td>{{ row.rating ?? '-' }}</td>
            <td>{{ (row.wins ?? 0) }}胜 / {{ (row.losses ?? 0) }}负</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchRankings } from '@/api/rankings'
import { ApiError, type RankingRow } from '@/api/types'

const rows = ref<RankingRow[]>([])
const description = ref('')
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchRankings(50)
    rows.value = Array.isArray(data?.list) ? data.list : []
    description.value = data?.description || ''
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载排行失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
