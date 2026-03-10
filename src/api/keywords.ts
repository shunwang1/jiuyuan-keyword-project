// src/api/keywords.ts
// 关键词接口全部使用 urlencoded 或 querystring（对齐 Spring @RequestParam）

import { request } from './http'
import { USE_MOCK_API } from '../config/dev'
import { mockKeywordsQuery, mockKeywordsAdd, mockKeywordsRemove, mockKeywordsUpdate } from './mock'

export interface KeywordsQueryResponseData {
  keywords: string[]
}

/**
 * 查询关键词
 * GET /api/v1/keywords/query?category=1
 *
 * 兼容后端不同返回结构：
 * - 直接返回 string[]
 * - 返回 { keywords: string[] }
 * - 返回 { list: string[] }
 * - 返回 { data: { keywords/list } }（如果某些网关又包了一层）
 */
export async function apiQueryKeywords(categoryId: number): Promise<KeywordsQueryResponseData> {
  if (USE_MOCK_API) return mockKeywordsQuery(String(categoryId))

  const raw = await request<any>(`/keywords/query?category=${encodeURIComponent(categoryId)}`, {
    method: 'GET',
  })

  const pickList = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean)
    return []
  }

  // 1) string[]
  if (Array.isArray(raw)) return { keywords: pickList(raw) }

  // 2) { keywords: [] } / { list: [] }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.keywords)) return { keywords: pickList(raw.keywords) }
    if (Array.isArray(raw.list)) return { keywords: pickList(raw.list) }

    // 3) { data: { keywords/list } }
    const d = (raw as any).data
    if (d && typeof d === 'object') {
      if (Array.isArray(d.keywords)) return { keywords: pickList(d.keywords) }
      if (Array.isArray(d.list)) return { keywords: pickList(d.list) }
    }
  }

  return { keywords: [] }
}

/**
 * 新增关键词
 * POST /api/v1/keywords/add
 * Content-Type: application/x-www-form-urlencoded
 * body: category=1&keyword=xxx
 */
export async function apiAddKeyword(params: { categoryId: number; keyword: string }): Promise<null> {
  if (USE_MOCK_API) return mockKeywordsAdd(String(params.categoryId), params.keyword)

  const body = new URLSearchParams({
    category: String(params.categoryId), // 注意：参数名必须叫 category
    keyword: params.keyword,
  })

  return request<null>('/keywords/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

/**
 * 删除关键词
 * DELETE /api/v1/keywords/delete?category=1&keyword=xxx
 */
export async function apiRemoveKeyword(params: { categoryId: number; keyword: string }): Promise<null> {
  if (USE_MOCK_API) return mockKeywordsRemove(String(params.categoryId), params.keyword)

  const qs = new URLSearchParams({
    category: String(params.categoryId),
    keyword: params.keyword,
  }).toString()

  return request<null>(`/keywords/delete?${qs}`, { method: 'DELETE' })
}

/**
 * 修改关键词（若你后端也是 @RequestParam，推荐 urlencoded + POST）
 * POST /api/v1/keywords/update
 * body: category=1&oldKeyword=aaa&newKeyword=bbb
 */
export async function apiUpdateKeyword(params: {
  categoryId: number
  oldKeyword: string
  newKeyword: string
}): Promise<null> {
  if (USE_MOCK_API) {
    return mockKeywordsUpdate(String(params.categoryId), params.oldKeyword, params.newKeyword)
  }

  const body = new URLSearchParams({
    category: String(params.categoryId),
    oldKeyword: params.oldKeyword,
    newKeyword: params.newKeyword,
  })

  return request<null>('/keywords/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}
