<template>
  <div class="page">
    <!-- 左上角logo区（Logo + 系统名） -->
    <div class="brand">
      <img class="brand__logo" :src="logoUrl" alt="logo" />
      <div class="brand__title">元器件物理状态1</div>
    </div>

    <!-- 登录界面 -->
    <el-card class="card">
      <template #header>
        <div style="font-weight:700; font-size:16px">欢迎登录</div>
      </template>

      <el-form :model="form" label-width="80px" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" style="width:100%" @click="onLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div style="color:#999; font-size:12px; line-height: 1.6">
        说明：token 存在 HttpOnly Cookie，前端请求使用 credentials: include 自动携带。
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'UserLogin' })

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

/** Logo 图片地址
 *  - 放到：src/assets/logo.png
 */
const logoUrl = new URL('../assets/logo.png', import.meta.url).href

const onLogin = async () => {
  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '登录失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 页面容器：居中布局，同时允许左上角绝对定位logo区 */
.page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  position: relative; /* 关键：给 brand 的 absolute 提供定位参照 */
}

/* 左上角logo区 */
.brand {
  position: absolute;
  top: 16px;
  left: 16px;
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
  color: #303133;
  font-size: 16px;
}

/* 登录卡片 */
.card {
  width: 420px;
}
</style>
