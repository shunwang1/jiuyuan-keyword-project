/**
 * 基础URL，所有API请求的前缀
 */
const BASE_URL = '/api/v1'

export type ResponseType = 'json' | 'blob'

export interface RpcEnvelope<T = unknown> {
  code: number
  msg: string
  data: T
  traceId?: string
}

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  responseType?: ResponseType
}

export interface RequestError extends Error {
  code?: number
  traceId?: string
  data?: unknown
  status?: number
}

/**
 * 统一的HTTP请求函数（RPC统一返回：{code,msg,data,traceId}）
 * Cookie鉴权：credentials: 'include'
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!isFormData && options.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const resp = await fetch(url, {
    method: options.method || 'GET',
    credentials: 'include',
    headers,
    body:
      options.body == null
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body),
  })

  if (options.responseType === 'blob') {
    if (!resp.ok) {
      const err: RequestError = new Error(`HTTP ${resp.status}`)
      err.status = resp.status
      throw err
    }
    return (await resp.blob()) as unknown as T
  }

  if (!resp.ok) {
    let payload: unknown = null
    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) payload = await resp.json()
      else payload = await resp.text()
    } catch {
      // ignore parse error
    }

    // 若后端在非2xx时也返回统一格式，尽量解析 msg/traceId
    if (payload && typeof payload === 'object' && 'code' in payload) {
      const p = payload as RpcEnvelope<unknown>
      const err: RequestError = new Error(p.msg || `HTTP ${resp.status}`)
      err.code = p.code
      err.traceId = p.traceId
      err.data = p.data
      err.status = resp.status
      throw err
    }

    const err: RequestError = new Error(
      typeof payload === 'string' && payload ? payload : `HTTP ${resp.status}`,
    )
    err.status = resp.status
    throw err
  }

  const json: RpcEnvelope<T> = await resp.json()

  if (!json || typeof json.code !== 'number') {
    throw new Error('Invalid response format')
  }

  if (json.code !== 0) {
    const err: RequestError = new Error(json.msg || `Request failed, code=${json.code}`)
    err.code = json.code
    err.traceId = json.traceId
    err.data = json.data
    throw err
  }

  return json.data
}
