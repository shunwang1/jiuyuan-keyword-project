<template>
  <!-- 空白占位页：登录后默认显示，不展示任何业务内容 -->
  <div class="empty"></div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DashboardEmpty' })
</script>

<style scoped>
.empty {
  /* 保持主内容区空白即可（可根据需要加最小高度） */
  min-height: 60vh;
}
</style>
