<template>
  <el-card>
    <template #header>
      <!-- ✅ 改动1：页面名 -->
      <div style="font-weight:700">元器件报告上传</div>
    </template>

    <el-form label-width="110px" style="max-width: 720px">
      <!-- 报告类别（保留原逻辑） -->
      <el-form-item label="报告类别" required>
        <el-select v-model="form.category" placeholder="请选择类别" style="width: 260px">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <!-- ✅ 改动2：字段调整 + 顺序调整
           顺序：型号规格 → 元器件门类 → 厂家信息 → 批号
      -->
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

      <!-- 文件上传（保留原逻辑） -->
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

const categories = ['DPA', '单项检测', '失效分析', '结构分析', '电性能测试', '其他检测'] as const

const uploading = ref(false)
const fileRef = ref<File | null>(null)

const form = reactive<{
  category: string
  // ✅ 新增字段
  modelSpec: string
  deviceCategory: string
  batchNo: string
  // 保留字段（厂家信息）
  vendor: string
}>({
  category: '',
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
    // ✅ 提交新增字段（后端需同步支持；若暂未支持，可先忽略这些字段）
    await apiUploadReport({
      file: fileRef.value,
      category: form.category,
      vendor: form.vendor.trim(),
      modelSpec: form.modelSpec.trim(),
      deviceCategory: form.deviceCategory.trim(),
      batchNo: form.batchNo.trim(),
    })

    ElMessage.success('上传成功')

    // 简单清理表单（可按需保留 category）
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
