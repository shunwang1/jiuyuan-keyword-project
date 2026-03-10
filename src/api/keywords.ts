// src/api/keywords.ts
// 关键词管理API接口

import { request } from './http'
import { USE_MOCK_API } from '../config/dev'
import { mockKeywordsQuery, mockKeywordsAdd, mockKeywordsRemove, mockKeywordsUpdate } from './mock'

export interface KeywordsQueryResponseData {
  keywords: string[]
}

export interface KeywordMutationParams {
  category: string
  keyword: string
}

/**
 * 查询关键词
 * 新接口：GET /api/v1/keywords/query?category=1
 * 注意：这里 category 改为 number（类别ID）
 */
export async function apiQueryKeywords(category: number): Promise<KeywordsQueryResponseData> {
  if (USE_MOCK_API) {
    // mock 里如果还是按字符串类别存，你可以先 String(category) 兼容
    return mockKeywordsQuery(String(category))
  }

  return request<KeywordsQueryResponseData>(`/keywords/query?category=${encodeURIComponent(category)}`, {
    method: 'GET',
  })
}

/**
 * 新增关键词（你未要求调整，此处保持原样；若后端也改了再一起改）
 */
export async function apiAddKeyword({ category, keyword }: KeywordMutationParams): Promise<null> {
  if (USE_MOCK_API) {
    return mockKeywordsAdd(category, keyword)
  }
  return request<null>('/keywords/add', {
    method: 'POST',
    body: { category, keyword },
  })
}

/**
 * 删除关键词（保持原样）
 */
export async function apiRemoveKeyword({ category, keyword }: KeywordMutationParams): Promise<null> {
  if (USE_MOCK_API) {
    return mockKeywordsRemove(category, keyword)
  }
  return request<null>('/keywords/remove', {
    method: 'POST',
    body: { category, keyword },
  })
}

export interface UpdateKeywordParams {
  category: string
  oldKeyword: string
  newKeyword: string
}

/** 修改关键词（保持原样） */
export async function apiUpdateKeyword(params: UpdateKeywordParams): Promise<null> {
  if (USE_MOCK_API) {
    return mockKeywordsUpdate(params.category, params.oldKeyword, params.newKeyword)
  }
  return request<null>('/keywords/update', {
    method: 'POST',
    body: params,
  })
}
