<template>
  <div class="page">
    <div class="toolbar">
      <div class="title">报告预览</div>
      <div class="actions">
        <el-button size="small" @click="reload">刷新</el-button>
      </div>
    </div>

    <div class="content" v-loading="loading">
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        style="width: 100%; height: 100%; border: 0"
      />
      <el-empty v-else description="暂无可预览内容" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { apiReportPreviewBlob } from '../api/reports'

  const route = useRoute()

  const loading = ref(false)
  const previewUrl = ref('')
  let previewUrlToRevoke: string | null = null

  function getReportId(): number | null {
    const id = Number(route.params.id)
    return Number.isFinite(id) ? id : null
  }

  function getKeywordsFromQuery(): string[] {
    const q = route.query.keyword
    if (Array.isArray(q)) {
      return q.map((x) => String(x).trim()).filter(Boolean)
    }
    if (typeof q === 'string' && q.trim()) {
      return [q.trim()]
    }
    return []
  }

  function cleanup() {
    if (previewUrlToRevoke) {
      URL.revokeObjectURL(previewUrlToRevoke)
      previewUrlToRevoke = null
    }
    previewUrl.value = ''
  }

  const loadData = async () => {
    const reportId = getReportId()
    if (!reportId) {
      ElMessage.error('报告ID无效')
      return
    }

    loading.value = true
    try {
      cleanup()
      const keywords = getKeywordsFromQuery()
      const res = await apiReportPreviewBlob(reportId, keywords)
      const pdfBlob = new Blob([res.blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      previewUrl.value = url
      previewUrlToRevoke = url
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
  onBeforeUnmount(cleanup)
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
    height: calc(100vh - 58px);
    padding: 0;
  }
</style>
