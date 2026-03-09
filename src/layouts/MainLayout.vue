<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" style="border-right: 1px solid #eee">
      <div style="padding: 16px; font-weight: 700; font-size: 16px">
        功能菜单
      </div>

      <!-- 联调模式：不再根据 auth.isAdmin 隐藏菜单；权限由后端 403 兜底 -->
      <el-menu :default-active="activePath" router style="border-right: none">
        <el-menu-item index="/upload">上传报告</el-menu-item>
        <el-menu-item index="/search">检索报告</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/keywords">关键词管理</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/users">用户管理</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="brand">
          <img class="brand__logo" :src="logoUrl" alt="logo" />
          <div class="brand__title">元器件物理状态信息系统</div>
        </div>

        <div class="right">
          <span>用户：{{ auth.username }}</span>
          <el-button size="small" @click="onLogout">退出登录</el-button>
        </div>
      </el-header>

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

const logoUrl = new URL('../assets/logo.png', import.meta.url).href

const onLogout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

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

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
