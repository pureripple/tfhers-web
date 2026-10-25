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
      <div class="modal-content modal-large character-detail-modal">
        <div class="modal-header">
          <h3>{{ detailChar?.nameZh || detailChar?.nameEn || '' }}</h3>
          <button type="button" class="modal-close" @click="closeDetail"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div v-if="detailLoading" class="room-empty">加载中…</div>
          <div v-else-if="detailError" class="room-empty">{{ detailError }}</div>
          <template v-else-if="detailChar">
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
              <img
                v-if="detailChar.avatarUrl"
                :src="detailChar.avatarUrl"
                alt=""
                style="max-width:160px;border-radius:8px"
              />
              <div style="flex:1;min-width:200px">
                <p v-if="detailChar.nameEn"><strong>EN</strong> {{ detailChar.nameEn }}</p>
                <p v-if="detailChar.difficultyLevel != null"><strong>难度</strong> {{ detailChar.difficultyLevel }}</p>
                <p v-if="detailChar.intro">{{ detailChar.intro }}</p>
                <p v-if="detailChar.background" style="opacity:.85">{{ detailChar.background }}</p>
                <p v-if="videoUrl">
                  <a :href="videoUrl" target="_blank" rel="noopener">官方视频</a>
                </p>
              </div>
            </div>

            <h4 style="margin:0 0 8px">出招表</h4>
            <div v-if="moveListImage" style="margin-bottom:12px">
              <img :src="moveListImage" alt="出招表" style="max-width:100%;border-radius:8px;border:1px solid var(--border-color)" />
            </div>
            <div v-if="moves.length" class="moves-list" style="display:grid;gap:8px;margin-bottom:16px">
              <div v-for="(m, i) in moves" :key="i" class="move-item" style="padding:8px;border:1px solid var(--border-color);border-radius:8px">
                <h4 class="move-name" style="margin:0 0 4px;font-size:0.95rem">{{ moveName(m) }}</h4>
                <p class="move-input" style="margin:0;opacity:.8">{{ moveInput(m) }}</p>
                <p class="move-desc" style="margin:4px 0 0;opacity:.75">{{ moveDesc(m) }}</p>
              </div>
            </div>
            <p v-else-if="!moveListImage" class="moves-empty">暂无出招表</p>

            <h4 style="margin:16px 0 8px">官方连段（{{ officialCombos.length }}）</h4>
            <div v-if="officialCombos.length" style="display:grid;gap:8px;margin-bottom:16px">
              <div
                v-for="(c, i) in officialCombos"
                :key="i"
                class="combo-item"
                style="padding:8px;border:1px solid var(--border-color);border-radius:8px;display:flex;justify-content:space-between;gap:8px;align-items:center"
              >
                <div>
                  <strong>{{ comboTitle(c) }}</strong>
                  <div style="opacity:.75;font-size:0.9rem">{{ comboDesc(c) }}</div>
                </div>
                <button
                  v-if="comboVideo(c)"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  @click="playVideo(comboVideo(c), comboTitle(c))"
                >播放</button>
              </div>
            </div>
            <p v-else class="character-combos-empty">暂无官方连段</p>

            <h4 style="margin:16px 0 8px">玩家连段（{{ userCombos.length }}）</h4>
            <div v-if="userCombos.length" style="display:grid;gap:8px">
              <div
                v-for="(c, i) in userCombos"
                :key="i"
                class="combo-item user-combo-item"
                style="padding:8px;border:1px solid var(--border-color);border-radius:8px"
              >
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
                  <div>
                    <strong>{{ comboHeadline(c) }}</strong>
                    <div style="opacity:.75;font-size:0.85rem;margin-top:2px">
                      {{ comboAuthor(c) }}
                    </div>
                    <div style="opacity:.75;font-size:0.9rem;margin-top:4px">{{ comboDesc(c) }}</div>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <button
                      v-if="comboVideo(c)"
                      type="button"
                      class="btn btn-secondary btn-sm"
                      @click="playVideo(comboVideo(c), comboTitle(c))"
                    >视频</button>
                    <a
                      v-if="comboFile(c)"
                      class="btn btn-outline btn-sm"
                      :href="comboFile(c)"
                      :download="comboDownloadName(c)"
                    >下载</a>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="character-combos-empty">暂无玩家连段</p>
          </template>
        </div>
      </div>
    </div>

    <div v-if="videoOpen" class="modal" style="display:block;z-index:1100" @click.self="closeVideo">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ videoTitle }}</h3>
          <button type="button" class="modal-close" @click="closeVideo"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="combo-video-player-wrap">
            <video class="combo-video-player" :src="videoSrc" controls autoplay preload="metadata" playsinline style="width:100%;max-height:70vh"></video>
          </div>
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
const detailLoading = ref(false)
const detailError = ref('')
const detailPayload = ref<CharacterDetail | null>(null)

const videoOpen = ref(false)
const videoSrc = ref('')
const videoTitle = ref('连段视频')

const detailChar = computed(() => detailPayload.value?.character || null)
const moves = computed(() => (Array.isArray(detailPayload.value?.moves) ? detailPayload.value!.moves! : []) as Record<string, unknown>[])
const officialCombos = computed(() => {
  const d = detailPayload.value as Record<string, unknown> | null
  const list = (d?.officialCombos || d?.official_combos || []) as unknown[]
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : []
})
const userCombos = computed(() => {
  const list = detailPayload.value?.userCombos || []
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : []
})
const videoUrl = computed(() =>
  String(detailChar.value?.officialVideoUrl || detailPayload.value?.officialVideoUrl || ''),
)
const moveListImage = computed(() => String(detailChar.value?.moveListImageUrl || ''))

function asRec(v: unknown) {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
}
function moveName(m: unknown) {
  const r = asRec(m)
  return String(r.nameZh || r.nameEn || '未命名招式')
}
function moveInput(m: unknown) {
  return String(asRec(m).inputCommand || '')
}
function moveDesc(m: unknown) {
  return String(asRec(m).description || '')
}
function comboTitle(c: unknown) {
  return String(asRec(c).title || '未命名连段')
}
function comboDesc(c: unknown) {
  return String(asRec(c).description || '')
}
function comboVideo(c: unknown) {
  const r = asRec(c)
  return String(r.videoUrl || r.video_url || '')
}
function comboFile(c: unknown) {
  const r = asRec(c)
  return String(r.comboFileUrl || r.combo_file_url || '')
}
function comboAuthor(c: unknown) {
  const r = asRec(c)
  return String(r.authorName || r.author_name || '玩家')
}
function comboHeadline(c: unknown) {
  const r = asRec(c)
  const dmg = r.damageTotal ?? r.damage_total
  const title = comboTitle(c)
  return dmg != null ? `${dmg}伤-${title}` : title
}
function comboDownloadName(c: unknown) {
  const title = comboTitle(c).replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 80)
  return (title || 'combo') + '.tfhc'
}

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
  detailLoading.value = true
  detailError.value = ''
  detailPayload.value = null
  try {
    detailPayload.value = await fetchCharacter(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '获取角色详情失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  closeVideo()
}

function playVideo(url: string, title: string) {
  if (!url) return
  videoSrc.value = url
  videoTitle.value = title || '连段视频'
  videoOpen.value = true
}
function closeVideo() {
  videoOpen.value = false
  videoSrc.value = ''
}

onMounted(load)
</script>
