<template>
  <GuestHomeView v-if="!userAuth.isLoggedIn" />
  <NewsView v-else />
</template>

<script setup lang="ts">
import { useUserAuthStore } from '@/stores/auth'
import GuestHomeView from '@/views/user/GuestHomeView.vue'
import NewsView from '@/views/user/NewsView.vue'

const userAuth = useUserAuthStore()
</script>
