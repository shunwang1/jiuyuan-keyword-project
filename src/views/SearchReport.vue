<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">检索报告</div>
    </template>

    <el-form label-width="110px" style="max-width: 980px">
      <el-form-item label="检索方式">
        <el-radio-group v-model="searchMode">
          <el-radio-button label="reportNo">按报告编号检索</el-radio-button>
          <el-radio-button label="keywords">按关键词检索</el-radio-button>
          <el-radio-button label="advanced">综合检索</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="searchMode === 'reportNo'" label="报告编号" required>
        <el-input
          v-model="query.reportNo"
          placeholder="请输入报告编号，支持模糊搜索"
          style="width: 520px"
          clearable
        />
      </el-form-item>

      <el-form-item v-if="searchMode === 'advanced'" label="报告类别">
        <el-select
          v-model="query.categoryId"
          placeholder="请选择类别（可选）"
          style="width: 320px"
          filterable
          clearable
          :loading="loadingCategories"
          @change="onCategoryChange"
        >
          <el-option v-for="c in categories" :key="c.id" :label="c.category" :value="c.id" />
        </el-select>
        <div style="color:#999; font-size:12px; margin-left: 12px">
          类别不再强制；如果选择类别，系统会自动加载厂家/门类/型号规格/批号候选项
        </div>
      </el-form-item>

      <el-form-item v-if="searchMode === 'advanced'" label="厂家信息">
        <el-select
          v-model="query.manufacturerName"
          placeholder="请选择厂家（可选）"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.manufacturers"
        >
          <el-option v-for="x in options.manufacturers" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="searchMode === 'advanced'" label="元器件门类">
        <el-select
          v-model="query.componentCategory"
          placeholder="请选择元器件门类（可选）"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.componentCategories"
        >
          <el-option v-for="x in options.componentCategories" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="searchMode === 'advanced'" label="型号规格">
        <el-select
          v-model="query.modelSpec"
          placeholder="请选择型号规格（可选）"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.modelSpecs"
        >
          <el-option v-for="x in options.modelSpecs" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="searchMode === 'advanced'" label="批号">
        <el-select
          v-model="query.batchNumber"
          placeholder="请选择批号（可选）"
          style="width: 520px"
          filterable
          clearable
          :disabled="!query.categoryId"
          :loading="loadingOptions.batchNumbers"
        >
          <el-option v-for="x in options.batchNumbers" :key="x" :label="x" :value="x" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="searchMode === 'keywords' || searchMode === 'advanced'" label="关键词">
        <el-select
          v-model="query.keywords"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="请选择关键词（可多选）"
          style="width: 520px"
          :loading="loadingKeywords"
          @visible-change="onKeywordsVisibleChange"
        >
          <el-option v-for="k in keywordOptions" :key="k" :label="k" :value="k" />
        </el-select>
      </el-form-item>

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
          <template v-if="searchMode === 'reportNo'">
            通过报告编号全库模糊检索，不需要选择类别。
          </template>
          <template v-else-if="searchMode === 'keywords'">
            直接按关键词全库检索，不需要选择类别；多个关键词之间为 AND 关系。
          </template>
          <template v-else>
            可选择类别后进一步筛选厂家/门类/型号规格/批号，也可仅按关键词检索。
          </template>
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
      <el-table-column prop="reportNo" label="报告编号" min-width="200" />

      <el-table-column label="类别" width="160">
        <template #default="{ row }">
          {{ categoryNameById(row.category) }}
        </template>
      </el-table-column>

      <el-table-column prop="modelSpec" label="型号规格" min-width="160" />

      <el-table-column label="元器件门类" min-width="150">
        <template #default="{ row }">
          {{ row.deviceCategory || '' }}
        </template>
      </el-table-column>

      <el-table-column label="厂家信息" min-width="160">
        <template #default="{ row }">
          {{ row.vendor || '' }}
        </template>
      </el-table-column>

      <el-table-column label="批号" min-width="140">
        <template #default="{ row }">
          {{ row.batchNo || '' }}
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          {{ statusLabel(row.status) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="320">
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
          <el-button type="primary" link @click="openStatusDialog(row)">
            更新状态
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
      width="90%"
      top="3vh"
      :destroy-on-close="true"
      @closed="cleanupPreview"
    >
      <div style="height: 82vh">
        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          style="width: 100%; height: 100%; border: 0"
        />
        <div v-else style="color:#999">暂无可预览内容</div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 对比预览 -->
    <el-dialog
      v-model="compareVisible"
      title="报告对比预览"
      width="96%"
      top="2vh"
      :destroy-on-close="true"
      @closed="cleanupCompare"
    >
      <div style="display:flex; gap: 12px; height: 84vh;">
        <div
          class="compare"
          :style="{ gridTemplateColumns: `repeat(${compareItems.length || 1}, 1fr)` }"
        >
          <div v-for="it in compareItems" :key="it.reportId" class="compare__col">
            <div class="compare__title" :title="it.fileName">{{ it.fileName }}</div>
            <div v-if="it.loading" style="padding: 10px; color:#999">加载中...</div>
            <iframe
              v-else-if="it.url"
              :src="it.url"
              class="compare__iframe"
            />
            <div v-else style="padding: 12px; color:#999">暂无可预览内容</div>
          </div>
        </div>

        <div class="keyword-panel">
          <div class="keyword-panel__title">比对关键词</div>

          <div style="color:#999; font-size: 12px; margin-bottom: 8px;">
            请选择一个当前检索关键词进行比对
          </div>

          <div v-if="keywordOptionsForCompare.length === 0" style="color:#999; padding: 8px 0;">
            当前没有可用关键词，请先在检索条件中选择关键词
          </div>

          <div v-else class="keyword-tag-wrap">
            <el-tag
              v-for="k in keywordOptionsForCompare"
              :key="k"
              class="keyword-tag"
              :type="selectedCompareKeyword === k ? 'primary' : 'info'"
              :effect="selectedCompareKeyword === k ? 'dark' : 'light'"
              round
              @click="selectedCompareKeyword = k"
            >
              {{ k }}
            </el-tag>
          </div>

          <div style="display:flex; gap: 10px; margin-top: 16px;">
            <el-button
              type="primary"
              :loading="compareKeywordLoading"
              :disabled="!selectedCompareKeyword || selectedRows.length < 2 || selectedRows.length > 3"
              @click="compareByKeyword"
            >
              比对关键词
            </el-button>

            <el-button @click="compareVisible = false">关闭</el-button>
          </div>

          <div style="margin-top: 18px; color:#999; font-size:12px; line-height:1.6">
            当前已选报告：{{ selectedRows.length }} 份<br />
            支持 2 ~ 3 份报告；后端按所选关键词生成对比 PDF。
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 关键词比对结果 -->
    <el-dialog
      v-model="comparePdfVisible"
      title="关键词比对结果"
      width="92%"
      top="3vh"
      :destroy-on-close="true"
      @closed="cleanupComparePdf"
    >
      <div style="height: 84vh">
        <iframe
          v-if="comparePdfUrl"
          :src="comparePdfUrl"
          style="width: 100%; height: 100%; border: 0"
        />
        <div v-else style="color:#999">暂无比对结果</div>
      </div>

      <template #footer>
        <el-button @click="comparePdfVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 更新状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新报告状态"
      width="420px"
      :destroy-on-close="true"
    >
      <el-form label-width="90px">
        <el-form-item label="当前状态">
          <span>{{ statusLabel(statusForm.currentStatus) || '未知' }}</span>
        </el-form-item>
        <el-form-item label="新状态" required>
          <el-select
            v-model="statusForm.newStatus"
            placeholder="请选择新状态"
            style="width: 260px"
          >
            <el-option :value="1001" label="1001 待处理" />
            <el-option :value="1002" label="1002 已通过" />
            <el-option :value="1003" label="1003 已拒绝" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="statusUpdating" @click="submitStatusUpdate">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { request } from '../api/http'
import { apiQueryAllKeywords } from '../api/keywords'
import {
  apiSearchReports,
  apiSearchReportsByReportNo,
  apiSearchReportsByKeywords,
  apiReportFileBlob,
  apiReportPreviewBlob,
  apiCompareReportsByKeyword,
  apiQueryModelSpecs,
  apiQueryComponentCategories,
  apiQueryManufacturers,
  apiQueryBatchNumbers,
  apiUpdateReportStatus,
  type ReportListItem,
  type SearchReportsResponseData,
  type ReportStatusCode,
} from '../api/reports'

type CategoryRow = { id: number; category: string }

type ReportRow = ReportListItem & {
  componentCategory?: string
  manufacturerName?: string
  manufacture?: string
  batchNumber?: string
}

type CompareItem = {
  reportId: number
  fileName: string
  url: string
  loading: boolean
}

const searchMode = ref<'reportNo' | 'keywords' | 'advanced'>('reportNo')

const categories = ref<CategoryRow[]>([])
const loadingCategories = ref(false)

const query = reactive<{
  reportNo: string
  categoryId: number | null
  modelSpec: string
  componentCategory: string
  manufacturerName: string
  batchNumber: string
  keywords: string[]
}>({
  reportNo: '',
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

const previewVisible = ref(false)
const previewUrl = ref('')
let previewUrlToRevoke: string | null = null
const previewLoadingId = ref<number | null>(null)

const openLoadingId = ref<number | null>(null)
const downloadLoadingId = ref<number | null>(null)

const compareVisible = ref(false)
const compareItems = ref<CompareItem[]>([])
const compareUrlsToRevoke = ref<string[]>([])

const selectedCompareKeyword = ref('')
const compareKeywordLoading = ref(false)
const comparePdfVisible = ref(false)
const comparePdfUrl = ref('')
let comparePdfUrlToRevoke: string | null = null

const statusDialogVisible = ref(false)
const statusUpdating = ref(false)
const statusForm = reactive<{
  reportId: number | null
  currentStatus: ReportStatusCode | null
  newStatus: ReportStatusCode | null
}>({
  reportId: null,
  currentStatus: null,
  newStatus: null,
})

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

function normalizeRow(raw: any): ReportRow {
  return {
    reportId: Number(raw?.reportId ?? raw?.id ?? raw?.reportID ?? raw?.report_id),
    fileName: String(raw?.fileName ?? raw?.filename ?? raw?.name ?? ''),
    category: raw?.category ?? raw?.categoryId ?? '',
    reportNo: raw?.reportNo ?? '',
    modelSpec: raw?.modelSpec ?? '',
    deviceCategory: raw?.deviceCategory ?? raw?.componentCategory ?? '',
    vendor: raw?.vendor ?? raw?.manufacturerName ?? raw?.manufacture ?? '',
    batchNo: raw?.batchNo ?? raw?.batchNumber ?? '',
    prodDate: raw?.prodDate,
    address: raw?.address,
    status: raw?.status,
    createdAt: raw?.createdAt ?? raw?.uploadTime,

    componentCategory: raw?.componentCategory,
    manufacturerName: raw?.manufacturerName,
    manufacture: raw?.manufacture,
    batchNumber: raw?.batchNumber,
  }
}

function parseDownloadFileName(disposition: string): string {
  let fileName = 'download'

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) {
    try {
      fileName = decodeURIComponent(utf8Match[1])
    } catch {
      fileName = utf8Match[1]
    }
  } else {
    const normalMatch = disposition.match(/filename="?([^";]+)"?/i)
    if (normalMatch) {
      fileName = normalMatch[1]
    }
  }

  return fileName
}

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

async function loadDependents(categoryId: number) {
  query.modelSpec = ''
  query.componentCategory = ''
  query.manufacturerName = ''
  query.batchNumber = ''

  options.modelSpecs = []
  options.componentCategories = []
  options.manufacturers = []
  options.batchNumbers = []

  loadingOptions.modelSpecs = true
  loadingOptions.componentCategories = true
  loadingOptions.manufacturers = true
  loadingOptions.batchNumbers = true

  try {
    const [ms, cc, mf, bn] = await Promise.all([
      apiQueryModelSpecs(categoryId),
      apiQueryComponentCategories(categoryId),
      apiQueryManufacturers(categoryId),
      apiQueryBatchNumbers(categoryId),
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

async function getDownloadResource(reportId: number | string) {
  const res = await apiReportFileBlob(reportId)
  const disposition =
    res.headers.get('content-disposition') ||
    res.headers.get('Content-Disposition') ||
    ''

  const fileName = parseDownloadFileName(disposition)
  const blob = new Blob([res.blob])

  return { blob, fileName }
}

async function getPreviewUrlByReportId(reportId: number | string, keywords?: string[]) {
  const res = await apiReportPreviewBlob(reportId, keywords)
  const pdfBlob = new Blob([res.blob], { type: 'application/pdf' })
  return URL.createObjectURL(pdfBlob)
}

function cleanupPreview() {
  if (previewUrlToRevoke) {
    URL.revokeObjectURL(previewUrlToRevoke)
    previewUrlToRevoke = null
  }
  previewUrl.value = ''
}

function cleanupCompare() {
  for (const u of compareUrlsToRevoke.value) {
    URL.revokeObjectURL(u)
  }
  compareUrlsToRevoke.value = []
  compareItems.value = []
  selectedCompareKeyword.value = ''
}

function cleanupComparePdf() {
  if (comparePdfUrlToRevoke) {
    URL.revokeObjectURL(comparePdfUrlToRevoke)
    comparePdfUrlToRevoke = null
  }
  comparePdfUrl.value = ''
}

function buildPreviewWindowUrl(reportId: number | string, keywords?: string[]) {
  const params = new URLSearchParams()
  for (const kw of keywords || []) {
    const s = (kw ?? '').toString().trim()
    if (s) params.append('keyword', s)
  }

  const qs = params.toString()
  return qs ? `/report-preview/${reportId}?${qs}` : `/report-preview/${reportId}`
}

const keywordOptionsForCompare = ref<string[]>([])

onMounted(loadCategories)

watch(searchMode, () => {
  page.pageNo = 1
  result.value = []
  total.value = 0
  selectedRows.value = []
  cleanupPreview()
  cleanupCompare()
  cleanupComparePdf()

  if (searchMode.value !== 'advanced') {
    query.categoryId = null
    query.modelSpec = ''
    query.componentCategory = ''
    query.manufacturerName = ''
    query.batchNumber = ''

    options.modelSpecs = []
    options.componentCategories = []
    options.manufacturers = []
    options.batchNumbers = []
  }

  if (searchMode.value === 'reportNo') {
    query.keywords = []
  }

  if (searchMode.value !== 'reportNo') {
    query.reportNo = ''
  }
})

watch(
  () => query.keywords,
  () => {
    keywordOptionsForCompare.value = [...query.keywords]
    if (!keywordOptionsForCompare.value.includes(selectedCompareKeyword.value)) {
      selectedCompareKeyword.value = ''
    }
  },
  { deep: true },
)

const onCategoryChange = async () => {
  if (!query.categoryId) {
    query.modelSpec = ''
    query.componentCategory = ''
    query.manufacturerName = ''
    query.batchNumber = ''

    options.modelSpecs = []
    options.componentCategories = []
    options.manufacturers = []
    options.batchNumbers = []
    return
  }

  await loadDependents(query.categoryId)
}

const onKeywordsVisibleChange = async (visible: boolean) => {
  if (!visible) return
  if (keywordOptions.value.length > 0) return

  loadingKeywords.value = true
  try {
    const data = await apiQueryAllKeywords()
    keywordOptions.value = data || []
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载关键词失败')
  } finally {
    loadingKeywords.value = false
  }
}

const doSearch = async (resetToFirstPage = false) => {
  if (resetToFirstPage) page.pageNo = 1

  loadingSearch.value = true
  try {
    let data: SearchReportsResponseData

    if (searchMode.value === 'reportNo') {
      const reportNo = query.reportNo.trim()
      if (!reportNo) {
        ElMessage.warning('请输入报告编号')
        return
      }

      data = await apiSearchReportsByReportNo({
        reportNo,
        page: page.pageNo,
        pageSize: page.pageSize,
      })
    } else if (searchMode.value === 'keywords') {
      if (!query.keywords.length) {
        ElMessage.warning('请至少选择一个关键词')
        return
      }

      data = await apiSearchReportsByKeywords({
        keywords: query.keywords,
        page: page.pageNo,
        pageSize: page.pageSize,
      })
    } else {
      const hasCategory = query.categoryId != null
      const hasKeywords = query.keywords.length > 0

      if (!hasCategory && !hasKeywords) {
        ElMessage.warning('请至少选择一个关键词或一个报告类别')
        return
      }

      data = await apiSearchReports({
        filters: {
          category: query.categoryId ?? undefined,
          modelSpec: query.modelSpec || undefined,
          deviceCategory: query.componentCategory || undefined,
          vendor: query.manufacturerName || undefined,
          batchNo: query.batchNumber || undefined,
          keywords: query.keywords,
        },
        page: { ...page },
      })
    }

    result.value = (data.list || []).map(normalizeRow)
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
  query.reportNo = ''
  query.categoryId = null
  query.modelSpec = ''
  query.componentCategory = ''
  query.manufacturerName = ''
  query.batchNumber = ''
  query.keywords = []
  keywordOptions.value = []
  keywordOptionsForCompare.value = []
  selectedCompareKeyword.value = ''

  options.modelSpecs = []
  options.componentCategories = []
  options.manufacturers = []
  options.batchNumbers = []

  result.value = []
  total.value = 0
  page.pageNo = 1
  selectedRows.value = []

  cleanupPreview()
  cleanupCompare()
  cleanupComparePdf()
}

const onSelectionChange = (rows: ReportRow[]) => {
  selectedRows.value = rows
}

const previewReport = async (row: ReportRow) => {
  cleanupPreview()
  previewLoadingId.value = row.reportId
  try {
    const url = await getPreviewUrlByReportId(row.reportId, query.keywords)
    previewUrl.value = url
    previewUrlToRevoke = url
    previewVisible.value = true
  } catch (e: unknown) {
    ElMessage.error(
      e instanceof Error ? e.message : '预览失败（当前文件暂不可预览，请尝试下载原文件）',
    )
  } finally {
    previewLoadingId.value = null
  }
}

const openReport = async (row: ReportRow) => {
  openLoadingId.value = row.reportId
  try {
    const url = buildPreviewWindowUrl(row.reportId, query.keywords)
    window.open(url, '_blank')
  } catch (e: unknown) {
    ElMessage.error(
      e instanceof Error ? e.message : '打开失败（当前文件暂不可预览，请尝试下载原文件）',
    )
  } finally {
    openLoadingId.value = null
  }
}

const downloadReport = async (row: ReportRow) => {
  downloadLoadingId.value = row.reportId
  try {
    const { blob, fileName } = await getDownloadResource(row.reportId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '下载失败')
  } finally {
    downloadLoadingId.value = null
  }
}

const openStatusDialog = (row: ReportRow) => {
  statusForm.reportId = row.reportId
  const current = typeof row.status === 'number' ? row.status : Number(row.status)

  if (current === 1001 || current === 1002 || current === 1003) {
    statusForm.currentStatus = current as ReportStatusCode
    statusForm.newStatus = current as ReportStatusCode
  } else {
    statusForm.currentStatus = null
    statusForm.newStatus = null
  }

  statusDialogVisible.value = true
}

const submitStatusUpdate = async () => {
  if (!statusForm.reportId) return ElMessage.warning('缺少报告ID')
  if (!statusForm.newStatus) return ElMessage.warning('请选择新的状态')

  statusUpdating.value = true
  try {
    await apiUpdateReportStatus({ id: statusForm.reportId, status: statusForm.newStatus })
    ElMessage.success('状态更新成功')

    const target = result.value.find((r) => r.reportId === statusForm.reportId)
    if (target) {
      target.status = statusForm.newStatus
    }

    statusDialogVisible.value = false
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '更新状态失败')
  } finally {
    statusUpdating.value = false
  }
}

const openCompare = async () => {
  if (selectedRows.value.length < 2 || selectedRows.value.length > 3) {
    return ElMessage.warning('请选择 2 或 3 份报告进行对比')
  }

  cleanupCompare()
  compareVisible.value = true

  compareItems.value = selectedRows.value.slice(0, 3).map((r) => ({
    reportId: r.reportId,
    fileName: r.fileName,
    url: '',
    loading: true,
  }))

  keywordOptionsForCompare.value = [...query.keywords]
  if (!selectedCompareKeyword.value && keywordOptionsForCompare.value.length > 0) {
    selectedCompareKeyword.value = keywordOptionsForCompare.value[0]
  }

  await Promise.all(
    compareItems.value.map(async (it) => {
      try {
        const url = await getPreviewUrlByReportId(it.reportId, query.keywords)
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

const compareByKeyword = async () => {
  const keyword = selectedCompareKeyword.value.trim()
  if (!keyword) return ElMessage.warning('请选择一个关键词')
  if (selectedRows.value.length < 2 || selectedRows.value.length > 3) {
    return ElMessage.warning('请选择 2 或 3 份报告进行对比')
  }

  compareKeywordLoading.value = true
  try {
    const reportIds = selectedRows.value.slice(0, 3).map((r) => r.reportId)

    const res = await apiCompareReportsByKeyword({
      reportIds,
      keyword,
    })

    const pdfBlob = new Blob([res.blob], { type: 'application/pdf' })
    const url = URL.createObjectURL(pdfBlob)

    if (comparePdfUrlToRevoke) {
      URL.revokeObjectURL(comparePdfUrlToRevoke)
    }
    comparePdfUrlToRevoke = url
    comparePdfUrl.value = url
    comparePdfVisible.value = true
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '关键词比对失败')
  } finally {
    compareKeywordLoading.value = false
  }
}
</script>

<style scoped>
.compare {
  display: grid;
  gap: 12px;
  flex: 1;
  min-width: 0;
  height: 84vh;
}

.compare__col {
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  background: #fff;
  overflow: hidden;
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

.keyword-panel {
  width: 320px;
  border: 1px solid #ebeef5;
  background: #fff;
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.keyword-panel__title {
  font-weight: 600;
  margin-bottom: 8px;
}

.keyword-tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 55vh;
  overflow: auto;
  padding-right: 4px;
}

.keyword-tag {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.keyword-tag:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}
</style>
