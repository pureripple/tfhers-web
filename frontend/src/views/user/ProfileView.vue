<template>
  <ProfilePanel @open-settings="goSettings" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ProfilePanel from '@/components/ProfilePanel.vue'

const router = useRouter()
function goSettings() {
  router.push({ name: 'settings' })
}
</script>