<template>
  <section class="page active">
    <div class="action-bar">
      <div>
        <p class="stats-page-desc">汇总平台运营数据：内容量与待办对比、Steam 时长分布等。</p>
        <p v-if="updatedAt" class="stats-page-meta">上次刷新：{{ updatedAt }}</p>
      </div>
      <div class="action-buttons">
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
      </div>
    </div>

    <p v-if="loading" class="vue-state">加载中…</p>
    <p v-else-if="error" class="vue-state vue-state-error">{{ error }}</p>

    <div v-else class="stats-kpi-grid">
      <div class="stat-kpi-card">
        <div class="stat-kpi-label">资讯总数</div>
        <div class="stat-kpi-value">{{ kpis.articleCount }}</div>
      </div>
      <div class="stat-kpi-card">
        <div class="stat-kpi-label">用户连段（待审）</div>
        <div class="stat-kpi-value">{{ kpis.pendingCombos }}</div>
      </div>
      <div class="stat-kpi-card">
        <div class="stat-kpi-label">待处理举报</div>
        <div class="stat-kpi-value">{{ kpis.reportsOpen }}</div>
      </div>
      <div class="stat-kpi-card">
        <div class="stat-kpi-label">待审评论</div>
        <div class="stat-kpi-value">{{ kpis.commentsPending }}</div>
      </div>
    </div>

    <div class="content-card" style="margin-top:1rem">
      <div class="card-header">
        <h3 class="card-title">Steam 时长 Top10</h3>
      </div>
      <div class="table-container">
        <p v-if="steamError" class="vue-state vue-state-error">{{ steamError }}</p>
        <p v-else-if="!steamTop.length" class="vue-state">暂无数据</p>
        <table v-else class="data-table">
          <thead>
            <tr><th>#</th><th>玩家</th><th>时长(小时)</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in steamTop" :key="i">
              <td>{{ i + 1 }}</td>
              <td>{{ row.nickname || row.username || '-' }}</td>
              <td>{{ hoursOf(row) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="content-card" style="margin-top:1rem">
      <div class="card-header">
        <h3 class="card-title">站点成就解锁</h3>
      </div>
      <div class="table-container">
        <p v-if="achError" class="vue-state vue-state-error">{{ achError }}</p>
        <p v-else-if="!achievements.length" class="vue-state">暂无数据</p>
        <table v-else class="data-table">
          <thead>
            <tr><th>成就</th><th>解锁数</th><th>样本</th></tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in achievements.slice(0, 30)" :key="a.apiName || i">
              <td>{{ a.displayName || a.apiName || '-' }}</td>
              <td>{{ a.unlockCount ?? '-' }}</td>
              <td>{{ achSample }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  fetchDashboardKpis,
  fetchSteamAchievementsSite,
  fetchSteamPlaytime,
} from '@/api/admin/statistics'
import type { SteamAchievementsSiteData, SteamPlaytimeData } from '@/api/admin/types'
import { ApiError } from '@/api/types'

const loading = ref(false)
const error = ref('')
const steamError = ref('')
const achError = ref('')
const updatedAt = ref('')
const kpis = reactive({
  articleCount: 0,
  pendingCombos: 0,
  reportsOpen: 0,
  commentsPending: 0,
})
const steamTop = ref<NonNullable<SteamPlaytimeData['top10']>>([])
const achievements = ref<NonNullable<SteamAchievementsSiteData['achievements']>>([])
const achSample = ref<number | string>('-')

function hoursOf(row: { playtimeHours?: number; playtimeMinutes?: number }) {
  if (row.playtimeHours != null) return Number(row.playtimeHours).toFixed(1)
  if (row.playtimeMinutes != null) return (Number(row.playtimeMinutes) / 60).toFixed(1)
  return '-'
}

async function load() {
  loading.value = true
  error.value = ''
  steamError.value = ''
  achError.value = ''
  try {
    const data = await fetchDashboardKpis()
    Object.assign(kpis, data)
    updatedAt.value = new Date().toLocaleString('zh-CN')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载统计失败'
  } finally {
    loading.value = false
  }

  try {
    const steam = await fetchSteamPlaytime()
    steamTop.value = Array.isArray(steam?.top10) ? steam.top10 : []
  } catch (e) {
    steamTop.value = []
    steamError.value = e instanceof ApiError ? e.message : 'Steam 时长加载失败'
  }

  try {
    const site = await fetchSteamAchievementsSite()
    achievements.value = Array.isArray(site?.achievements) ? site.achievements : []
    achSample.value = site?.sampleSize != null ? site.sampleSize : '-'
  } catch (e) {
    achievements.value = []
    achError.value = e instanceof ApiError ? e.message : '成就统计加载失败'
  }
}

onMounted(load)
</script>