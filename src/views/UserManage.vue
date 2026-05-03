<template>
  <el-card>
    <template #header>
      <div style="font-weight: 700">用户管理</div>
    </template>

    <div style="display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 12px">
      <el-button type="primary" @click="openAddDialog">增加用户</el-button>
    </div>

    <el-table :data="pagedUsers" style="width: 100%" v-loading="loading">
      <el-table-column prop="username" label="用户名" min-width="150" />
      <el-table-column prop="dept" label="用户部门名称" min-width="160" />

      <el-table-column label="权限级别" width="200">
        <template #default="{ row }">
          <el-select v-model="row.securityLevelForPatch" style="width: 140px" @change="onRoleChange(row)">
            <el-option :value="0" label="0 管理员" />
            <el-option :value="1" label="1 普通用户" />
          </el-select>
        </template>
      </el-table-column>

      <el-table-column label="冻结账户" width="240">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-tag :type="isAdminRow(row) ? 'info' : row.frozen ? 'danger' : 'success'" effect="light">
              {{ isAdminRow(row) ? '管理员账号' : row.frozen ? '已冻结' : '正常' }}
            </el-tag>
            <el-switch
              :model-value="!row.frozen"
              active-text="正常"
              inactive-text="冻结"
              :disabled="isAdminRow(row)"
              @change="onStatusChange(row, $event)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div style="display: flex; justify-content: flex-end; margin-top: 12px">
      <el-pagination
        v-model:current-page="page.pageNo"
        layout="prev, pager, next"
        :page-size="page.pageSize"
        :total="total"
        @current-change="onPageChange"
      />
    </div>

    <el-dialog v-model="addDialogVisible" title="增加用户" width="520px">
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="账号" required>
          <el-input v-model="addForm.username" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="addForm.password" />
        </el-form-item>
        <el-form-item label="部门" required>
          <el-select
            v-model="addForm.departmentId"
            placeholder="请选择部门"
            style="width: 240px"
            :loading="loadingDepartments"
          >
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限">
          <el-select v-model="addForm.securityLevel" style="width: 180px">
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
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  apiAuthUsersQuery,
  apiCreateUser,
  apiDepartmentsQuery,
  apiPatchUserSecurityLevel,
  apiPatchUserStatus,
  apiUpdateUserRole,
  mapAuthUserToUserListItem,
  type DepartmentItem,
  type UserListItem,
  type UserRole,
  type UserStatusCode,
} from '../api/users'

type UserRow = UserListItem & {
  password?: string
  statusCode: UserStatusCode
  securityLevelForPatch: 0 | 1
}

const loading = ref(false)
const creating = ref(false)
const loadingDepartments = ref(false)

const users = ref<UserRow[]>([])
const departments = ref<DepartmentItem[]>([])
const total = ref(0)
const page = reactive({ pageNo: 1, pageSize: 15 })

const pagedUsers = computed(() => {
  const start = (page.pageNo - 1) * page.pageSize
  return users.value.slice(start, start + page.pageSize)
})

const mapToRow = (user: UserListItem): UserRow => {
  return {
    ...user,
    statusCode: user.frozen ? 0 : 1,
    securityLevelForPatch: user.role === 0 ? 0 : 1,
  }
}

const isAdminRow = (row: UserRow) => row.securityLevelForPatch === 0

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await apiAuthUsersQuery()
    const list = data.list || []
    const mapped = list.map(mapAuthUserToUserListItem)
    users.value = mapped.map(mapToRow)
    total.value = users.value.length
    page.pageNo = 1
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载用户失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  loadingDepartments.value = true
  try {
    departments.value = await apiDepartmentsQuery()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载部门失败'
    ElMessage.error(msg)
  } finally {
    loadingDepartments.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadDepartments()])
})

const onPageChange = async (p: number) => {
  page.pageNo = p
}

const onRoleChange = async (row: UserRow) => {
  const newSecurityLevel = row.securityLevelForPatch

  try {
    await apiPatchUserSecurityLevel({ id: row.userId, securityLevel: newSecurityLevel })
    row.role = newSecurityLevel as UserRole

    try {
      await apiUpdateUserRole({ userId: row.userId, role: row.role as UserRole })
    } catch {
      // ignore old api failure
    }

    ElMessage.success('权限已更新')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新权限失败'
    ElMessage.error(msg)
    await loadUsers()
  }
}

const onStatusChange = async (row: UserRow, value: string | number | boolean) => {
  if (isAdminRow(row)) {
    row.statusCode = 1
    row.frozen = false
    ElMessage.warning('管理员账号不支持冻结')
    return
  }

  const nextStatus: UserStatusCode = value ? 1 : 0
  row.statusCode = nextStatus

  try {
    await apiPatchUserStatus({ id: row.userId, status: nextStatus })
    row.frozen = nextStatus === 0
    ElMessage.success(nextStatus === 0 ? '已冻结' : '已解冻')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '操作失败'
    ElMessage.error(msg)
    await loadUsers()
  }
}

const addDialogVisible = ref(false)

const addForm = reactive<{
  username: string
  password: string
  departmentId: number | null
  securityLevel: UserRole
}>({
  username: '',
  password: '',
  departmentId: null,
  securityLevel: 1,
})

const openAddDialog = () => {
  addForm.username = ''
  addForm.password = ''
  addForm.departmentId = null
  addForm.securityLevel = 1
  addDialogVisible.value = true
}

const addUser = async () => {
  if (!addForm.username.trim()) return ElMessage.warning('账号为必填')
  if (!addForm.password.trim()) return ElMessage.warning('密码为必填')
  if (addForm.departmentId == null) return ElMessage.warning('部门为必填')

  creating.value = true
  try {
    await apiCreateUser({
      username: addForm.username.trim(),
      password: addForm.password.trim(),
      departmentId: addForm.departmentId,
      securityLevel: addForm.securityLevel,
    })
    ElMessage.success('新增用户成功')
    addDialogVisible.value = false
    await loadUsers()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '新增失败'
    ElMessage.error(msg)
  } finally {
    creating.value = false
  }
}
</script>
