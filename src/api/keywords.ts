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
 * @param category 报告类别
 * @returns { keywords: [...] }
 */
export async function apiQueryKeywords(category: string): Promise<KeywordsQueryResponseData> {
  if (USE_MOCK_API) {
    return mockKeywordsQuery(category)
  }
  return request<KeywordsQueryResponseData>('/keywords/query', {
    method: 'POST',
    body: { category },
  })
}

/**
 * 新增关键词
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
 * 删除关键词
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

/** 新增：修改关键词 */
export async function apiUpdateKeyword(params: UpdateKeywordParams): Promise<null> {
  if (USE_MOCK_API) {
    return mockKeywordsUpdate(params.category, params.oldKeyword, params.newKeyword)
  }
  return request<null>('/keywords/update', {
    method: 'POST',
    body: params,
  })
}

