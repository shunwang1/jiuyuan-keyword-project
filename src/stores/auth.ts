import { defineStore } from 'pinia'
import { apiLogin, apiLogout, type JwtToken } from '../api/auth'
import { USE_MOCK_AUTH, MOCK_USERS, type MockUser } from '../config/dev'
import { JWT_TOKEN_LS_KEY } from '../api/http'

export interface JwtUser {
  id: number
  username: string
  exp?: number
}

type StoredUser = JwtUser | MockUser | null

interface AuthState {
  user: StoredUser
  token: string | null
  loaded: boolean
}

function safeJsonParse<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(b64)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseJwtUser(token: string): JwtUser | null {
  const p = parseJwtPayload(token)
  if (!p) return null
  const id = Number(p.id)
  const username = String(p.username || '')
  const exp = typeof p.exp === 'number' ? p.exp : Number(p.exp)

  if (!Number.isFinite(id) || !username) return null
  const u: JwtUser = { id, username }
  if (Number.isFinite(exp)) u.exp = exp
  return u
}

function isExpired(user: JwtUser | null): boolean {
  if (!user?.exp) return false
  // exp 通常是秒
  const nowSec = Math.floor(Date.now() / 1000)
  return user.exp <= nowSec
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: safeJsonParse<StoredUser>(localStorage.getItem('user'), null),
    token: localStorage.getItem(JWT_TOKEN_LS_KEY),
    loaded: false,
  }),

  getters: {
    isAuthed: (s) => !!s.token && !!s.user,
    username: (s) => (s.user as JwtUser | null)?.username ?? (s.user as MockUser | null)?.username ?? '',
    /**
     * 由于 JWT payload 不含 securityLevel/role，前端无法可靠判断管理员
     * 这里默认 false，避免误判导致越权 UI 展示
     */
    isAdmin: () => false,
  },

  actions: {
    async login({ username, password }: { username: string; password: string }) {
      if (USE_MOCK_AUTH) {
        const u = username === 'admin' && password === 'admin' ? MOCK_USERS.admin : MOCK_USERS.user
        this.user = u
        this.token = 'mock-token'
        localStorage.setItem('user', JSON.stringify(u))
        localStorage.setItem(JWT_TOKEN_LS_KEY, this.token)
        this.loaded = true
        return
      }

      const token: JwtToken = await apiLogin(username, password)
      const user = parseJwtUser(token)

      // 如果解析失败，也允许登录，但 user 为空会导致菜单/用户名不可用
      this.token = token
      this.user = user

      localStorage.setItem(JWT_TOKEN_LS_KEY, token)
      localStorage.setItem('user', JSON.stringify(user))

      this.loaded = true
    },

    /**
     * JWT 模式下的“恢复登录态”：从 localStorage 读取并解析
     */
    async fetchMe() {
      if (USE_MOCK_AUTH) {
        this.user = safeJsonParse<StoredUser>(localStorage.getItem('user'), null)
        this.token = localStorage.getItem(JWT_TOKEN_LS_KEY)
        this.loaded = true
        return
      }

      const token = localStorage.getItem(JWT_TOKEN_LS_KEY)
      if (!token) {
        this.token = null
        this.user = null
        localStorage.removeItem('user')
        this.loaded = true
        return
      }

      const user = parseJwtUser(token)
      // 若 token 已过期，直接清理（前端本地判断，避免一直带过期 token）
      if (user && isExpired(user)) {
        this.token = null
        this.user = null
        localStorage.removeItem(JWT_TOKEN_LS_KEY)
        localStorage.removeItem('user')
        this.loaded = true
        return
      }

      this.token = token
      this.user = user
      localStorage.setItem('user', JSON.stringify(user))

      this.loaded = true
    },

    async logout() {
      if (!USE_MOCK_AUTH) {
        try {
          await apiLogout()
        } catch {
          // ignore
        }
      }

      this.user = null
      this.token = null
      this.loaded = true
      localStorage.removeItem('user')
      localStorage.removeItem(JWT_TOKEN_LS_KEY)
    },
  },
})
