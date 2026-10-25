<template>
  <section class="page active">
    <div class="action-bar">
      <p class="stats-page-desc">游戏管理：Steam 成就 schema 同步（与旧站一致，仅此操作）</p>
      <div class="action-buttons">
        <button type="button" class="btn btn-secondary" :disabled="syncing" @click="onSync">
          <i class="fas fa-sync-alt"></i> {{ syncing ? '同步中…' : '刷新/同步' }}
        </button>
      </div>
    </div>
    <p v-if="error" class="vue-state vue-state-error">{{ error }}</p>
    <div class="content-card">
      <div class="card-header"><h3 class="card-title">同步结果</h3></div>
      <div class="table-container" style="padding:1rem">
        <pre v-if="result" style="white-space:pre-wrap;margin:0;color:var(--text-secondary)">{{ typeof result === 'string' ? result : JSON.stringify(result, null, 2) }}</pre>
        <p v-else class="vue-state">点击上方按钮同步</p>
      </div>
    </div>
  </section>
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