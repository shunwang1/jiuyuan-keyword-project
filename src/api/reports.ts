// src/api/reports.ts
// 报告管理相关API接口（按当前前后端联调需求整理）
// - 上传
// - 搜索
// - 文件下载（原生 fetch 获取 blob + headers）
// - 上传页下拉 query/add/delete

import { request, type BlobResponse, JWT_TOKEN_LS_KEY } from './http'
import { USE_MOCK_API } from '../config/dev'
import { mockReportsSearch } from './mock'

// 后端字典：1001/1002/1003；兼容旧实现字符串状态
export type ReportStatusCode = 1001 | 1002 | 1003
export type ReportStatusText = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ReportStatus = ReportStatusCode | ReportStatusText

export type ReportCategory = number | string

export interface UploadReportParams {
  file: File
  category: number
  modelSpec: string
  componentCategory: string
  manufacturerName?: string
  batchNumber?: string
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

function readToken(): string | null {
  try {
    return localStorage.getItem(JWT_TOKEN_LS_KEY)
  } catch {
    return null
  }
}

export function apiUploadReport(params: UploadReportParams) {
  const fd = new FormData()
  fd.append('file', params.file)
  fd.append('category', String(params.category))
  fd.append('modelSpec', params.modelSpec)
  fd.append('componentCategory', params.componentCategory)
  if (params.manufacturerName) fd.append('manufacturerName', params.manufacturerName)
  if (params.batchNumber) fd.append('batchNumber', params.batchNumber)

  return request<null>('/reports/upload', {
    method: 'POST',
    body: fd,
  })
}

/**
 * 下载报告文件（原生 fetch）
 * GET /api/v1/reports/file?id=1
 * 请求头：token
 * 返回：blob + headers + status
 */
export async function apiReportFileBlob(id: number | string): Promise<BlobResponse> {
  const token = readToken()
  const url = `/api/v1/reports/file?id=${encodeURIComponent(id)}`

  const headers: Record<string, string> = {}
  if (token) headers.token = token

  const resp = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`

    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const payload = await resp.json()
        message = payload?.msg || message
      } else {
        const text = await resp.text()
        if (text) message = text
      }
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  const blob = await resp.blob()

  return {
    blob,
    headers: resp.headers,
    status: resp.status,
  }
}

/**
 * 预览报告（获取 PDF blob）
 * GET /api/v1/reports/preview?id={reportId}
 * 请求头：token
 * 返回：PDF blob + headers + status
 */
export async function apiReportPreviewBlob(id: number | string): Promise<BlobResponse> {
  const token = readToken()
  const url = `/api/v1/reports/preview?id=${encodeURIComponent(id)}`

  const headers: Record<string, string> = {}
  if (token) headers.token = token

  const resp = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`

    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const payload = await resp.json()
        message = payload?.msg || message
      } else {
        const text = await resp.text()
        if (text) message = text
      }
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  const blob = await resp.blob()

  return {
    blob,
    headers: resp.headers,
    status: resp.status,
  }
}

/**
 * 更新报告状态
 * PATCH /api/v1/reports/{id}/status?status=1001|1002|1003
 */
export function apiUpdateReportStatus(params: { id: number | string; status: number }) {
  const qs = new URLSearchParams({ status: String(params.status) }).toString()
  return request<null>(`/reports/${params.id}/status?${qs}`, {
    method: 'PATCH',
  })
}


/**
 * 搜索报告
 * 兼容当前联调：
 * - category 传数字ID
 * - 结果兼容 list/records/rows
 */
export async function apiSearchReports({ filters, page }: SearchReportsParams): Promise<SearchReportsResponseData> {
  if (USE_MOCK_API) {
    return mockReportsSearch({ filters, page }) as SearchReportsResponseData
  }

  const params = new URLSearchParams()

  params.set('category', String(filters.category))

  for (const kw of filters.keywords || []) {
    const s = (kw ?? '').toString().trim()
    if (s) params.append('keyword', s)
  }

  const modelSpec = (filters.modelSpec ?? '').toString().trim()
  if (modelSpec) params.set('modelSpec', modelSpec)

  const componentCategory = (filters.deviceCategory ?? '').toString().trim()
  if (componentCategory) params.set('componentCategory', componentCategory)

  const manufacturerName = (filters.vendor ?? '').toString().trim()
  if (manufacturerName) params.set('manufacturerName', manufacturerName)

  const batchNumber = (filters.batchNo ?? '').toString().trim()
  if (batchNumber) params.set('batchNumber', batchNumber)

  const p = Number(page.pageNo)
  if (Number.isFinite(p) && p > 0) params.set('pageNo', String(Math.floor(p)))

  const ps = Number(page.pageSize)
  if (Number.isFinite(ps) && ps > 0) params.set('pageSize', String(Math.min(15, Math.floor(ps))))

  const raw = await request<any>('/reports/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const list = Array.isArray(raw?.list)
    ? raw.list
    : Array.isArray(raw?.records)
      ? raw.records
      : Array.isArray(raw?.rows)
        ? raw.rows
        : []

  const totalRaw = raw?.total ?? raw?.count ?? raw?.pageTotal ?? list.length
  const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : list.length

  return {
    list,
    total,
  }
}

/* ===========================
 * 上传页下拉：查询接口
 * =========================== */

export interface CategoryItem {
  id: number
  name: string
}

export async function apiQueryCategories(): Promise<CategoryItem[]> {
  const data = await request<any>('/categories/query', { method: 'GET' })
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : []

  return list
    .map((x) => ({
      id: Number(x?.id ?? x?.categoryId ?? x?.value),
      name: String(x?.name ?? x?.categoryName ?? x?.category ?? x?.label ?? ''),
    }))
    .filter((x) => Number.isFinite(x.id) && x.name)
}

function mapToStringList(data: any): string[] {
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : []
  return list
    .map((x) => (typeof x === 'string' ? x : String(x?.name ?? x?.value ?? x?.label ?? x)))
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function apiQueryModelSpecs(categoryId: number): Promise<string[]> {
  const data = await request<any>(`/model-specs/query?categoryId=${encodeURIComponent(categoryId)}`, {
    method: 'GET',
  })
  return mapToStringList(data)
}

export async function apiQueryComponentCategories(categoryId: number): Promise<string[]> {
  const data = await request<any>(
    `/component-categories/query?categoryId=${encodeURIComponent(categoryId)}`,
    { method: 'GET' },
  )
  return mapToStringList(data)
}

export async function apiQueryManufacturers(categoryId: number): Promise<string[]> {
  const data = await request<any>(
    `/manufacturers/query?categoryId=${encodeURIComponent(categoryId)}`,
    { method: 'GET' },
  )
  return mapToStringList(data)
}

export async function apiQueryBatchNumbers(categoryId: number): Promise<string[]> {
  const data = await request<any>(
    `/batch-numbers/query?categoryId=${encodeURIComponent(categoryId)}`,
    { method: 'GET' },
  )
  return mapToStringList(data)
}

/* ===========================
 * 上传页下拉：新增/删除接口
 * =========================== */

export function apiAddModelSpec(params: { categoryId: number; modelSpec: string }) {
  const body = new URLSearchParams({
    categoryId: String(params.categoryId),
    modelSpec: params.modelSpec,
  })
  return request<unknown>('/model-specs/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export function apiDeleteModelSpec(params: { categoryId: number; modelSpec: string }) {
  const qs = new URLSearchParams({
    categoryId: String(params.categoryId),
    modelSpec: params.modelSpec,
  }).toString()
  return request<unknown>(`/model-specs/delete?${qs}`, { method: 'DELETE' })
}

export function apiAddComponentCategory(params: { categoryId: number; componentCategory: string }) {
  const body = new URLSearchParams({
    categoryId: String(params.categoryId),
    componentCategory: params.componentCategory,
  })
  return request<unknown>('/component-categories/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export function apiDeleteComponentCategory(params: { categoryId: number; componentCategory: string }) {
  const qs = new URLSearchParams({
    categoryId: String(params.categoryId),
    componentCategory: params.componentCategory,
  }).toString()
  return request<unknown>(`/component-categories/delete?${qs}`, { method: 'DELETE' })
}

export function apiAddManufacturer(params: { categoryId: number; manufacturerName: string }) {
  const body = new URLSearchParams({
    categoryId: String(params.categoryId),
    manufacturerName: params.manufacturerName,
  })
  return request<unknown>('/manufacturers/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export function apiDeleteManufacturer(params: { categoryId: number; manufacturerName: string }) {
  const qs = new URLSearchParams({
    categoryId: String(params.categoryId),
    manufacturerName: params.manufacturerName,
  }).toString()
  return request<unknown>(`/manufacturers/delete?${qs}`, { method: 'DELETE' })
}

export function apiAddBatchNumber(params: { categoryId: number; batchNumber: string }) {
  const body = new URLSearchParams({
    categoryId: String(params.categoryId),
    batchNumber: params.batchNumber,
  })
  return request<unknown>('/batch-numbers/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

export function apiDeleteBatchNumber(params: { categoryId: number; batchNumber: string }) {
  const qs = new URLSearchParams({
    categoryId: String(params.categoryId),
    batchNumber: params.batchNumber,
  }).toString()
  return request<unknown>(`/batch-numbers/delete?${qs}`, { method: 'DELETE' })
}
