<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">检索报告</div>
    </template>

    <el-form label-width="110px" style="max-width: 980px">
      <!-- 类别：动态从 /categories/query 获取 -->
      <el-form-item label="报告类别" required>
        <el-select
          v-model="query.categoryId"
          placeholder="请选择类别"
          style="width: 320px"
          filterable
          :loading="loadingCategories"
          @change="onCategoryChange"
        >
          <el-option v-for="c in categories" :key="c.id" :label="c.category" :value="c.id" />
        </el-select>
        <div style="color:#999; font-size:12px; margin-left: 12px">
          先选择类别，系统会自动加载型号规格/门类/厂家/批号的候选项
        </div>
      </el-form-item>

      <!-- 关键词 -->
      <el-form-item label="关键词">
        <el-select
          v-model="query.keywords"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="请选择关键词（可多选）"
          style="width: 520px"
          :disabled="!query.categoryId"
          :loading="loadingKeywords"
          @visible-change="onKeywordsVisibleChange"
        >
          <el-option v-for="k in keywordOptions" :key="k" :label="k" :value="k" />
        </el-select>
      </el-form-item>

      <!-- 型号规格 -->
      <el-form-item label="型号规格">
        <el-select
          v-model="query.modelSpec"
          placeholder="请选择型号规格"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.modelSpecs"
        >
          <el-option v-for="x in options.modelSpecs" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <!-- 元器件门类 -->
      <el-form-item label="元器件门类">
        <el-select
          v-model="query.componentCategory"
          placeholder="请选择元器件门类"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.componentCategories"
        >
          <el-option v-for="x in options.componentCategories" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <!-- 厂家信息 -->
      <el-form-item label="厂家信息">
        <el-select
          v-model="query.manufacturerName"
          placeholder="请选择厂家信息"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.manufacturers"
        >
          <el-option v-for="x in options.manufacturers" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <!-- 批号 -->
      <el-form-item label="批号">
        <el-select
          v-model="query.batchNumber"
          placeholder="请选择批号"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.batchNumbers"
        >
          <el-option v-for="x in options.batchNumbers" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <!-- 操作按钮 -->
      <el-form-item>
        <el-button type="primary" :loading="loadingSearch" @click="doSearch(true)">检索</el-button>
        <el-button :disabled="loadingSearch" @click="resetForm">重置</el-button>

        <el-button
          type="success"
          :disabled="selectedRows.length < 2 || selectedRows.length > 3"
          @click="openCompare"
        >
          对比（已选 {{ selectedRows.length }}）
        </el-button>

        <div style="color:#999; font-size:12px; margin-top: 6px">
          提示：在下方表格勾选 2 或 3 份报告后，可进行对比预览。
        </div>
      </el-form-item>
    </el-form>

    <el-divider />

    <el-table
      :data="result"
      style="width: 100%"
      v-loading="loadingSearch"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="fileName" label="报告名称" min-width="240" />

      <el-table-column label="类别" width="160">
        <template #default="{ row }">
          {{ categoryNameById(row.category) }}
        </template>
      </el-table-column>

      <el-table-column prop="modelSpec" label="型号规格" min-width="160" />

      <el-table-column label="元器件门类" min-width="150">
        <template #default="{ row }">
          {{ row.deviceCategory || row.componentCategory || '' }}
        </template>
      </el-table-column>

      <el-table-column label="厂家信息" min-width="160">
        <template #default="{ row }">
          {{ row.vendor || row.manufacturerName || row.manufacture || '' }}
        </template>
      </el-table-column>

      <el-table-column label="批号" min-width="140">
        <template #default="{ row }">
          {{ row.batchNo || row.batchNumber || '' }}
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          {{ statusLabel(row.status) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button
            type="primary"
            link
            :loading="previewLoadingId === row.reportId"
            @click="previewReport(row)"
          >
            预览
          </el-button>
          <el-button type="primary" link :loading="openLoadingId === row.reportId" @click="openReport(row)">
            打开
          </el-button>
          <el-button
            type="primary"
            link
            :loading="downloadLoadingId === row.reportId"
            @click="downloadReport(row)"
          >
            下载
          </el-button>
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

    <!-- 单份预览 -->
    <el-dialog
      v-model="previewVisible"
      title="报告预览"
      width="80%"
      top="5vh"
      :destroy-on-close="true"
      @closed="cleanupPreviewUrl"
    >
      <div style="height: 75vh">
        <iframe v-if="previewUrl" :src="previewUrl" style="width: 100%; height: 100%; border: 0" />
        <div v-else style="color:#999">暂无可预览内容</div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!previewUrl" @click="openPreviewInNewTab">新窗口打开</el-button>
      </template>
    </el-dialog>

    <!-- 对比预览 -->
    <el-dialog
      v-model="compareVisible"
      title="报告对比预览"
      width="92%"
      top="4vh"
      :destroy-on-close="true"
      @closed="cleanupCompareUrls"
    >
      <div class="compare" :style="{ gridTemplateColumns: `repeat(${compareItems.length || 1}, 1fr)` }">
        <div v-for="it in compareItems" :key="it.reportId" class="compare__col">
          <div class="compare__title" :title="it.fileName">{{ it.fileName }}</div>
          <div v-if="it.loading" style="padding: 10px; color:#999">加载中...</div>
          <iframe v-else :src="it.url" class="compare__iframe" />
        </div>
      </div>

      <template #footer>
        <el-button @click="compareVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '../api/http'
import { apiQueryKeywords } from '../api/keywords'
import {
  apiSearchReports,
  apiReportFileBlob,
  apiQueryModelSpecs,
  apiQueryComponentCategories,
  apiQueryManufacturers,
  apiQueryBatchNumbers,
  type ReportListItem,
  type SearchReportsResponseData,
} from '../api/reports'

type CategoryRow = { id: number; category: string }
type FileBlobResult = { blob: Blob; fileName: string }

// 为了兼容后端返回的不同字段名，放宽行类型
type ReportRow = ReportListItem & {
  componentCategory?: string
  manufacturerName?: string
  manufacture?: string
  batchNumber?: string
}

// 动态类别
const categories = ref<CategoryRow[]>([])
const loadingCategories = ref(false)

const categoryNameById = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v)
  const hit = categories.value.find((x) => x.id === n)
  return hit?.category ?? (v == null ? '' : String(v))
}

const statusLabel = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (n === 1001) return '待处理'
  if (n === 1002) return '已通过'
  if (n === 1003) return '已拒绝'
  return v == null ? '' : String(v)
}

const query = reactive<{
  categoryId: number | null
  modelSpec: string
  componentCategory: string
  manufacturerName: string
  batchNumber: string
  keywords: string[]
}>({
  categoryId: null,
  modelSpec: '',
  componentCategory: '',
  manufacturerName: '',
  batchNumber: '',
  keywords: [],
})

const keywordOptions = ref<string[]>([])
const loadingKeywords = ref(false)

const options = reactive({
  modelSpecs: [] as string[],
  componentCategories: [] as string[],
  manufacturers: [] as string[],
  batchNumbers: [] as string[],
})

const loadingOptions = reactive({
  modelSpecs: false,
  componentCategories: false,
  manufacturers: false,
  batchNumbers: false,
})

const page = reactive({ pageNo: 1, pageSize: 15 })
const total = ref(0)
const result = ref<ReportRow[]>([])
const loadingSearch = ref(false)

const selectedRows = ref<ReportRow[]>([])

async function loadCategories() {
  loadingCategories.value = true
  try {
    const data = await request<any[]>('/categories/query', { method: 'GET' })
    categories.value = (data || [])
      .map((x) => ({ id: Number(x?.id), category: String(x?.category ?? x?.name ?? '') }))
      .filter((x) => Number.isFinite(x.id) && x.category)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载类别失败')
  } finally {
    loadingCategories.value = false
  }
}

onMounted(loadCategories)

const onCategoryChange = async () => {
  query.keywords = []
  keywordOptions.value = []

  query.modelSpec = ''
  query.componentCategory = ''
  query.manufacturerName = ''
  query.batchNumber = ''

  options.modelSpecs = []
  options.componentCategories = []
  options.manufacturers = []
  options.batchNumbers = []

  if (!query.categoryId) return

  loadingOptions.modelSpecs = true
  loadingOptions.componentCategories = true
  loadingOptions.manufacturers = true
  loadingOptions.batchNumbers = true
  try {
    const cid = query.categoryId
    const [ms, cc, mf, bn] = await Promise.all([
      apiQueryModelSpecs(cid),
      apiQueryComponentCategories(cid),
      apiQueryManufacturers(cid),
      apiQueryBatchNumbers(cid),
    ])
    options.modelSpecs = ms
    options.componentCategories = cc
    options.manufacturers = mf
    options.batchNumbers = bn
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载下拉选项失败')
  } finally {
    loadingOptions.modelSpecs = false
    loadingOptions.componentCategories = false
    loadingOptions.manufacturers = false
    loadingOptions.batchNumbers = false
  }
}

const onKeywordsVisibleChange = async (visible: boolean) => {
  if (!visible) return
  if (!query.categoryId) return ElMessage.warning('请先选择类别')
  if (keywordOptions.value.length > 0) return

  loadingKeywords.value = true
  try {
    const data = await apiQueryKeywords(query.categoryId)
    keywordOptions.value = data.keywords || []
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载关键词失败')
  } finally {
    loadingKeywords.value = false
  }
}

const doSearch = async (resetToFirstPage = false) => {
  if (!query.categoryId) return ElMessage.warning('请选择类别')
  if (resetToFirstPage) page.pageNo = 1

  loadingSearch.value = true
  try {
    const data: SearchReportsResponseData = await apiSearchReports({
      filters: {
        category: query.categoryId,
        modelSpec: query.modelSpec || undefined,
        deviceCategory: query.componentCategory || undefined,
        vendor: query.manufacturerName || undefined,
        batchNo: query.batchNumber || undefined,
        keywords: query.keywords,
      },
      page: { ...page },
    })

    result.value = (data.list || []) as ReportRow[]
    total.value = data.total || 0
    ElMessage.success('检索完成')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '检索失败')
  } finally {
    loadingSearch.value = false
  }
}

const onPageChange = async (p: number) => {
  page.pageNo = p
  await doSearch(false)
}

const resetForm = () => {
  query.categoryId = null
  query.modelSpec = ''
  query.componentCategory = ''
  query.manufacturerName = ''
  query.batchNumber = ''
  query.keywords = []
  keywordOptions.value = []

  options.modelSpecs = []
  options.componentCategories = []
  options.manufacturers = []
  options.batchNumbers = []

  result.value = []
  total.value = 0
  page.pageNo = 1
  selectedRows.value = []

  cleanupPreviewUrl()
  cleanupCompareUrls()
}

const onSelectionChange = (rows: ReportRow[]) => {
  selectedRows.value = rows
}

/* ===========================
 * 下载文件名解析（增强版）
 * =========================== */

function decodeFileNameSafely(value: string): string {
  const s = String(value || '').trim()
  if (!s) return ''
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function stripQuotes(value: string): string {
  return String(value || '').trim().replace(/^"(.*)"$/, '$1')
}

function sanitizeDownloadFileName(value: string, fallbackName: string): string {
  const fallback = String(fallbackName || '').trim() || 'download'
  const name = String(value || '').trim()
  if (!name) return fallback
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim()
  return cleaned || fallback
}

function extractFileNameFromContentDisposition(disposition: string | null, fallbackName: string): string {
  const fallback = String(fallbackName || '').trim() || 'download'
  if (!disposition) return fallback

  const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    const decoded = decodeFileNameSafely(stripQuotes(utf8Match[1]))
    return sanitizeDownloadFileName(decoded, fallback)
  }

  const quotedMatch = disposition.match(/filename\s*=\s*"([^"]+)"/i)
  if (quotedMatch?.[1]) return sanitizeDownloadFileName(quotedMatch[1], fallback)

  const plainMatch = disposition.match(/filename\s*=\s*([^;]+)/i)
  if (plainMatch?.[1]) return sanitizeDownloadFileName(stripQuotes(plainMatch[1]), fallback)

  return fallback
}

/* ===========================
 * blob 预览/打开/下载
 * =========================== */

const previewVisible = ref(false)
const previewUrl = ref('')
const previewLoadingId = ref<number | null>(null)
let previewUrlToRevoke: string | null = null

const openLoadingId = ref<number | null>(null)
const downloadLoadingId = ref<number | null>(null)

function cleanupPreviewUrl() {
  if (previewUrlToRevoke) {
    URL.revokeObjectURL(previewUrlToRevoke)
    previewUrlToRevoke = null
  }
  previewUrl.value = ''
}

async function getFileBlobResult(row: ReportRow): Promise<FileBlobResult> {
  const res = await apiReportFileBlob(row.reportId)
  const disposition =
    res.headers.get('content-disposition') ||
    res.headers.get('Content-Disposition') ||
    ''

  const fileName = extractFileNameFromContentDisposition(disposition, row.fileName || 'report')

  return { blob: res.blob, fileName }
}

async function getBlobUrlByRow(row: ReportRow) {
  const { blob } = await getFileBlobResult(row)
  return URL.createObjectURL(blob)
}

const previewReport = async (row: ReportRow) => {
  cleanupPreviewUrl()
  previewLoadingId.value = row.reportId
  try {
    const url = await getBlobUrlByRow(row)
    previewUrl.value = url
    previewUrlToRevoke = url
    previewVisible.value = true
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '预览失败')
  } finally {
    previewLoadingId.value = null
  }
}

const openPreviewInNewTab = () => {
  if (!previewUrl.value) return
  window.open(previewUrl.value, '_blank')
}

const openReport = async (row: ReportRow) => {
  openLoadingId.value = row.reportId
  try {
    const url = await getBlobUrlByRow(row)
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '打开失败')
  } finally {
    openLoadingId.value = null
  }
}

const downloadReport = async (row: ReportRow) => {
  downloadLoadingId.value = row.reportId
  try {
    const { blob, fileName } = await getFileBlobResult(row)
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName || row.fileName || 'report'
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '下载失败')
  } finally {
    downloadLoadingId.value = null
  }
}

/* ===========================
 * 对比预览
 * =========================== */

const compareVisible = ref(false)
const compareItems = ref<Array<{ reportId: number; fileName: string; url: string; loading: boolean }>>([])
const compareUrlsToRevoke = ref<string[]>([])

function cleanupCompareUrls() {
  for (const u of compareUrlsToRevoke.value) URL.revokeObjectURL(u)
  compareUrlsToRevoke.value = []
  compareItems.value = []
}

const openCompare = async () => {
  if (selectedRows.value.length < 2 || selectedRows.value.length > 3) {
    return ElMessage.warning('请选择 2 或 3 份报告进行对比')
  }

  cleanupCompareUrls()
  compareVisible.value = true

  compareItems.value = selectedRows.value.slice(0, 3).map((r) => ({
    reportId: r.reportId,
    fileName: r.fileName,
    url: '',
    loading: true,
  }))

  await Promise.all(
    compareItems.value.map(async (it) => {
      try {
        const row = selectedRows.value.find((x) => x.reportId === it.reportId)
        if (!row) throw new Error('报告不存在')

        const url = await getBlobUrlByRow(row)
        it.url = url
        it.loading = false
        compareUrlsToRevoke.value.push(url)
      } catch {
        it.url = ''
        it.loading = false
      }
    }),
  )
}
</script>

<style scoped>
.compare {
  display: grid;
  gap: 12px;
  height: 78vh;
}

.compare__col {
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  background: #fff;
}

.compare__title {
  padding: 8px 10px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compare__iframe {
  width: 100%;
  height: 100%;
  border: 0;
  flex: 1;
}
</style>
