<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">检索报告</div>
    </template>

    <!-- ✅ 取消三步：所有条件放在一个表单里；关键词在最上面 -->
    <el-form label-width="110px" style="max-width: 980px">
      <!-- 关键词（放在检索条件上面） -->
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

      <!-- 类别 -->
      <el-form-item label="报告类别" required>
        <el-select v-model="query.category" placeholder="请选择类别" style="width: 260px" @change="onCategoryChange">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <!-- ✅ 新检索条件：型号规格、元器件门类、厂家信息、批号 -->
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

      <!-- 操作按钮 -->
      <el-form-item>
        <el-button type="primary" :loading="loadingSearch" @click="doSearch(true)">检索</el-button>
        <el-button :disabled="loadingSearch" @click="resetForm">重置</el-button>

        <!-- ✅ 对比按钮：必须选 2~3 条 -->
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

    <!-- ✅ 结果表格：增加多选列用于对比 -->
    <el-table
      :data="result"
      style="width: 100%"
      v-loading="loadingSearch"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="48" />

      <el-table-column prop="fileName" label="报告名称" min-width="240" />
      <el-table-column prop="category" label="类别" width="120" />
      <el-table-column prop="modelSpec" label="型号规格" min-width="160" />
      <el-table-column prop="deviceCategory" label="元器件门类" min-width="150" />
      <el-table-column prop="vendor" label="厂家信息" min-width="160" />
      <el-table-column prop="batchNo" label="批号" min-width="140" />

      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button type="primary" link @click="previewReport(row)">预览</el-button>
          <el-button type="primary" link @click="openReport(row)">打开</el-button>
          <el-button type="primary" link @click="downloadReport(row)">下载</el-button>
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

    <!-- 单份预览对话框（保留） -->
    <el-dialog v-model="previewVisible" title="报告预览" width="80%" top="5vh" :destroy-on-close="true">
      <div style="height: 75vh">
        <iframe v-if="previewUrl" :src="previewUrl" style="width: 100%; height: 100%; border: 0" />
        <div v-else style="color:#999">暂无可预览内容</div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="openPreviewInNewTab">新窗口打开</el-button>
      </template>
    </el-dialog>

    <!-- ✅ 新增：对比预览弹窗（2-3 份并排） -->
    <el-dialog v-model="compareVisible" title="报告对比预览" width="92%" top="4vh" :destroy-on-close="true">
      <div class="compare" :style="{ gridTemplateColumns: `repeat(${compareRows.length || 1}, 1fr)` }">
        <div v-for="r in compareRows" :key="r.reportId" class="compare__col">
          <div class="compare__title" :title="r.fileName">{{ r.fileName }}</div>
          <iframe :src="reportFileUrl(r)" class="compare__iframe" />
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
import { apiSearchReports, type ReportListItem, type SearchReportsResponseData } from '../api/reports'

const categories = ['DPA', '单项检测', '失效分析', '结构分析', '电性能测试', '其他检测'] as const

// ✅ 取消步骤
// const activeStep = ref(0)

const query = reactive<{
  category: string
  modelSpec: string
  deviceCategory: string
  vendor: string
  batchNo: string
  keywords: string[]
}>({
  category: '',
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

// 单份预览
const previewVisible = ref(false)
const previewUrl = ref('')

// ✅ 新增：对比相关状态
const selectedRows = ref<ReportListItem[]>([])
const compareVisible = ref(false)
const compareRows = ref<ReportListItem[]>([])

const onCategoryChange = () => {
  // ✅ 类别改变：清空已选关键词与候选，避免跨类别混用
  query.keywords = []
  keywordOptions.value = []
}

const onKeywordsVisibleChange = async (visible: boolean) => {
  // ✅ 下拉展开时再加载关键词，减少无意义请求
  if (!visible) return
  if (!query.category) return ElMessage.warning('请先选择类别')

  // 已加载过就不重复加载
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
        category: query.category,
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
  query.category = ''
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

const reportFileUrl = (row: ReportListItem) => {
  // 加 t 避免 iframe 缓存导致切换不同报告不刷新
  return `/api/v1/reports/file?reportId=${encodeURIComponent(row.reportId)}&t=${Date.now()}`
}

const previewReport = (row: ReportListItem) => {
  previewUrl.value = reportFileUrl(row)
  previewVisible.value = true
}

const openPreviewInNewTab = () => {
  if (!previewUrl.value) return
  window.open(previewUrl.value, '_blank')
}

const openReport = (row: ReportListItem) => {
  window.open(`/api/v1/reports/file?reportId=${encodeURIComponent(row.reportId)}`, '_blank')
}

const downloadReport = (row: ReportListItem) => {
  const a = document.createElement('a')
  // ✅ 优先用 attachment（若后端不支持 disposition 参数，也不会影响下载）
  a.href = `/api/v1/reports/file?reportId=${encodeURIComponent(row.reportId)}&disposition=attachment`
  a.download = row.fileName || 'report'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ✅ 对比：选择 2~3 条
const onSelectionChange = (rows: ReportListItem[]) => {
  selectedRows.value = rows
}

const openCompare = () => {
  if (selectedRows.value.length < 2 || selectedRows.value.length > 3) {
    return ElMessage.warning('请选择 2 或 3 份报告进行对比')
  }
  compareRows.value = selectedRows.value.slice(0, 3)
  compareVisible.value = true
}
</script>

<style scoped>
/* ✅ 对比弹窗：网格并排 iframe */
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
