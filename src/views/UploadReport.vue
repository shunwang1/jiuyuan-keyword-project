<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">元器件报告上传</div>
    </template>

    <el-form label-width="120px" style="max-width: 900px">
      <!-- 报告类别：先选（不做新增/删除） -->
      <el-form-item label="报告类别" required>
        <div class="row">
          <el-select
            v-model="form.categoryId"
            placeholder="请选择类别"
            style="width: 460px"
            filterable
            :loading="loading.categories"
            @change="onCategoryChange"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
      </el-form-item>

      <!-- 厂家（推荐第一步） -->
      <el-form-item label="厂家">
        <div class="row">
          <el-select
            v-model="form.manufacturerName"
            placeholder="请选择厂家（可选）"
            style="width: 460px"
            filterable
            clearable
            :disabled="!form.categoryId"
            :loading="loading.manufacturers"
          >
            <el-option v-for="x in manufacturers" :key="x" :label="x" :value="x" />
          </el-select>

          <el-button
            type="primary"
            plain
            :disabled="!form.categoryId"
            @click="openAdd('manufacturerName')"
          >
            增加
          </el-button>

          <el-button
            v-if="auth.isAdmin"
            type="danger"
            plain
            :disabled="!form.categoryId || !form.manufacturerName"
            :loading="deleting.manufacturerName"
            @click="onDelete('manufacturerName')"
          >
            删除
          </el-button>
        </div>
      </el-form-item>

      <!-- 元器件门类（原本必填，这里只在界面提示，不在逻辑中强制） -->
      <el-form-item label="门类">
        <div class="row">
          <el-select
            v-model="form.componentCategory"
            placeholder="请选择元器件门类（可选）"
            style="width: 460px"
            filterable
            clearable
            :disabled="!form.categoryId"
            :loading="loading.componentCategories"
          >
            <el-option v-for="x in componentCategories" :key="x" :label="x" :value="x" />
          </el-select>

          <el-button
            type="primary"
            plain
            :disabled="!form.categoryId"
            @click="openAdd('componentCategory')"
          >
            增加
          </el-button>

          <el-button
            v-if="auth.isAdmin"
            type="danger"
            plain
            :disabled="!form.categoryId || !form.componentCategory"
            :loading="deleting.componentCategory"
            @click="onDelete('componentCategory')"
          >
            删除
          </el-button>
        </div>
      </el-form-item>

      <!-- 型号规格（原本必填，这里改为可选） -->
      <el-form-item label="型号规格">
        <div class="row">
          <el-select
            v-model="form.modelSpec"
            placeholder="请选择型号规格（可选）"
            style="width: 460px"
            filterable
            clearable
            :disabled="!form.categoryId"
            :loading="loading.modelSpecs"
          >
            <el-option v-for="x in modelSpecs" :key="x" :label="x" :value="x" />
          </el-select>

          <el-button type="primary" plain :disabled="!form.categoryId" @click="openAdd('modelSpec')">
            增加
          </el-button>

          <el-button
            v-if="auth.isAdmin"
            type="danger"
            plain
            :disabled="!form.categoryId || !form.modelSpec"
            :loading="deleting.modelSpec"
            @click="onDelete('modelSpec')"
          >
            删除
          </el-button>
        </div>
      </el-form-item>

      <!-- 批号 -->
      <el-form-item label="批号">
        <div class="row">
          <el-select
            v-model="form.batchNumber"
            placeholder="请选择批号（可选）"
            style="width: 460px"
            filterable
            clearable
            :disabled="!form.categoryId"
            :loading="loading.batchNumbers"
          >
            <el-option v-for="x in batchNumbers" :key="x" :label="x" :value="x" />
          </el-select>

          <el-button type="primary" plain :disabled="!form.categoryId" @click="openAdd('batchNumber')">
            增加
          </el-button>

          <el-button
            v-if="auth.isAdmin"
            type="danger"
            plain
            :disabled="!form.categoryId || !form.batchNumber"
            :loading="deleting.batchNumber"
            @click="onDelete('batchNumber')"
          >
            删除
          </el-button>
        </div>
      </el-form-item>

      <!-- 上传文件 -->
      <el-form-item label="上传文件" required>
        <input type="file" accept=".pdf,.doc,.docx" @change="onFileChange" />
        <div style="color:#999; font-size:12px; margin-top:6px">
          必须选择文件（File 类型），文件名重复后端会拒绝上传
        </div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="uploading" @click="onUpload">上传</el-button>
      </el-form-item>

      <div style="color:#999; font-size:12px; line-height:1.6">
        必填：category；<br />
        可选：manufacturerName / componentCategory / modelSpec / batchNumber。<br />
        新增：普通用户可用；删除：管理员按钮可见（后端也会校验）。
      </div>
    </el-form>

    <!-- 增加弹窗 -->
    <el-dialog v-model="addDialog.visible" :title="addDialogTitle" width="560px">
      <el-form label-width="90px">
        <el-form-item label="新值" required>
          <el-input v-model="addDialog.value" placeholder="请输入要新增的值" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button :disabled="addDialog.loading" @click="addDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="addDialog.loading" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { RequestError } from '../api/http'
import { useAuthStore } from '../stores/auth'
import {
  apiUploadReport,
  apiQueryCategories,
  apiQueryModelSpecs,
  apiQueryComponentCategories,
  apiQueryManufacturers,
  apiQueryBatchNumbers,
  apiAddModelSpec,
  apiDeleteModelSpec,
  apiAddComponentCategory,
  apiDeleteComponentCategory,
  apiAddManufacturer,
  apiDeleteManufacturer,
  apiAddBatchNumber,
  apiDeleteBatchNumber,
  type CategoryItem,
} from '../api/reports'

defineOptions({ name: 'UploadReport' })

const auth = useAuthStore()

const uploading = ref(false)
const fileRef = ref<File | null>(null)

// 下拉数据
const categories = ref<CategoryItem[]>([])
const modelSpecs = ref<string[]>([])
const componentCategories = ref<string[]>([])
const manufacturers = ref<string[]>([])
const batchNumbers = ref<string[]>([])

const loading = reactive({
  categories: false,
  modelSpecs: false,
  componentCategories: false,
  manufacturers: false,
  batchNumbers: false,
})

const deleting = reactive({
  modelSpec: false,
  componentCategory: false,
  manufacturerName: false,
  batchNumber: false,
})

const form = reactive<{
  categoryId: number | null
  modelSpec: string
  componentCategory: string
  manufacturerName: string
  batchNumber: string
}>({
  categoryId: null,
  modelSpec: '',
  componentCategory: '',
  manufacturerName: '',
  batchNumber: '',
})

function handleApiError(e: unknown, fallback: string) {
  const err = e as Partial<RequestError>
  if (err?.code === 403) return ElMessage.error('无权限（需要管理员）')
  const msg = e instanceof Error ? e.message : fallback
  ElMessage.error(msg)
}

onMounted(async () => {
  await loadCategories()
})

async function loadCategories() {
  loading.categories = true
  try {
    categories.value = await apiQueryCategories()
  } catch (e: unknown) {
    handleApiError(e, '加载类别失败')
  } finally {
    loading.categories = false
  }
}

async function loadDependents(categoryId: number) {
  form.modelSpec = ''
  form.componentCategory = ''
  form.manufacturerName = ''
  form.batchNumber = ''

  modelSpecs.value = []
  componentCategories.value = []
  manufacturers.value = []
  batchNumbers.value = []

  loading.modelSpecs = true
  loading.componentCategories = true
  loading.manufacturers = true
  loading.batchNumbers = true

  try {
    const [ms, cc, mf, bn] = await Promise.all([
      apiQueryModelSpecs(categoryId),
      apiQueryComponentCategories(categoryId),
      apiQueryManufacturers(categoryId),
      apiQueryBatchNumbers(categoryId),
    ])
    modelSpecs.value = ms
    componentCategories.value = cc
    manufacturers.value = mf
    batchNumbers.value = bn
  } catch (e: unknown) {
    handleApiError(e, '加载下拉数据失败')
  } finally {
    loading.modelSpecs = false
    loading.componentCategories = false
    loading.manufacturers = false
    loading.batchNumbers = false
  }
}

const onCategoryChange = async () => {
  if (!form.categoryId) return
  await loadDependents(form.categoryId)
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  fileRef.value = input.files?.[0] || null
}

type FieldKey = 'modelSpec' | 'componentCategory' | 'manufacturerName' | 'batchNumber'

const addDialog = reactive<{
  visible: boolean
  loading: boolean
  field: FieldKey | ''
  value: string
}>({
  visible: false,
  loading: false,
  field: '',
  value: '',
})

const addDialogTitle = computed(() => {
  const map: Record<string, string> = {
    modelSpec: '新增型号规格',
    componentCategory: '新增元器件门类',
    manufacturerName: '新增厂家',
    batchNumber: '新增批号',
  }
  return map[addDialog.field] || '新增'
})

function openAdd(field: FieldKey) {
  if (!form.categoryId) return ElMessage.warning('请先选择报告类别')
  addDialog.field = field
  addDialog.value = ''
  addDialog.visible = true
}

async function submitAdd() {
  if (!form.categoryId) return ElMessage.warning('请先选择报告类别')
  const v = addDialog.value.trim()
  if (!v) return ElMessage.warning('请输入新值')

  addDialog.loading = true
  try {
    const categoryId = form.categoryId

    if (addDialog.field === 'modelSpec') {
      await apiAddModelSpec({ categoryId, modelSpec: v })
      ElMessage.success('新增成功')
      modelSpecs.value = await apiQueryModelSpecs(categoryId)
      form.modelSpec = v
    } else if (addDialog.field === 'componentCategory') {
      await apiAddComponentCategory({ categoryId, componentCategory: v })
      ElMessage.success('新增成功')
      componentCategories.value = await apiQueryComponentCategories(categoryId)
      form.componentCategory = v
    } else if (addDialog.field === 'manufacturerName') {
      await apiAddManufacturer({ categoryId, manufacturerName: v })
      ElMessage.success('新增成功')
      manufacturers.value = await apiQueryManufacturers(categoryId)
      form.manufacturerName = v
    } else if (addDialog.field === 'batchNumber') {
      await apiAddBatchNumber({ categoryId, batchNumber: v })
      ElMessage.success('新增成功')
      batchNumbers.value = await apiQueryBatchNumbers(categoryId)
      form.batchNumber = v
    }

    addDialog.visible = false
  } catch (e: unknown) {
    handleApiError(e, '新增失败')
  } finally {
    addDialog.loading = false
  }
}

async function onDelete(field: FieldKey) {
  if (!auth.isAdmin) return ElMessage.error('无权限（需要管理员）')
  if (!form.categoryId) return ElMessage.warning('请先选择报告类别')
  const categoryId = form.categoryId

  try {
    if (field === 'modelSpec') {
      const v = form.modelSpec.trim()
      if (!v) return ElMessage.warning('请选择要删除的型号规格')
      await ElMessageBox.confirm(`确定删除型号规格「${v}」吗？`, '提示', { type: 'warning' })
      deleting.modelSpec = true
      await apiDeleteModelSpec({ categoryId, modelSpec: v })
      ElMessage.success('删除成功')
      modelSpecs.value = await apiQueryModelSpecs(categoryId)
      form.modelSpec = ''
    } else if (field === 'componentCategory') {
      const v = form.componentCategory.trim()
      if (!v) return ElMessage.warning('请选择要删除的门类')
      await ElMessageBox.confirm(`确定删除门类「${v}」吗？`, '提示', { type: 'warning' })
      deleting.componentCategory = true
      await apiDeleteComponentCategory({ categoryId, componentCategory: v })
      ElMessage.success('删除成功')
      componentCategories.value = await apiQueryComponentCategories(categoryId)
      form.componentCategory = ''
    } else if (field === 'manufacturerName') {
      const v = form.manufacturerName.trim()
      if (!v) return ElMessage.warning('请选择要删除的厂家')
      await ElMessageBox.confirm(`确定删除厂家「${v}」吗？`, '提示', { type: 'warning' })
      deleting.manufacturerName = true
      await apiDeleteManufacturer({ categoryId, manufacturerName: v })
      ElMessage.success('删除成功')
      manufacturers.value = await apiQueryManufacturers(categoryId)
      form.manufacturerName = ''
    } else if (field === 'batchNumber') {
      const v = form.batchNumber.trim()
      if (!v) return ElMessage.warning('请选择要删除的批号')
      await ElMessageBox.confirm(`确定删除批号「${v}」吗？`, '提示', { type: 'warning' })
      deleting.batchNumber = true
      await apiDeleteBatchNumber({ categoryId, batchNumber: v })
      ElMessage.success('删除成功')
      batchNumbers.value = await apiQueryBatchNumbers(categoryId)
      form.batchNumber = ''
    }
  } catch (e: unknown) {
    if (e instanceof Error && (e as any).message?.includes('cancel')) return
    handleApiError(e, '删除失败')
  } finally {
    deleting.modelSpec = false
    deleting.componentCategory = false
    deleting.manufacturerName = false
    deleting.batchNumber = false
  }
}

// ===== upload =====
const onUpload = async () => {
  if (!form.categoryId) return ElMessage.warning('请选择报告类别')
  // 型号规格/门类改为可选，不再强制校验
  if (!fileRef.value) return ElMessage.warning('请选择要上传的文件（File）')

  uploading.value = true
  try {
    await apiUploadReport({
      file: fileRef.value,
      category: form.categoryId,
      modelSpec: form.modelSpec.trim() || undefined,
      componentCategory: form.componentCategory.trim() || undefined,
      manufacturerName: form.manufacturerName.trim() || undefined,
      batchNumber: form.batchNumber.trim() || undefined,
    })

    ElMessage.success('上传成功')

    form.modelSpec = ''
    form.componentCategory = ''
    form.manufacturerName = ''
    form.batchNumber = ''
    fileRef.value = null
  } catch (e: unknown) {
    const err = e as Partial<RequestError>
    const msg = e instanceof Error ? e.message : ''

    if (err?.code === 409 || /重复|已存在/i.test(msg)) {
      return ElMessage.error('上传失败：文件名已存在，请更换文件名后重试')
    }

    handleApiError(e, '上传失败（可能文件名重复）')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
