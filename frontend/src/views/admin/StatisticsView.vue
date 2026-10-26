<template>
  <section class="page active">
    <div class="action-bar">
      <div>
        <p class="stats-page-desc">
          运营平台核心数据：资讯总量、待审内容、举报、Steam 时长分布等；可按业务需要扩展图表与报表导出。
        </p>
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
        <div class="stat-kpi-label">资讯总量</div>
        <div class="stat-kpi-value">{{ kpis.articleCount }}</div>
      </div>
      <div class="stat-kpi-card">
        <div class="stat-kpi-label">用户连招（待审）</div>
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

    <div class="stats-charts-row stats-charts-row--full" style="margin-top: 1rem">
      <div class="content-card stat-chart-card">
        <div class="card-header">
          <h3 class="card-title">运营指标数值对比</h3>
          <span class="card-hint">与上方 KPI 同源，便于一眼对比量级</span>
        </div>
        <div ref="kpiChartEl" class="stat-chart-echarts stat-chart-echarts--compact"></div>
      </div>
    </div>

    <div class="stats-charts-row" style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
      <div class="content-card stat-chart-card">
        <div class="card-header">
          <h3 class="card-title">Steam 游戏时长 Top 10</h3>
          <span class="card-hint">已绑 Steam 账号累计时长前十用户</span>
        </div>
        <p v-if="steamError" class="vue-state vue-state-error">{{ steamError }}</p>
        <div ref="top10ChartEl" class="stat-chart-echarts"></div>
      </div>
      <div class="content-card stat-chart-card">
        <div class="card-header">
          <h3 class="card-title">Steam 时长区间分布</h3>
          <span class="card-hint">0–2000 小时，每 200h 一档，+ 超2000h</span>
        </div>
        <p v-if="steamError" class="vue-state vue-state-error">{{ steamError }}</p>
        <div ref="histChartEl" class="stat-chart-echarts"></div>
      </div>
    </div>

    <div class="content-card stat-chart-card" style="margin-top: 1rem">
      <div class="card-header">
        <h3 class="card-title">全站 Steam 成就解锁率分布</h3>
        <span class="card-hint">直方图：全站成就按 10% 一档统计成就个数；样本数 {{ achSample }}</span>
      </div>
      <p v-if="achError" class="vue-state vue-state-error">{{ achError }}</p>
      <div ref="achChartEl" class="stat-chart-echarts"></div>
      <div class="table-container" style="margin-top: 12px">
        <p v-if="!achievements.length && !achError" class="vue-state">暂无数据</p>
        <table v-else-if="achievements.length" class="data-table">
          <thead>
            <tr>
              <th>成就</th>
              <th>解锁数</th>
              <th>解锁率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in achievements.slice(0, 50)" :key="a.apiName || i">
              <td>{{ a.displayName || a.apiName || '-' }}</td>
              <td>{{ unlockCountOf(a) }}</td>
              <td>{{ rateOf(a) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  fetchDashboardKpis,
  fetchSteamAchievementsSite,
  fetchSteamPlaytime,
} from '@/api/admin/statistics'
import type { SteamAchievementsSiteData, SteamPlaytimeData } from '@/api/admin/types'
import { ApiError } from '@/api/types'

const DEFAULT_HIST_LABELS = [
  '0-200',
  '200-400',
  '400-600',
  '600-800',
  '800-1000',
  '1000-1200',
  '1200-1400',
  '1400-1600',
  '1600-1800',
  '1800-2000',
  '2000+',
]

const SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS = [
  '0–10%',
  '10–20%',
  '20–30%',
  '30–40%',
  '40–50%',
  '50–60%',
  '60–70%',
  '70–80%',
  '80–90%',
  '90–100%',
]

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
const histogram = ref<Array<{ label: string; count: number }>>([])
const achievements = ref<NonNullable<SteamAchievementsSiteData['achievements']>>([])
const achSample = ref<number | string>('-')

const kpiChartEl = ref<HTMLElement | null>(null)
const top10ChartEl = ref<HTMLElement | null>(null)
const histChartEl = ref<HTMLElement | null>(null)
const achChartEl = ref<HTMLElement | null>(null)

let kpiChart: ECharts | null = null
let top10Chart: ECharts | null = null
let histChart: ECharts | null = null
let achChart: ECharts | null = null

const textStyle = { color: '#a5a5b0', fontFamily: 'system-ui, "Segoe UI", sans-serif' }

function hoursOf(row: { playtimeHours?: number; playtimeMinutes?: number; displayName?: string }) {
  if (row.playtimeHours != null) return Number(row.playtimeHours)
  if (row.playtimeMinutes != null) return Math.round((Number(row.playtimeMinutes) / 60) * 10) / 10
  return 0
}

function unlockCountOf(a: { unlockCount?: number; unlockedCount?: number; [k: string]: unknown }) {
  if (a.unlockCount != null) return Number(a.unlockCount)
  if (a.unlockedCount != null) return Number(a.unlockedCount)
  return '-'
}

function rateOf(a: { unlockRate?: number; ratePercent?: number; unlockCount?: number; unlockedCount?: number }) {
  if (a.ratePercent != null) return Number(a.ratePercent).toFixed(1) + '%'
  if (a.unlockRate != null) {
    const n = Number(a.unlockRate)
    if (n <= 1) return (n * 100).toFixed(1) + '%'
    return n.toFixed(1) + '%'
  }
  const sample = Number(achSample.value)
  const n = a.unlockedCount != null ? Number(a.unlockedCount) : a.unlockCount != null ? Number(a.unlockCount) : null
  if (n != null && sample > 0) return ((n / sample) * 100).toFixed(1) + '%'
  return '-'
}

function ratePercentOf(a: { unlockRate?: number; ratePercent?: number; unlockCount?: number; unlockedCount?: number }, sampleSize: number) {
  if (a.ratePercent != null) return Number(a.ratePercent)
  if (a.unlockRate != null) {
    const n = Number(a.unlockRate)
    return n <= 1 ? n * 100 : n
  }
  const n = a.unlockedCount != null ? Number(a.unlockedCount) : a.unlockCount != null ? Number(a.unlockCount) : 0
  if (sampleSize > 0) return Math.round((n / sampleSize) * 10000) / 100
  return 0
}

function unlockHistogramCounts(list: NonNullable<SteamAchievementsSiteData['achievements']>, sampleSize: number) {
  const counts = SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS.map(() => 0)
  for (const row of list) {
    const pct = ratePercentOf(row, sampleSize)
    let idx = Math.floor(pct / 10)
    if (idx >= 10) idx = 9
    if (idx < 0) idx = 0
    counts[idx] += 1
  }
  return counts
}

function normalizeHistogram(raw: unknown): Array<{ label: string; count: number }> {
  if (Array.isArray(raw) && raw.length) {
    return raw.map((h: any, i: number) => ({
      label: String(h?.label ?? DEFAULT_HIST_LABELS[i] ?? i),
      count: Number(h?.count ?? 0),
    }))
  }
  return DEFAULT_HIST_LABELS.map((label) => ({ label, count: 0 }))
}

function disposeAll() {
  for (const c of [kpiChart, top10Chart, histChart, achChart]) {
    if (c) {
      try {
        c.dispose()
      } catch {
        /* ignore */
      }
    }
  }
  kpiChart = top10Chart = histChart = achChart = null
}

function truncateLabel(s: string, n: number) {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function renderCharts() {
  disposeAll()
  if (kpiChartEl.value) {
    kpiChart = echarts.init(kpiChartEl.value)
    const categories = ['资讯总量', '连招待审', '举报待处理', '评论待审']
    const values = [kpis.articleCount, kpis.pendingCombos, kpis.reportsOpen, kpis.commentsPending]
    const colors = ['#ff7a7a', '#5fd9cc', '#f0b429', '#7eb6ff']
    kpiChart.setOption({
      backgroundColor: 'transparent',
      textStyle,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: categories, axisLabel: { color: '#a5a5b0' }, axisLine: { lineStyle: { color: '#3a3a48' } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#a5a5b0' }, splitLine: { lineStyle: { color: '#2a2a36' } } },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
          barMaxWidth: 48,
        },
      ],
    })
  }

  if (top10ChartEl.value) {
    top10Chart = echarts.init(top10ChartEl.value)
    const names = steamTop.value.map((r, i) => {
      const label = String((r as { displayName?: string }).displayName || r.nickname || r.username || '用户')
      return `${i + 1}. ${truncateLabel(label, 14)}`
    })
    const hours = steamTop.value.map((r) => hoursOf(r))
    top10Chart.setOption({
      backgroundColor: 'transparent',
      textStyle,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params
          const row = steamTop.value[p.dataIndex]
          const h = hoursOf(row || {})
          const m = row && row.playtimeMinutes != null ? row.playtimeMinutes : Math.round(h * 60)
          return `${p.name}<br/>${h} 小时（约 ${m} 分钟）`
        },
      },
      grid: { left: 110, right: 24, top: 16, bottom: 32 },
      xAxis: { type: 'value', axisLabel: { color: '#a5a5b0' }, splitLine: { lineStyle: { color: '#2a2a36' } } },
      yAxis: {
        type: 'category',
        data: names.reverse(),
        axisLabel: { color: '#c8c8d0' },
        axisLine: { lineStyle: { color: '#3a3a48' } },
      },
      series: [
        {
          type: 'bar',
          data: hours.slice().reverse(),
          itemStyle: { color: '#5fd9cc' },
          barMaxWidth: 18,
        },
      ],
    })
  }

  if (histChartEl.value) {
    histChart = echarts.init(histChartEl.value)
    const labels = histogram.value.length ? histogram.value.map((h) => h.label) : DEFAULT_HIST_LABELS
    const counts = histogram.value.length ? histogram.value.map((h) => Number(h.count || 0)) : DEFAULT_HIST_LABELS.map(() => 0)
    histChart.setOption({
      backgroundColor: 'transparent',
      textStyle,
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#a5a5b0', rotate: 30, fontSize: 11 },
        axisLine: { lineStyle: { color: '#3a3a48' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#a5a5b0' },
        splitLine: { lineStyle: { color: '#2a2a36' } },
      },
      series: [{ type: 'bar', data: counts, itemStyle: { color: '#7eb6ff' }, barMaxWidth: 28 }],
    })
  }

  if (achChartEl.value) {
    achChart = echarts.init(achChartEl.value)
    const sample = Number(achSample.value) || 0
    const counts = achievements.value.length
      ? unlockHistogramCounts(achievements.value, sample)
      : SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS.map(() => 0)
    achChart.setOption({
      backgroundColor: 'transparent',
      textStyle,
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 40 },
      xAxis: {
        type: 'category',
        data: SITE_ACHIEVEMENT_UNLOCK_BIN_LABELS,
        axisLabel: { color: '#a5a5b0', fontSize: 11 },
        axisLine: { lineStyle: { color: '#3a3a48' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#a5a5b0' },
        splitLine: { lineStyle: { color: '#2a2a36' } },
      },
      series: [{ type: 'bar', data: counts, itemStyle: { color: '#f0b429' }, barMaxWidth: 36 }],
    })
  }
}

function onResize() {
  try {
    kpiChart?.resize()
    top10Chart?.resize()
    histChart?.resize()
    achChart?.resize()
  } catch {
    /* ignore */
  }
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
    histogram.value = normalizeHistogram(steam?.histogram)
  } catch (e) {
    steamTop.value = []
    histogram.value = []
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

  await nextTick()
  renderCharts()
}

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  disposeAll()
})
</script>

<style scoped>
.stat-chart-echarts {
  width: 100%;
  height: 320px;
}
.stat-chart-echarts--compact {
  height: 240px;
}
@media (max-width: 960px) {
  .stats-charts-row {
    grid-template-columns: 1fr !important;
  }
}
</style>
