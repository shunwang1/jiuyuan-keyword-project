<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">关键词管理</div>
    </template>

    <div style="padding: 8px 0">
      <el-alert title="提示" type="warning" :closable="false" show-icon>
        <template #default>
          该页面通常仅管理员可用；若当前账号无权限，后端将返回 403 并提示“无权限”。
        </template>
      </el-alert>
    </div>

    <div style="margin-bottom: 12px">
      <el-form label-width="70px" style="max-width: 720px">
        <el-form-item label="报告类别">
          <el-select
            v-model="categoryId"
            placeholder="请选择类别"
            style="width: 320px"
            :loading="loadingCategories"
            @change="onCategoryChange"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.category" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom: 12px">
      <el-input v-model="filterText" placeholder="筛选关键词..." style="width: 220px" clearable />
      <el-input v-model="newKeyword" placeholder="新增关键词（放到最上面）" style="width: 260px" clearable />
      <el-button type="primary" :loading="adding" :disabled="!categoryId" @click="addKeyword">新增</el-button>
    </div>

    <el-table :data="filteredKeywords" style="width: 100%" v-loading="loadingKeywords">
      <el-table-column prop="keyword" label="关键词" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button type="primary" link :disabled="!categoryId" @click="openEdit(row)">修改</el-button>

          <el-button
            type="danger"
            link
            :loading="removingKey === row.keyword"
            :disabled="!categoryId"
            @click="removeKeyword(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 10px; color:#999; font-size:12px">
      对齐后端：category 一律使用数字ID；新增/修改使用 urlencoded；删除使用 DELETE + querystring。
    </div>

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
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editing" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { request, type RequestError } from '../api/http'
  import { apiQueryKeywords, apiAddKeyword, apiRemoveKeyword, apiUpdateKeyword } from '../api/keywords'

  type KeywordRow = { keyword: string }
  type CategoryRow = { id: number; category: string }

  const categories = ref<CategoryRow[]>([])
  const loadingCategories = ref(false)

  const loadingKeywords = ref(false)
  const categoryId = ref<number | null>(null)

  const filterText = ref('')
  const newKeyword = ref('')

  const adding = ref(false)
  const removingKey = ref('')

  const keywords = ref<KeywordRow[]>([])

  const filteredKeywords = computed(() => {
    const t = filterText.value.trim().toLowerCase()
    if (!t) return keywords.value
    return keywords.value.filter((k) => k.keyword.toLowerCase().includes(t))
  })

  function handleApiError(e: unknown, fallback: string) {
    const err = e as Partial<RequestError>
    if (err?.code === 403 || err?.code === 40302) return ElMessage.error('无权限（需要管理员）')
    const msg = e instanceof Error ? e.message : fallback
    ElMessage.error(msg)
  }

  async function loadCategories() {
    loadingCategories.value = true
    try {
      const data = await request<any[]>('/categories/query', { method: 'GET' })
      categories.value = (data || [])
        .map((x) => ({ id: Number(x?.id), category: String(x?.category ?? '') }))
        .filter((x) => Number.isFinite(x.id) && x.category)
    } catch (e: unknown) {
      handleApiError(e, '加载类别失败')
    } finally {
      loadingCategories.value = false
    }
  }

  onMounted(loadCategories)

  const onCategoryChange = async () => {
    await loadKeywords()
  }

  const loadKeywords = async () => {
    const cid = categoryId.value
    if (!cid || !Number.isFinite(cid)) {
      keywords.value = []
      return
    }
    loadingKeywords.value = true
    try {
      const data = await apiQueryKeywords(cid)
      keywords.value = (data.keywords || []).map((k) => ({ keyword: k }))
    } catch (e: unknown) {
      handleApiError(e, '加载关键词失败')
    } finally {
      loadingKeywords.value = false
    }
  }

  const addKeyword = async () => {
    const kw = newKeyword.value.trim()
    if (!categoryId.value) return ElMessage.warning('请先选择类别')
    if (!kw) return ElMessage.warning('请输入要新增的关键词')
    if (keywords.value.some((x) => x.keyword === kw)) return ElMessage.warning('关键词已存在')

    adding.value = true
    try {
      await apiAddKeyword({ categoryId: categoryId.value, keyword: kw })
      keywords.value.unshift({ keyword: kw })
      newKeyword.value = ''
      ElMessage.success('新增成功')
    } catch (e: unknown) {
      handleApiError(e, '新增失败')
    } finally {
      adding.value = false
    }
  }

  const removeKeyword = async (row: KeywordRow) => {
    if (!categoryId.value) return ElMessage.warning('请先选择类别')

    await ElMessageBox.confirm(`确定删除关键词「${row.keyword}」吗？`, '提示', { type: 'warning' })

    removingKey.value = row.keyword
    try {
      await apiRemoveKeyword({ categoryId: categoryId.value, keyword: row.keyword })
      keywords.value = keywords.value.filter((x) => x.keyword !== row.keyword)
      ElMessage.success('删除成功')
    } catch (e: unknown) {
      handleApiError(e, '删除失败')
    } finally {
      removingKey.value = ''
    }
  }

  const editVisible = ref(false)
  const editing = ref(false)
  const editForm = reactive<{ oldKeyword: string; newKeyword: string }>({
    oldKeyword: '',
    newKeyword: '',
  })

  const openEdit = (row: KeywordRow) => {
    editForm.oldKeyword = row.keyword
    editForm.newKeyword = row.keyword
    editVisible.value = true
  }

  const submitEdit = async () => {
    if (!categoryId.value) return ElMessage.warning('请先选择类别')

    const oldKw = editForm.oldKeyword.trim()
    const newKw = editForm.newKeyword.trim()

    if (!newKw) return ElMessage.warning('请输入新关键词')
    if (newKw === oldKw) return ElMessage.warning('新关键词与原关键词相同')
    if (keywords.value.some((x) => x.keyword === newKw)) return ElMessage.warning('新关键词已存在')

    editing.value = true
    try {
      await apiUpdateKeyword({ categoryId: categoryId.value, oldKeyword: oldKw, newKeyword: newKw })
      keywords.value = keywords.value.map((x) => (x.keyword === oldKw ? { keyword: newKw } : x))
      ElMessage.success('修改成功')
      editVisible.value = false
    } catch (e: unknown) {
      handleApiError(e, '修改失败')
    } finally {
      editing.value = false
    }
  }
</script>
