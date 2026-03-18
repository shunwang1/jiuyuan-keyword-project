<template>
  <div class="page">
    <div class="toolbar">
      <div class="title">报告高亮预览</div>
      <div class="actions">
        <el-button size="small" @click="reload">刷新</el-button>
      </div>
    </div>

    <div class="content" v-loading="loading">
      <PdfKeywordViewer
        v-if="pdfBlob"
        :blob="pdfBlob"
        :keywords="keywords"
      />
      <el-empty v-else description="暂无可预览内容" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PdfKeywordViewer from '../components/PdfKeywordViewer.vue'
import { apiReportPreviewBlob, apiReportKeywords } from '../api/reports'

const route = useRoute()

const loading = ref(false)
const pdfBlob = ref<Blob | null>(null)
const keywords = ref<string[]>([])

function getReportId(): number | null {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
}

const loadData = async () => {
  const reportId = getReportId()
  if (!reportId) {
    ElMessage.error('报告ID无效')
    return
  }

  loading.value = true
  try {
    const [pdfRes, kws] = await Promise.all([
      apiReportPreviewBlob(reportId),
      apiReportKeywords(reportId),
    ])

    pdfBlob.value = new Blob([pdfRes.blob], { type: 'application/pdf' })
    keywords.value = kws || []
  } catch (e: unknown) {
    ElMessage.error(
      e instanceof Error ? e.message : '当前文件暂不可预览，请返回上一页后尝试下载原文件',
    )
  } finally {
    loading.value = false
  }
}

const reload = async () => {
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-weight: 700;
  font-size: 16px;
}

.content {
  padding: 16px;
}
</style>
