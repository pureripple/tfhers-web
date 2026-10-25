<template>
  <div class="page admin-page">
    <header class="page-head">
      <h1>游戏 / Steam</h1>
    </header>
    <p class="page-desc">
      管理端暂无游戏列表接口；此处提供 Steam 成就 schema 同步（与旧后台一致）。
    </p>

    <div class="card" style="padding: 1.25rem">
      <h2 style="margin-top: 0; font-size: 1.1rem">同步 Steam 成就 Schema</h2>
      <p class="muted">将从 Steam 拉取成就定义并写入库（含图标转存 OSS）。</p>
      <button type="button" class="auth-btn" :disabled="syncing" @click="onSync">
        {{ syncing ? '同步中…' : '开始同步' }}
      </button>
      <p v-if="error" class="state state-error">{{ error }}</p>
      <div v-if="result" class="kpi-grid" style="margin-top: 1rem">
        <div class="kpi-card">
          <div class="kpi-label">App ID</div>
          <div class="kpi-value small">{{ result.appId ?? '-' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">总数</div>
          <div class="kpi-value small">{{ result.total ?? '-' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">写入</div>
          <div class="kpi-value small">{{ result.upserted ?? '-' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">图标成功/失败</div>
          <div class="kpi-value small">{{ result.uploadedAny ?? 0 }} / {{ result.failedAny ?? 0 }}</div>
        </div>
      </div>
      <p v-if="result?.updatedAt" class="state">完成于 {{ result.updatedAt }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { syncSteamAchievements } from '@/api/admin/games'
import type { SteamSyncResult } from '@/api/admin/types'
import { ApiError } from '@/api/types'

const syncing = ref(false)
const error = ref('')
const result = ref<SteamSyncResult | null>(null)

async function onSync() {
  if (!confirm('确认同步 Steam 成就 schema？可能需要较长时间。')) return
  syncing.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await syncSteamAchievements()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '同步失败'
  } finally {
    syncing.value = false
  }
}
</script>