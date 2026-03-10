<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">检索报告</div>
    </template>

    <el-form label-width="110px" style="max-width: 980px">
      <el-form-item label="关键词">
        <el-select
          v-model="query.keywords"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="请选择关键词（可多选）"
          style="width: 520px"
          :disabled="!query.category"
          :loading="loadingKeywords"
          @visible-change="onKeywordsVisibleChange"
        >
          <el-option v-for="k in keywordOptions" :key="k" :label="k" :value="k" />
        </el-select>
        <div style="color:#999; font-size:12px; margin-left: 12px">
          先选择类别，再展开关键词下拉框加载候选项
        </div>
      </el-form-item>

      <el-form-item label="报告类别" required>
        <el-select v-model="query.category" placeholder="请选择类别" style="width: 260px" @change="onCategoryChange">
          <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="型号规格">
        <el-input v-model="query.modelSpec" placeholder="请输入型号规格" clearable />
      </el-form-item>

      <el-form-item label="元器件门类">
        <el-input v-model="query.deviceCategory" placeholder="请输入元器件门类" clearable />
      </el-form-item>

      <el-form-item label="厂家信息">
        <el-input v-model="query.vendor" placeholder="请输入厂家信息" clearable />
      </el-form-item>

      <el-form-item label="批号">
        <el-input v-model="query.batchNo" placeholder="请输入批号" clearable />
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

      <el-table-column label="类别" width="140">
        <template #default="{ row }">
          {{ categoryLabel(row.category) }}
        </template>
      </el-table-column>

      <el-table-column prop="modelSpec" label="型号规格" min-width="160" />
      <el-table-column prop="deviceCategory" label="元器件门类" min-width="150" />
      <el-table-column prop="vendor" label="厂家信息" min-width="160" />
      <el-table-column prop="batchNo" label="批号" min-width="140" />

      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          {{ statusLabel(row.status) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button type="primary" link :loading="previewLoadingId === row.reportId" @click="previewReport(row)">
            预览
          </el-button>
          <el-button type="primary" link :loading="openLoadingId === row.reportId" @click="openReport(row)">
            打开
          </el-button>
          <el-button type="primary" link :loading="downloadLoadingId === row.reportId" @click="downloadReport(row)">
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

    <!-- 单份预览对话框 -->
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

    <!-- 对比预览弹窗（2-3 份并排） -->
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
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiQueryKeywords } from '../api/keywords'
import { apiSearchReports, apiReportFileBlob, type ReportListItem, type SearchReportsResponseData } from '../api/reports'

const categories = [
  { label: 'DPA 报告', value: 1 },
  { label: '测试报告', value: 2 },
  { label: 'FA 报告', value: 3 },
  { label: 'CA 报告', value: 4 },
  { label: '二次测试报告', value: 5 },
  { label: '定制报告', value: 6 },
] as const

type CategoryValue = (typeof categories)[number]['value']

const categoryLabel = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v)
  const hit = categories.find((x) => x.value === n)
  return hit?.label ?? (v == null ? '' : String(v))
}

const statusLabel = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (n === 1001) return '待处理'
  if (n === 1002) return '已通过'
  if (n === 1003) return '已拒绝'
  return v == null ? '' : String(v)
}

const query = reactive<{
  category: CategoryValue | null
  modelSpec: string
  deviceCategory: string
  vendor: string
  batchNo: string
  keywords: string[]
}>({
  category: null,
  modelSpec: '',
  deviceCategory: '',
  vendor: '',
  batchNo: '',
  keywords: [],
})

const page = reactive({ pageNo: 1, pageSize: 15 })
const total = ref(0)

const keywordOptions = ref<string[]>([])
const result = ref<ReportListItem[]>([])

const loadingKeywords = ref(false)
const loadingSearch = ref(false)

const selectedRows = ref<ReportListItem[]>([])

const previewVisible = ref(false)
const previewUrl = ref('')
const previewLoadingId = ref<number | null>(null)
let previewUrlToRevoke: string | null = null

const openLoadingId = ref<number | null>(null)
const downloadLoadingId = ref<number | null>(null)

const compareVisible = ref(false)
const compareItems = ref<Array<{ reportId: number; fileName: string; url: string; loading: boolean }>>([])
const compareUrlsToRevoke = ref<string[]>([])

const onCategoryChange = () => {
  query.keywords = []
  keywordOptions.value = []
}

const onKeywordsVisibleChange = async (visible: boolean) => {
  if (!visible) return
  if (!query.category) return ElMessage.warning('请先选择类别')
  if (keywordOptions.value.length > 0) return

  loadingKeywords.value = true
  try {
    const data = await apiQueryKeywords(query.category)
    keywordOptions.value = data.keywords || []
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载关键词失败'
    ElMessage.error(msg)
  } finally {
    loadingKeywords.value = false
  }
}

const doSearch = async (resetToFirstPage = false) => {
  if (!query.category) return ElMessage.warning('请选择类别')
  if (resetToFirstPage) page.pageNo = 1

  loadingSearch.value = true
  try {
    const data: SearchReportsResponseData = await apiSearchReports({
      filters: {
        category: query.category as any,
        modelSpec: query.modelSpec.trim(),
        deviceCategory: query.deviceCategory.trim(),
        vendor: query.vendor.trim(),
        batchNo: query.batchNo.trim(),
        keywords: query.keywords,
      },
      page: { ...page },
    })

    result.value = data.list || []
    total.value = data.total || 0
    ElMessage.success('检索完成')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '检索失败'
    ElMessage.error(msg)
  } finally {
    loadingSearch.value = false
  }
}

const onPageChange = async (p: number) => {
  page.pageNo = p
  await doSearch(false)
}

const resetForm = () => {
  query.category = null
  query.modelSpec = ''
  query.deviceCategory = ''
  query.vendor = ''
  query.batchNo = ''
  query.keywords = []
  keywordOptions.value = []
  result.value = []
  total.value = 0
  page.pageNo = 1
  selectedRows.value = []
}

const onSelectionChange = (rows: ReportListItem[]) => {
  selectedRows.value = rows
}

// ===== Blob 预览/下载（带 token header）=====
function cleanupPreviewUrl() {
  if (previewUrlToRevoke) {
    URL.revokeObjectURL(previewUrlToRevoke)
    previewUrlToRevoke = null
  }
  previewUrl.value = ''
}

async function getBlobUrlById(id: number) {
  const blob = await apiReportFileBlob(id)
  const url = URL.createObjectURL(blob)
  return url
}

const previewReport = async (row: ReportListItem) => {
  cleanupPreviewUrl()
  previewLoadingId.value = row.reportId
  try {
    const url = await getBlobUrlById(row.reportId)
    previewUrl.value = url
    previewUrlToRevoke = url
    previewVisible.value = true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '预览失败'
    ElMessage.error(msg)
  } finally {
    previewLoadingId.value = null
  }
}

const openPreviewInNewTab = () => {
  if (!previewUrl.value) return
  window.open(previewUrl.value, '_blank')
}

const openReport = async (row: ReportListItem) => {
  // “打开”也走 blob（避免新窗口请求不带 token header）
  openLoadingId.value = row.reportId
  try {
    const url = await getBlobUrlById(row.reportId)
    // 新开窗口后仍需 revoke；这里做一个延迟回收，避免瞬间回收导致新窗加载失败
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '打开失败'
    ElMessage.error(msg)
  } finally {
    openLoadingId.value = null
  }
}

const downloadReport = async (row: ReportListItem) => {
  downloadLoadingId.value = row.reportId
  try {
    const url = await getBlobUrlById(row.reportId)
    const a = document.createElement('a')
    a.href = url
    a.download = row.fileName || 'report'
    document.body.appendChild(a)
    a.click()
    a.remove()
    // 下载触发后即可回收
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '下载失败'
    ElMessage.error(msg)
  } finally {
    downloadLoadingId.value = null
  }
}

// ===== 对比（2-3份 blob 并排）=====
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

  // 先填充占位（loading=true）
  compareItems.value = selectedRows.value.slice(0, 3).map((r) => ({
    reportId: r.reportId,
    fileName: r.fileName,
    url: '',
    loading: true,
  }))

  // 并行拉取
  await Promise.all(
    compareItems.value.map(async (it) => {
      try {
        const url = await getBlobUrlById(it.reportId)
        it.url = url
        it.loading = false
        compareUrlsToRevoke.value.push(url)
      } catch (e) {
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
