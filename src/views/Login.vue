<template>
  <div class="page">
    <div class="brand">
      <img class="brand__logo" :src="logoUrl" alt="logo" />
      <div class="brand__title">元器件物理状态信息系统</div>
    </div>

    <el-card class="card">
      <template #header>
        <div style="font-weight: 700; font-size: 16px">欢迎登录</div>
      </template>

      <el-alert
        v-if="reasonText"
        :title="reasonText"
        type="warning"
        show-icon
        :closable="true"
        style="margin-bottom: 12px"
        @close="reasonText = ''"
      />

      <el-form :model="form" label-width="80px" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="onLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'UserLogin' })

import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const reasonText = ref('')

const form = reactive({
  username: '',
  password: '',
})

const logoUrl = new URL('../assets/logo.png', import.meta.url).href

onMounted(() => {
  const reason = typeof route.query.reason === 'string' ? route.query.reason : ''
  if (!reason) return

  reasonText.value = reason
  router.replace({ path: '/login', query: {} })
})

const onLogin = async () => {
  const username = form.username.trim()
  const password = form.password.trim()

  if (!username) return ElMessage.warning('请输入账号')
  if (!password) return ElMessage.warning('请输入密码')

  loading.value = true
  try {
    await auth.login({ username, password })
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
.page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  position: relative;
}

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

.card {
  width: 420px;
}
</style>
