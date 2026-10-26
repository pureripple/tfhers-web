<template>
  <section class="page active">
    <div v-if="!detailOpen" class="characters-grid">
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
            :alt="displayEnName(item.nameEn)"
          />
        </div>
        <h3 class="character-name">{{ displayEnName(item.nameEn) }}</h3>
      </article>
    </div>

    <div v-else class="character-detail character-detail--tutorial-dark">
      <div style="margin-bottom:12px">
        <button type="button" class="btn btn-outline btn-sm" @click="closeDetail">
          <i class="fas fa-arrow-left"></i> 返回角色列表
        </button>
      </div>

      <div v-if="detailLoading" class="room-empty">加载中…</div>
      <div v-else-if="detailError" class="room-empty">{{ detailError }}</div>
      <div v-else-if="detailChar" class="character-tutorial-layout">
        <div class="character-tutorial-pane character-tutorial-pane--left" aria-label="角色信息、背景故事与出招表">
          <div class="character-tutorial-main">
            <div class="character-dark-card character-card-bio">
              <div class="character-bio-row">
                <div class="character-bio-avatar">
                  <img
                    :src="detailChar.avatarUrl || '/images/CSel3_LargePortTianhuo.png'"
                    :alt="displayEnName(detailChar.nameEn)"
                  />
                </div>
                <div class="character-bio-meta">
                  <div class="character-name-en">{{ displayEnName(detailChar.nameEn) }}</div>
                  <p class="character-difficulty-line">
                    {{ detailChar.difficultyLevel != null ? `难度：${detailChar.difficultyLevel}/5` : '难度：—' }}
                  </p>
                </div>
                <div class="character-bio-intro">
                  <p>{{ detailChar.intro || '' }}</p>
                </div>
              </div>
            </div>

            <div class="character-dark-card">
              <h3 class="dark-card-title">背景故事</h3>
              <p class="dark-card-body">{{ detailChar.background || '' }}</p>
            </div>
          </div>

          <div class="character-moves-sidebar character-dark-card" aria-label="出招表">
            <h3 class="dark-card-title">出招表</h3>
            <div v-if="moveListImage" class="move-list-image-wrap">
              <img :src="moveListImage" alt="出招表" class="move-list-image" />
            </div>
            <div v-if="moves.length" class="moves-list">
              <div v-for="(m, i) in moves" :key="i" class="move-item">
                <h4 class="move-name">{{ moveName(m) }}</h4>
                <p class="move-input">{{ moveInput(m) }}</p>
                <p class="move-desc">{{ moveDesc(m) }}</p>
              </div>
            </div>
          </div>
        </div>

        <aside class="character-tutorial-pane character-tutorial-pane--right character-combos-pane" aria-label="玩家连段">
          <h3 class="moves-sidebar-title">玩家连段</h3>
          <div class="combo-list user-combo-list">
            <div
              v-for="(c, i) in userCombos"
              :key="i"
              class="combo-item user-combo-item"
            >
              <div class="user-combo-main">
                <div class="user-combo-author">
                  <div class="user-combo-avatar-wrap">
                    <img
                      :src="comboAuthorAvatar(c)"
                      alt=""
                      class="user-combo-avatar"
                    />
                  </div>
                  <button type="button" class="user-combo-author-name player-name-link" :class="adminNameClass(c)" @click.stop="goPlayerProfile(router, null, c)">{{ comboAuthor(c) }}</button>
                </div>
                <div class="user-combo-headline">{{ comboHeadline(c) }}</div>
                <div v-if="comboDesc(c)" style="opacity:.75;font-size:0.9rem;margin-top:4px">{{ comboDesc(c) }}</div>
                <div class="user-combo-actions-row">
                  <button
                    v-if="comboVideo(c)"
                    type="button"
                    class="user-combo-watch-btn user-combo-text-action"
                    @click="playVideo(comboVideo(c), comboTitle(c))"
                  ><i class="fas fa-play"></i> 观看视频</button>
                  <a
                    v-if="comboFile(c)"
                    class="user-combo-download-link"
                    :href="comboFile(c)"
                    :download="comboDownloadName(c)"
                  >下载连段</a>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
import { useRouter } from 'vue-router'
import { fetchCharacter, fetchCharacters } from '@/api/characters'
import { ApiError, type CharacterDetail, type GameCharacter } from '@/api/types'
import { adminNameClass } from '@/utils/adminName'
import { goPlayerProfile } from '@/utils/playerProfile'

const router = useRouter()

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
const userCombos = computed(() => {
  const list = detailPayload.value?.userCombos || []
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : []
})
const moveListImage = computed(() => String(detailChar.value?.moveListImageUrl || ''))

/** English name only; capitalize first letter. */
function displayEnName(name?: string | null) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function asRec(v: unknown) {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
}
function moveName(m: unknown) {
  const r = asRec(m)
  return String(r.nameEn || r.nameZh || '')
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
function comboAuthorAvatar(c: unknown) {
  const r = asRec(c)
  return String(r.authorAvatar || r.author_avatar || '/images/CSel3_LargePortTianhuo.png')
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
