<template>
  <el-card>
    <template #header>
      <div style="font-weight: 700">关键词管理</div>
    </template>

    <div style="margin-bottom: 12px">
      <el-form label-width="70px" style="max-width: 720px">
        <el-form-item label="报告类别">
          <el-select
            v-model="categoryId"
            placeholder="全部类别"
            clearable
            style="width: 320px"
            :loading="loadingCategories"
            :disabled="refreshing"
            @change="onCategoryChange"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.category" :value="c.id" />
          </el-select>

          <el-button
            style="margin-left: 12px"
            type="primary"
            plain
            :disabled="!categoryId || refreshUiBusy"
            :loading="refreshing"
            @click="refreshKeywords"
          >
            {{ refreshing ? '正在匹配报告...' : '刷新关键词' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-alert
      v-if="refreshStatus.visible"
      :title="refreshStatus.title"
      :type="refreshStatus.type"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    >
      <template #default>
        <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap">
          <span>{{ refreshStatus.message }}</span>
          <span v-if="refreshing || refreshStatus.seconds > 0" style="color: #909399">
            已耗时 {{ refreshStatus.seconds }} 秒
          </span>
        </div>
        <div v-if="refreshStatus.finishedAtText" style="margin-top: 6px; color: #909399">
          本次刷新完成时间：{{ refreshStatus.finishedAtText }}
        </div>
      </template>
    </el-alert>

    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px">
      <el-input
        v-model="filterText"
        placeholder="筛选关键词..."
        style="width: 220px"
        clearable
        :disabled="refreshing"
      />
      <el-input
        v-model="newKeyword"
        placeholder="新增关键词"
        style="width: 260px"
        clearable
        :disabled="refreshUiBusy"
      />
      <el-button type="primary" :loading="adding" :disabled="!categoryId || refreshUiBusy" @click="addKeyword">
        新增
      </el-button>
    </div>

    <el-table
      :data="filteredKeywords"
      style="width: 100%"
      v-loading="loadingKeywords"
      element-loading-text="正在加载关键词列表，请稍候..."
    >
      <el-table-column prop="keyword" label="关键词" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button type="primary" link :disabled="!categoryId || refreshUiBusy" @click="openEdit(row)">
            修改
          </el-button>

          <el-button
            type="danger"
            link
            :loading="removingKey === row.keyword"
            :disabled="!categoryId || refreshUiBusy"
            @click="removeKeyword(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" title="修改关键词" width="520px">
      <el-form label-width="110px">
        <el-form-item label="原关键词">
          <el-input v-model="editForm.oldKeyword" disabled />
        </el-form-item>
        <el-form-item label="新关键词" required>
          <el-input v-model="editForm.newKeyword" placeholder="请输入新关键词" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="editing" @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { request, type RequestError } from '../api/http'
import {
  apiAddKeyword,
  apiQueryAllKeywords,
  apiQueryKeywords,
  apiRefreshReportKeywords,
  apiRemoveKeyword,
  apiUpdateKeyword,
} from '../api/keywords'

type KeywordRow = { keyword: string }
type CategoryRow = { id: number; category: string }
type RefreshStatusType = 'info' | 'success'

const categories = ref<CategoryRow[]>([])
const loadingCategories = ref(false)

const loadingKeywords = ref(false)
const refreshing = ref(false)
const categoryId = ref<number | null>(null)

const filterText = ref('')
const newKeyword = ref('')

const adding = ref(false)
const removingKey = ref('')

const editVisible = ref(false)
const editing = ref(false)
const editForm = reactive<{ oldKeyword: string; newKeyword: string }>({
  oldKeyword: '',
  newKeyword: '',
})

const keywords = ref<KeywordRow[]>([])

const refreshStatus = reactive<{
  visible: boolean
  type: RefreshStatusType
  title: string
  message: string
  seconds: number
  finishedAtText: string
}>({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  seconds: 0,
  finishedAtText: '',
})

let refreshTimer: number | null = null
let refreshStatusHideTimer: number | null = null

const refreshUiBusy = computed(
  () => refreshing.value || adding.value || editing.value || Boolean(removingKey.value),
)

const filteredKeywords = computed(() => {
  const text = filterText.value.trim().toLowerCase()
  if (!text) return keywords.value
  return keywords.value.filter((item) => item.keyword.toLowerCase().includes(text))
})

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function clearRefreshStatusHideTimer() {
  if (refreshStatusHideTimer !== null) {
    window.clearTimeout(refreshStatusHideTimer)
    refreshStatusHideTimer = null
  }
}

function hideRefreshStatusLater() {
  clearRefreshStatusHideTimer()
  refreshStatusHideTimer = window.setTimeout(() => {
    if (!refreshing.value) {
      refreshStatus.visible = false
    }
    refreshStatusHideTimer = null
  }, 3000)
}

function startRefreshStatus() {
  clearRefreshTimer()
  clearRefreshStatusHideTimer()

  refreshStatus.visible = true
  refreshStatus.type = 'info'
  refreshStatus.title = '正在刷新关键词'
  refreshStatus.message = '正在将新增关键词与该分类下的报告重新匹配，请稍候。'
  refreshStatus.seconds = 0
  refreshStatus.finishedAtText = ''

  refreshTimer = window.setInterval(() => {
    refreshStatus.seconds += 1
  }, 1000)
}

function formatRefreshFinishedAt(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function markRefreshSuccess() {
  clearRefreshTimer()
  refreshStatus.visible = true
  refreshStatus.type = 'success'
  refreshStatus.title = '刷新完成'
  refreshStatus.message = '关键词与报告的重新匹配已完成，列表已自动刷新。'
  refreshStatus.finishedAtText = formatRefreshFinishedAt(new Date())
  hideRefreshStatusLater()
}

function resetRefreshStatusOnError() {
  clearRefreshTimer()
  clearRefreshStatusHideTimer()
  refreshStatus.visible = false
  refreshStatus.seconds = 0
  refreshStatus.finishedAtText = ''
}

function handleApiError(e: unknown, fallback: string) {
  const err = e as Partial<RequestError>
  if (err?.code === 403 || err?.code === 40302) {
    ElMessage.error('无权限操作，需要管理员权限')
    return
  }
  const msg = e instanceof Error ? e.message : fallback
  ElMessage.error(msg)
}

async function loadCategories() {
  loadingCategories.value = true
  try {
    const data = await request<any[]>('/categories/query', { method: 'GET' })
    categories.value = (data || [])
      .map((item) => ({ id: Number(item?.id), category: String(item?.category ?? '') }))
      .filter((item) => Number.isFinite(item.id) && item.category)
  } catch (e: unknown) {
    handleApiError(e, '加载类别失败')
  } finally {
    loadingCategories.value = false
  }
}

async function loadKeywords() {
  loadingKeywords.value = true
  try {
    if (categoryId.value && Number.isFinite(categoryId.value)) {
      const data = await apiQueryKeywords(categoryId.value)
      keywords.value = (data.keywords || []).map((keyword) => ({ keyword }))
      return
    }

    const data = await apiQueryAllKeywords()
    keywords.value = data.map((keyword) => ({ keyword }))
  } catch (e: unknown) {
    handleApiError(e, '加载关键词失败')
  } finally {
    loadingKeywords.value = false
  }
}

const onCategoryChange = async () => {
  await loadKeywords()
}

const refreshKeywords = async () => {
  if (!categoryId.value) {
    ElMessage.warning('请先选择类别')
    return
  }

  startRefreshStatus()
  refreshing.value = true

  try {
    await apiRefreshReportKeywords(categoryId.value)
    await loadKeywords()
    markRefreshSuccess()
    ElMessage.success('刷新成功')
  } catch (e: unknown) {
    resetRefreshStatusOnError()
    handleApiError(e, '刷新失败')
  } finally {
    refreshing.value = false
  }
}

const addKeyword = async () => {
  const keyword = newKeyword.value.trim()

  if (!categoryId.value) {
    ElMessage.warning('请先选择类别')
    return
  }
  if (!keyword) {
    ElMessage.warning('请输入要新增的关键词')
    return
  }
  if (keywords.value.some((item) => item.keyword === keyword)) {
    ElMessage.warning('关键词已存在')
    return
  }

  adding.value = true
  try {
    await apiAddKeyword({ categoryId: categoryId.value, keyword })
    keywords.value.unshift({ keyword })
    newKeyword.value = ''
    ElMessage.success('新增成功')
  } catch (e: unknown) {
    handleApiError(e, '新增失败')
  } finally {
    adding.value = false
  }
}

const removeKeyword = async (row: KeywordRow) => {
  if (!categoryId.value) {
    ElMessage.warning('请先选择类别')
    return
  }

  await ElMessageBox.confirm(`确定删除关键词“${row.keyword}”吗？`, '提示', { type: 'warning' })

  removingKey.value = row.keyword
  try {
    await apiRemoveKeyword({ categoryId: categoryId.value, keyword: row.keyword })
    keywords.value = keywords.value.filter((item) => item.keyword !== row.keyword)
    ElMessage.success('删除成功')
  } catch (e: unknown) {
    handleApiError(e, '删除失败')
  } finally {
    removingKey.value = ''
  }
}

const openEdit = (row: KeywordRow) => {
  editForm.oldKeyword = row.keyword
  editForm.newKeyword = row.keyword
  editVisible.value = true
}

const submitEdit = async () => {
  if (!categoryId.value) {
    ElMessage.warning('请先选择类别')
    return
  }

  const oldKeyword = editForm.oldKeyword.trim()
  const newKeywordValue = editForm.newKeyword.trim()

  if (!newKeywordValue) {
    ElMessage.warning('请输入新关键词')
    return
  }
  if (newKeywordValue === oldKeyword) {
    ElMessage.warning('新关键词与原关键词相同')
    return
  }
  if (keywords.value.some((item) => item.keyword === newKeywordValue)) {
    ElMessage.warning('新关键词已存在')
    return
  }

  editing.value = true
  try {
    await apiUpdateKeyword({
      categoryId: categoryId.value,
      oldKeyword,
      newKeyword: newKeywordValue,
    })
    keywords.value = keywords.value.map((item) =>
      item.keyword === oldKeyword ? { keyword: newKeywordValue } : item,
    )
    editVisible.value = false
    ElMessage.success('修改成功')
  } catch (e: unknown) {
    handleApiError(e, '修改失败')
  } finally {
    editing.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadKeywords()])
})

onBeforeUnmount(() => {
  clearRefreshTimer()
  clearRefreshStatusHideTimer()
})
</script>
