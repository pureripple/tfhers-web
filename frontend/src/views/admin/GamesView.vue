<template>
  <section class="page active">
    <div class="content-card">
      <div class="card-header">
        <h3 class="card-title">游戏管理</h3>
        <div class="card-actions">
          <button type="button" class="btn btn-primary" :disabled="syncing" @click="onSync">
            <i class="fas fa-cloud-download-alt"></i>
            {{ syncing ? '同步中…' : '同步 Steam 全部成就（转存 OSS）' }}
          </button>
        </div>
      </div>
      <div class="card-body" style="padding: 16px">
        <p style="color: rgba(255, 255, 255, 0.75); margin-bottom: 10px">
          说明：此操作会从 Steam 拉取本游戏的全部成就 schema（名称/描述/图标），并将图标转存到对象存储 OSS 后写入数据库。
        </p>
        <p v-if="error" class="vue-state vue-state-error">{{ error }}</p>
        <p v-if="msg" class="vue-state">{{ msg }}</p>
        <div style="display: flex; gap: 16px; flex-wrap: wrap">
          <div>
            <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px">上次同步</div>
            <div style="font-weight: 700">{{ lastSync }}</div>
          </div>
          <div>
            <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px">本次写入条数</div>
            <div style="font-weight: 700">{{ upserted }}</div>
          </div>
          <div>
            <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px">成就总数</div>
            <div style="font-weight: 700">{{ total }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { syncSteamAchievements } from '@/api/admin/games'
import { ApiError } from '@/api/types'

const syncing = ref(false)
const error = ref('')
const msg = ref('')
const lastSync = ref('—')
const upserted = ref('—')
const total = ref('—')

async function onSync() {
  if (!confirm('确认同步 Steam 成就 schema？此操作可能需要较长时间。')) return
  syncing.value = true
  error.value = ''
  msg.value = ''
  try {
    const data = await syncSteamAchievements()
    lastSync.value = data?.updatedAt ? String(data.updatedAt) : '刚刚'
    upserted.value = data?.upserted != null ? String(data.upserted) : '—'
    total.value = data?.total != null ? String(data.total) : '—'
    msg.value = '同步成功'
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '同步失败，请稍后再试'
  } finally {
    syncing.value = false
  }
}
</script>
