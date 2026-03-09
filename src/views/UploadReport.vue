<template>
  <el-card>
    <template #header>
      <div style="font-weight:700">元器件报告上传</div>
    </template>

    <el-form label-width="110px" style="max-width: 720px">
      <!-- 报告类别 -->
      <el-form-item label="报告类别" required>
        <el-select v-model="form.category" placeholder="请选择类别" style="width: 260px">
          <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="型号规格" required>
        <el-input v-model="form.modelSpec" placeholder="请输入型号规格" />
      </el-form-item>

      <el-form-item label="元器件门类" required>
        <el-input v-model="form.deviceCategory" placeholder="请输入元器件门类" />
      </el-form-item>

      <el-form-item label="厂家信息">
        <el-input v-model="form.vendor" placeholder="请输入厂家信息" />
      </el-form-item>

      <el-form-item label="批号">
        <el-input v-model="form.batchNo" placeholder="请输入批号" />
      </el-form-item>

      <el-form-item label="上传文件" required>
        <input type="file" accept=".pdf,.doc,.docx" @change="onFileChange" />
        <div style="color:#999; font-size:12px; margin-top:6px">
          支持格式：PDF / Word（.doc/.docx）
        </div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="uploading" @click="onUpload">上传</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiUploadReport } from '../api/reports'

/**
 * 类别：后端字典 1-6
 * 1 DPA
 * 2 测试报告
 * 3 FA 报告
 * 4 CA 报告
 * 5 二次测试报告
 * 6 定制报告
 */
const categories = [
  { label: 'DPA 报告', value: 1 },
  { label: '测试报告', value: 2 },
  { label: 'FA 报告', value: 3 },
  { label: 'CA 报告', value: 4 },
  { label: '二次测试报告', value: 5 },
  { label: '定制报告', value: 6 },
] as const

type CategoryValue = (typeof categories)[number]['value']

const uploading = ref(false)
const fileRef = ref<File | null>(null)

const form = reactive<{
  category: CategoryValue | null
  modelSpec: string
  deviceCategory: string
  batchNo: string
  vendor: string
}>({
  category: null,
  modelSpec: '',
  deviceCategory: '',
  vendor: '',
  batchNo: '',
})

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  fileRef.value = input.files?.[0] || null
}

const onUpload = async () => {
  if (!form.category) return ElMessage.warning('请选择报告类别')
  if (!form.modelSpec.trim()) return ElMessage.warning('请输入型号规格')
  if (!form.deviceCategory.trim()) return ElMessage.warning('请输入元器件门类')
  if (!fileRef.value) return ElMessage.warning('请选择要上传的文件')

  uploading.value = true
  try {
    await apiUploadReport({
      file: fileRef.value,
      // 你要求“不改原 API”，这里用 any 兜住类型差异；
      // 后端补齐并接受 number category 后可去掉 any。
      category: form.category as any,
      vendor: form.vendor.trim(),
      modelSpec: form.modelSpec.trim(),
      deviceCategory: form.deviceCategory.trim(),
      batchNo: form.batchNo.trim(),
    } as any)

    ElMessage.success('上传成功')

    form.modelSpec = ''
    form.deviceCategory = ''
    form.vendor = ''
    form.batchNo = ''
    fileRef.value = null
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '上传失败'
    ElMessage.error(msg)
  } finally {
    uploading.value = false
  }
}
</script>
