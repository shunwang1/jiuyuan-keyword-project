// 报告管理相关API接口

import { request } from './http'
import { USE_MOCK_API } from '../config/dev'
import { mockReportsSearch } from './mock'

export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface UploadReportParams {
  file: File
  category: string
  // ✅ 改动：新增字段（对应上传页面）
  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string
  // ❌ 删除：prodDate/address（上传页面已移除）
  // prodDate?: string
  // address?: string
}

export interface UploadReportResponseData {
  reportId: number
  status: ReportStatus
  extractedKeywords: string[]
}

export interface ApproveReportParams {
  reportId: number | string
  approved: boolean
  comment?: string
}

export interface ReportListItem {
  reportId: number
  fileName: string
  category: string

  // ✅ 改动：报告元信息（可选，后端返回就展示/用于检索）
  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string

  // 兼容旧字段（如果后端仍保留，也不影响）
  prodDate?: string
  address?: string

  status: ReportStatus
  createdAt?: string
}

export interface ReportSearchFilters {
  category: string

  // ✅ 新增：与上传页面一致的检索字段（是否启用由后端决定）
  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string

  // 兼容旧字段
  prodDate?: string
  address?: string

  keywords?: string[]
}

export interface PageParams {
  pageNo: number
  pageSize: number
}

export interface SearchReportsParams {
  filters: ReportSearchFilters
  page: PageParams
}

export interface SearchReportsResponseData {
  list: ReportListItem[]
  total: number
}

export interface ReportDetailResponseData {
  report: {
    reportId: number
    fileName: string
    category: string

    // ✅ 新增：详情可返回这些字段
    modelSpec?: string
    deviceCategory?: string
    vendor?: string
    batchNo?: string

    // 兼容旧字段
    prodDate?: string
    address?: string

    status: ReportStatus
    keywords?: string[]
    createdAt?: string
  }
}

/**
 * 上传报告
 */
export function apiUploadReport({
  file,
  category,
  modelSpec,
  deviceCategory,
  vendor,
  batchNo,
}: UploadReportParams) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)

  // ✅ 改动：追加新字段
  if (modelSpec) fd.append('modelSpec', modelSpec)
  if (deviceCategory) fd.append('deviceCategory', deviceCategory)
  if (vendor) fd.append('vendor', vendor)
  if (batchNo) fd.append('batchNo', batchNo)

  // ❌ 删除：prodDate/address（上传页面已移除）
  // if (prodDate) fd.append('prodDate', prodDate)
  // if (address) fd.append('address', address)

  return request<UploadReportResponseData>('/reports/upload', {
    method: 'POST',
    body: fd,
  })
}

/**
 * 审批报告
 */
export function apiApproveReport({ reportId, approved, comment }: ApproveReportParams) {
  return request<null>('/reports/approve', {
    method: 'POST',
    body: { reportId, approved, comment: comment || '' },
  })
}

/**
 * 搜索报告
 */
export async function apiSearchReports({ filters, page }: SearchReportsParams) {
  if (USE_MOCK_API) {
    return mockReportsSearch({ filters, page }) as SearchReportsResponseData
  }
  return request<SearchReportsResponseData>('/reports/search', {
    method: 'POST',
    body: { filters, page },
  })
}

/**
 * 获取报告详情
 */
export function apiReportDetail(reportId: number | string) {
  return request<ReportDetailResponseData>(`/reports/detail?reportId=${encodeURIComponent(reportId)}`, {
    method: 'GET',
  })
}

/**
 * 下载报告文件（返回blob）
 */
export function apiReportFileBlob(reportId: number | string) {
  return request<Blob>(`/reports/file?reportId=${encodeURIComponent(reportId)}`, {
    method: 'GET',
    responseType: 'blob',
  })
}
