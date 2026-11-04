<template>
  <!-- 未登录：3D 训练场外壳，屏幕内轮播「首页」和「选角色」两个真实页面 -->
  <CinemaHomeView v-if="!userAuth.isLoggedIn" />

  <!-- 已登录：直接看资讯 -->
  <NewsView v-else />
</template>

<script setup lang="ts">
import { useUserAuthStore } from '@/stores/auth'
import CinemaHomeView from '@/views/user/CinemaHomeView.vue'
import NewsView from '@/views/user/NewsView.vue'

const userAuth = useUserAuthStore()
</script>
