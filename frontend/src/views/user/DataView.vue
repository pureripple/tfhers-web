<template>
  <div class="vue-state">正在打开数据…</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  router.replace({ name: 'profile', query: { section: 'data' } })
})
</script>