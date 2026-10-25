<template>
  <div class="placeholder">
    <h1>{{ title }}</h1>
    <p>{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; note?: string }>(), {
  note: '脚手架占位页，业务逻辑稍后迁移。',
})
</script>
