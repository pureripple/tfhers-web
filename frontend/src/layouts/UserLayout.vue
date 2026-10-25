<template>
  <div class="shell">
    <header>
      <span class="brand">蹄斗族群</span>
      <RouterLink to="/">资讯</RouterLink>
      <RouterLink to="/lobby">大厅</RouterLink>
      <RouterLink to="/rankings">排行</RouterLink>
      <RouterLink to="/tournaments">赛事</RouterLink>
      <RouterLink to="/characters">角色</RouterLink>
      <RouterLink to="/ai-chat">AI 助手</RouterLink>
      <RouterLink to="/login">登录</RouterLink>
      <RouterLink to="/admin" style="margin-left: auto">管理端</RouterLink>
    </header>
    <main><RouterView /></main>
  </div>
</template>

<script setup lang="ts"></script>
