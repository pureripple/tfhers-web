<template>
  <div class="shell">
    <header>
      <span class="brand">TFHers 管理</span>
      <RouterLink to="/admin">统计</RouterLink>
      <RouterLink to="/admin/articles">资讯</RouterLink>
      <RouterLink to="/admin/characters">角色</RouterLink>
      <RouterLink to="/admin/user-combos">连段审核</RouterLink>
      <RouterLink to="/admin/comment-review">评论审核</RouterLink>
      <RouterLink to="/admin/games">游戏</RouterLink>
      <RouterLink to="/admin/tournaments">赛事</RouterLink>
      <RouterLink to="/admin/reports">举报</RouterLink>
      <RouterLink to="/admin/feedback">反馈</RouterLink>
      <RouterLink to="/admin/users">用户</RouterLink>
      <RouterLink to="/admin/profile">个人设置</RouterLink>
      <RouterLink to="/admin/ai-chat">AI</RouterLink>
      <RouterLink to="/admin/login">登录</RouterLink>
      <RouterLink to="/" style="margin-left: auto">回用户端</RouterLink>
    </header>
    <main><RouterView /></main>
  </div>
</template>

<script setup lang="ts"></script>
