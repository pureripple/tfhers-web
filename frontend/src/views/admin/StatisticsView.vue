<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>数据统计</h1>
      <button type="button" class="ghost-btn" :disabled="loading" @click="load">刷新</button>
    </header>
    <p class="page-desc">待办与站点概况（对齐旧管理端 KPI）。</p>

    <p v-if="loading" class="state">加载中…</p>
    <p v-else-if="error" class="state state-error">{{ error }}</p>

    <div v-else class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">资讯总数</div>
        <div class="kpi-value">{{ kpis.articleCount }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">待审连招</div>
        <div class="kpi-value">{{ kpis.pendingCombos }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">待处理举报</div>
        <div class="kpi-value">{{ kpis.reportsOpen }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">待审评论</div>
        <div class="kpi-value">{{ kpis.commentsPending }}</div>
      </div>
    </div>

    <section class="admin-section">
      <h2>Steam 时长 Top10</h2>
      <p v-if="steamError" class="state state-error">{{ steamError }}</p>
      <p v-else-if="!steamTop.length" class="state">暂无数据</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>玩家</th>
              <th>时长(小时)</th>
            </tr>
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
    </section>

    <section class="admin-section">
      <h2>站点成就解锁</h2>
      <p v-if="achError" class="state state-error">{{ achError }}</p>
      <p v-else-if="!achievements.length" class="state">暂无数据</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>成就</th>
              <th>解锁数</th>
              <th>样本</th>
            </tr>
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
      <p v-if="updatedAt" class="state">更新于 {{ updatedAt }}</p>
    </section>
  </div>
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