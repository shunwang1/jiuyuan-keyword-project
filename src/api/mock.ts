// 前端开发模拟数据，用于无后端时测试

export interface MockApiError extends Error {
  code?: number
}

export type KeywordsQueryResponse = { keywords: string[] }

type KeywordStore = Record<string, string[]>

// localStorage中存储mock关键词的键名
const LS_KEY = '__mock_keywords_by_category__'

// 默认的关键词数据，按类别分类
const DEFAULT_KEYWORDS: KeywordStore = {
  DPA: ['电压', '电流', '封装', 'ESD'],
  单项检测: ['尺寸', '外观', '标识', '可靠性'],
  失效分析: ['开路', '短路', '失效模式', '断裂'],
  结构分析: ['截面', '材料', '厚度', '孔洞'],
  电性能测试: ['功耗', '频率', '噪声', '温漂'],
  其他检测: ['盐雾', '振动', '冲击', '高温'],
}

/**
 * 从localStorage加载存储的数据
 */
function loadStore(): KeywordStore {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as KeywordStore
  } catch {
    return {}
  }
}

/**
 * 将数据保存到localStorage
 */
function saveStore(store: KeywordStore) {
  localStorage.setItem(LS_KEY, JSON.stringify(store))
}

/**
 * 确保类别在store中存在，不存在则用默认值初始化
 */
function ensureCategory(store: KeywordStore, category: string) {
  if (!category) return
  if (!Array.isArray(store[category])) {
    store[category] = (DEFAULT_KEYWORDS[category] || []).slice()
  }
}

/**
 * 模拟查询关键词接口
 */
export function mockKeywordsQuery(category: string): KeywordsQueryResponse {
  const store = loadStore()
  ensureCategory(store, category)
  saveStore(store)
  return { keywords: store[category] || [] }
}

/**
 * 模拟新增关键词接口
 */
export function mockKeywordsAdd(category: string, keyword: string): null {
  const kw = String(keyword || '').trim()
  if (!category) throw new Error('category 不能为空')
  if (!kw) throw new Error('keyword 不能为空')

  const store = loadStore()
  ensureCategory(store, category)

  if (store[category].includes(kw)) {
    const err: MockApiError = new Error('关键词已存在（mock）')
    err.code = 40901
    throw err
  }

  store[category].unshift(kw)
  saveStore(store)
  return null
}

/**
 * 模拟删除关键词接口
 */
export function mockKeywordsRemove(category: string, keyword: string): null {
  const kw = String(keyword || '').trim()
  if (!category) throw new Error('category 不能为空')
  if (!kw) throw new Error('keyword 不能为空')

  const store = loadStore()
  ensureCategory(store, category)

  const before = store[category].length
  store[category] = store[category].filter((x) => x !== kw)

  if (store[category].length === before) {
    const err: MockApiError = new Error('关键词不存在（mock）')
    err.code = 40401
    throw err
  }

  saveStore(store)
  return null
}

/**
 * 模拟修改关键词接口
 */
export function mockKeywordsUpdate(category: string, oldKeyword: string, newKeyword: string): null {
  const oldKw = String(oldKeyword || '').trim()
  const newKw = String(newKeyword || '').trim()

  if (!category) throw new Error('category 不能为空')
  if (!oldKw) throw new Error('oldKeyword 不能为空')
  if (!newKw) throw new Error('newKeyword 不能为空')

  const store = loadStore()
  ensureCategory(store, category)

  const list = store[category]
  const idx = list.indexOf(oldKw)
  if (idx < 0) {
    const err: MockApiError = new Error('原关键词不存在（mock）')
    err.code = 40401
    throw err
  }

  if (list.includes(newKw)) {
    const err: MockApiError = new Error('新关键词已存在（mock）')
    err.code = 40901
    throw err
  }

  list[idx] = newKw
  saveStore(store)
  return null
}


/**
 * 清空mock数据（调试用）
 */
export function mockKeywordsReset() {
  localStorage.removeItem(LS_KEY)
}

export interface MockReportsSearchParams {
  filters: {
    category?: string

    // ✅ 改动：上传页面字段变更后，mock 搜索条件同步调整
    modelSpec?: string
    deviceCategory?: string
    vendor?: string
    batchNo?: string

    keywords?: string[]
  }
  page: { pageNo: number; pageSize: number }
}

export interface MockReportListItem {
  reportId: number
  fileName: string
  category: string

  // ✅ 改动：返回字段同步调整
  modelSpec?: string
  deviceCategory?: string
  vendor?: string
  batchNo?: string

  // 兼容旧字段（可选，避免其他地方暂时引用时报错）
  address?: string
  prodDate?: string

  status: 'APPROVED'
  createdAt: string
}

export interface MockReportsSearchResult {
  list: MockReportListItem[]
  total: number
}

/**
 * 模拟报告搜索接口
 */
export function mockReportsSearch({ filters, page }: MockReportsSearchParams): MockReportsSearchResult {
  const list: MockReportListItem[] = Array.from({ length: Math.min(page.pageSize, 5) }).map((_, i) => ({
    reportId: 1000 + i + (page.pageNo - 1) * page.pageSize,
    fileName: `示例报告-${filters.category || '未知'}-${i + 1}.pdf`,
    category: filters.category || 'DPA',

    // ✅ 改动：按新字段返回（若没传就给默认示例值）
    modelSpec: filters.modelSpec || `型号-${i + 1}`,
    deviceCategory: filters.deviceCategory || '示例门类',
    vendor: filters.vendor || '示例厂家',
    batchNo: filters.batchNo || `BATCH-${String(i + 1).padStart(3, '0')}`,

    status: 'APPROVED',
    createdAt: '2025-01-01 10:00:00',
  }))

  return { list, total: 23 }
}
