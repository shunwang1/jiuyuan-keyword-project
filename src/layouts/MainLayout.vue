<template>
  <!-- 主布局容器，使用Element Plus的容器组件 -->
  <el-container style="height: 100vh">
    <!-- 左侧边栏 -->
    <el-aside width="220px" style="border-right: 1px solid #eee">
      <!-- 系统标题 -->
      <div style="padding: 16px; font-weight: 700; font-size: 16px">
        功能菜单
      </div>

      <!-- 导航菜单 -->
      <el-menu :default-active="activePath" router style="border-right: none">
        <el-menu-item index="/upload">上传报告</el-menu-item>
        <el-menu-item index="/search">检索报告</el-menu-item>
        <!-- ✅ 仅管理员可见；名称改为“关键词管理” -->
        <el-menu-item v-if="auth.isAdmin" index="/keywords">关键词管理</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/users">用户管理</el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧主要内容区域 -->
    <el-container>
      <!-- 顶部头部 -->
      <el-header class="header">
        <!-- 改动：左上角品牌区（Logo + 系统名），替换原来的空 div 占位 -->
        <div class="brand">
          <img class="brand__logo" :src="logoUrl" alt="logo" />
          <div class="brand__title">元器件物理状态信息系统</div>
        </div>

        <!-- 右侧用户信息区域（保持原样） -->
        <div class="right">
          <span>用户：{{ auth.username }}（{{ auth.isAdmin ? '管理员' : '普通用户' }}）</span>
          <el-button size="small" @click="onLogout">退出登录</el-button>
        </div>
      </el-header>

      <!-- 主要内容区域 -->
      <el-main style="background: #fafafa">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const activePath = computed(() => route.path)

/**  新增：Logo 图片地址
 * - 推荐放：src/assets/logo.png
 */
const logoUrl = new URL('../assets/logo.png', import.meta.url).href

const onLogout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
/* 新增：把 header 样式抽成 class，便于维护 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

/* 新增：左上角品牌区（与登录页一致风格） */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.brand__title {
  font-weight: 700;
  font-size: 16px;
}

/* 右侧区域（原样，只是抽成 class） */
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
