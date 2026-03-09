// 报告管理相关API接口

import { request } from './http'
import { USE_MOCK_API } from '../config/dev'
import { mockReportsSearch } from './mock'

// 后端字典：1001/1002/1003；兼容旧实现字符串状态
export type ReportStatusCode = 1001 | 1002 | 1003
export type ReportStatusText = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ReportStatus = ReportStatusCode | ReportStatusText

// 后端字典：category 1-6；兼容旧实现 string 类别
export type ReportCategory = number | string

export interface UploadReportParams {
  file: File
  category: ReportCategory

  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string
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
  category: ReportCategory

  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string

  prodDate?: string
  address?: string

  status: ReportStatus
  createdAt?: string
}

export interface ReportSearchFilters {
  category: ReportCategory

  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string

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
    category: ReportCategory

    modelSpec?: string
    deviceCategory?: string
    vendor?: string
    batchNo?: string

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
  // FormData 必须 string/blob
  fd.append('category', String(category))

  if (modelSpec) fd.append('modelSpec', modelSpec)
  if (deviceCategory) fd.append('deviceCategory', deviceCategory)
  if (vendor) fd.append('vendor', vendor)
  if (batchNo) fd.append('batchNo', batchNo)

  return request<UploadReportResponseData>('/reports/upload', {
    method: 'POST',
    body: fd,
  })
}

/**
 * 审批报告（若后端暂未启用也不影响）
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

  const params = new URLSearchParams()

  // required
  params.set('category', String(filters.category))

  // optional (backend expects repeated keyword=xxx)
  for (const kw of filters.keywords || []) {
    const s = (kw ?? '').toString().trim()
    if (s) params.append('keyword', s)
  }

  const modelSpec = (filters.modelSpec ?? '').toString().trim()
  if (modelSpec) params.set('modelSpec', modelSpec)

  // front: deviceCategory -> backend: componentCategory
  const componentCategory = (filters.deviceCategory ?? '').toString().trim()
  if (componentCategory) params.set('componentCategory', componentCategory)

  // front: vendor -> backend: manufacture
  const manufacture = (filters.vendor ?? '').toString().trim()
  if (manufacture) params.set('manufacture', manufacture)

  // front: batchNo -> backend: batchNumber
  const batchNumber = (filters.batchNo ?? '').toString().trim()
  if (batchNumber) params.set('batchNumber', batchNumber)

  // page/pageSize (backend: default page=1, max pageSize=15)
  const p = Number(page.pageNo)
  if (Number.isFinite(p) && p > 0) params.set('page', String(Math.floor(p)))

  const ps = Number(page.pageSize)
  if (Number.isFinite(ps) && ps > 0) params.set('pageSize', String(Math.min(15, Math.floor(ps))))

  return request<SearchReportsResponseData>('/reports/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
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
