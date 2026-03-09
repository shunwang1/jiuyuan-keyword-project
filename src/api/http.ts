/**
 * 基础URL，所有API请求的前缀
 */
const BASE_URL = '/api/v1'

export const JWT_TOKEN_LS_KEY = '__jwt_token__'

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

function readToken(): string | null {
  try {
    return localStorage.getItem(JWT_TOKEN_LS_KEY)
  } catch {
    return null
  }
}

function clearAuthStorage() {
  try {
    localStorage.removeItem(JWT_TOKEN_LS_KEY)
    localStorage.removeItem('user')
  } catch {
    // ignore
  }
}

/**
 * 不依赖 router，避免循环依赖：
 * - 用 location.replace 直接跳转到 /login
 * - 携带 reason 方便登录页展示（可选）
 */
function redirectToLogin(reason?: string) {
  const base = '/login'
  const url = reason ? `${base}?reason=${encodeURIComponent(reason)}` : base
  // replace 避免用户点“后退”回到受保护页面又被拦
  window.location.replace(url)
}

/**
 * 统一的HTTP请求函数（RPC统一返回：{code,msg,data,traceId}）
 * JWT鉴权：请求头 token: <JWT>
 * 成功码：ResponseCode.SUCCESS = 1
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  }

  // 自动注入 token（调用方显式传 token 时不覆盖）
  if (!('token' in headers)) {
    const token = readToken()
    if (token) headers.token = token
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const isUrlSearchParams =
    typeof URLSearchParams !== 'undefined' && options.body instanceof URLSearchParams

  if (!isFormData && options.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = isUrlSearchParams
      ? 'application/x-www-form-urlencoded;charset=UTF-8'
      : 'application/json'
  }

  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body:
      options.body == null
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : isUrlSearchParams
            ? (options.body as URLSearchParams).toString()
          : typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body),
  })

  // blob：下载/预览文件
  if (options.responseType === 'blob') {
    if (!resp.ok) {
      const err: RequestError = new Error(`HTTP ${resp.status}`)
      err.status = resp.status
      throw err
    }
    return (await resp.blob()) as unknown as T
  }

  // 非2xx：尽量解析统一结构
  if (!resp.ok) {
    let payload: unknown = null
    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) payload = await resp.json()
      else payload = await resp.text()
    } catch {
      // ignore
    }

    // 若后端在非2xx时也返回统一格式，尽量解析 msg/traceId
    if (payload && typeof payload === 'object' && 'code' in payload) {
      const p = payload as RpcEnvelope<unknown>

      // 对 401/40102/40302 做统一清理与跳转
      if (p.code === 401 || p.code === 40102) {
        clearAuthStorage()
        redirectToLogin(p.msg || '登录已失效，请重新登录')
      }
      if (p.code === 40302) {
        clearAuthStorage()
        redirectToLogin(p.msg || '账号已冻结，请联系管理员')
      }

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

  // SUCCESS = 1
  if (json.code !== 1) {
    // 401 / 40102：未登录/凭证错误 => 清理并跳登录
    if (json.code === 401 || json.code === 40102) {
      clearAuthStorage()
      redirectToLogin(json.msg || '登录已失效，请重新登录')
    }

    // 40302：冻结 => 清理并跳登录
    if (json.code === 40302) {
      clearAuthStorage()
      redirectToLogin(json.msg || '账号已冻结，请联系管理员')
    }

    // 403：无权限 => 不跳转，只抛错，交给页面提示
    const err: RequestError = new Error(json.msg || `Request failed, code=${json.code}`)
    err.code = json.code
    err.traceId = json.traceId
    err.data = json.data
    throw err
  }

  return json.data
}
