<template>
  <!--
    用户管理页面（仅管理员可见）
    功能：管理用户账号、权限、冻结状态
    特点：分页展示、权限切换、账户冻结、新增用户
  -->
  <el-card>
    <template #header>
      <div style="font-weight:700">用户管理</div>
    </template>

    <div style="display:flex; justify-content:space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px">
      <div style="color:#666">最多一次性展示 15 位用户</div>
      <el-button type="primary" @click="openAddDialog">增加用户</el-button>
    </div>

    <el-table :data="users" style="width: 100%" v-loading="loading">
      <el-table-column prop="username" label="用户名" min-width="150" />
      <!-- 注意：后端不建议返回明文密码；这里保留字段以兼容你原需求 -->
      <el-table-column prop="password" label="用户密码" min-width="150" />
      <el-table-column prop="dept" label="用户部门名称" min-width="160" />
      <el-table-column label="权限级别" width="160">
        <template #default="{ row }">
          <el-select v-model="row.role" style="width: 120px" @change="onRoleChange(row)">
            <el-option :value="0" label="0 管理员" />
            <el-option :value="1" label="1 普通用户" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="冻结账户" width="120">
        <template #default="{ row }">
          <el-switch v-model="row.frozen" @change="onFreezeChange(row)" />
        </template>
      </el-table-column>
    </el-table>

    <div style="display:flex; justify-content:flex-end; margin-top: 12px">
      <el-pagination
        layout="prev, pager, next"
        :page-size="page.pageSize"
        :total="total"
        v-model:current-page="page.pageNo"
        @current-change="onPageChange"
      />
    </div>

    <el-dialog v-model="addDialogVisible" title="增加用户" width="520px">
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="账号" required>
          <el-input v-model="addForm.username" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="addForm.password" />
        </el-form-item>
        <el-form-item label="部门" required>
          <el-input v-model="addForm.dept" />
        </el-form-item>
        <el-form-item label="权限">
          <el-select v-model="addForm.role" style="width: 180px">
            <el-option :value="1" label="1 普通用户" />
            <el-option :value="0" label="0 管理员" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="addUser">确定</el-button>
      </template>
    </el-dialog>

    <div style="margin-top: 10px; color:#999; font-size:12px; line-height: 1.6">
      安全建议：后端最好不要返回明文密码；前端可改为"重置密码"。
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  apiUsersPage,
  apiCreateUser,
  apiUpdateUserRole,
  apiFreezeUser,
  type UserListItem,
  type UserRole,
} from '../api/users'

type UserRow = UserListItem & { password?: string }

const loading = ref(false)
const creating = ref(false)

const users = ref<UserRow[]>([])
const total = ref(0)
const page = reactive({ pageNo: 1, pageSize: 15 })

const loadPage = async () => {
  loading.value = true
  try {
    const data = await apiUsersPage({ pageNo: page.pageNo, pageSize: page.pageSize })
    users.value = (data.list || []) as UserRow[]
    total.value = data.total || 0
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载用户失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

const onPageChange = async (p: number) => {
  page.pageNo = p
  await loadPage()
}

const onRoleChange = async (row: UserRow) => {
  try {
    await apiUpdateUserRole({ userId: row.userId, role: row.role as UserRole })
    ElMessage.success('权限已更新')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    ElMessage.error(msg)
    await loadPage()
  }
}

const onFreezeChange = async (row: UserRow) => {
  try {
    await apiFreezeUser({ userId: row.userId, frozen: row.frozen })
    ElMessage.success(row.frozen ? '已冻结' : '已解冻')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '操作失败'
    ElMessage.error(msg)
    await loadPage()
  }
}

const addDialogVisible = ref(false)

const addForm = reactive<{
  username: string
  password: string
  dept: string
  role: UserRole
}>({
  username: '',
  password: '',
  dept: '',
  role: 1,
})

const openAddDialog = () => {
  addForm.username = ''
  addForm.password = ''
  addForm.dept = ''
  addForm.role = 1
  addDialogVisible.value = true
}

const addUser = async () => {
  if (!addForm.username.trim()) return ElMessage.warning('账号为必要')
  if (!addForm.password.trim()) return ElMessage.warning('密码为必要')
  if (!addForm.dept.trim()) return ElMessage.warning('部门为必要')

  creating.value = true
  try {
    await apiCreateUser({
      username: addForm.username.trim(),
      password: addForm.password.trim(),
      dept: addForm.dept.trim(),
      role: addForm.role,
    })
    ElMessage.success('新增用户成功')
    addDialogVisible.value = false
    page.pageNo = 1
    await loadPage()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '新增失败'
    ElMessage.error(msg)
  } finally {
    creating.value = false
  }
}
</script>
