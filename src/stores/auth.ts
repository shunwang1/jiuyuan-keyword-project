import { defineStore } from 'pinia'
import { apiLogin, apiLogout, type JwtToken } from '../api/auth'
import { USE_MOCK_AUTH, MOCK_USERS, type MockUser } from '../config/dev'
import { JWT_TOKEN_LS_KEY } from '../api/http'

export interface JwtUser {
id: number
username: string
exp?: number
// 后端已写入
  securityLevel?: 0 | 1 | 2
role?: 0 | 1 | 2
dept?: 0 | 1
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
const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
const json = atob(b64)
return JSON.parse(json) as Record<string, unknown>
} catch {
return null
}
}

function pick012(v: unknown): 0 | 1 | 2 | undefined {
const n = typeof v === 'number' ? v : Number(v)
return n === 0 || n === 1 || n === 2 ? (n as 0 | 1 | 2) : undefined
}

function pick01(v: unknown): 0 | 1 | undefined {
const n = typeof v === 'number' ? v : Number(v)
return n === 0 || n === 1 ? (n as 0 | 1) : undefined
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

// 后端写入的字段
  u.securityLevel = pick012(p.securityLevel)
u.role = pick012(p.role)
u.dept = pick01(p.dept)

return u
}

function isExpired(user: JwtUser | null): boolean {
if (!user?.exp) return false
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
// 以 securityLevel 为准（没有则用 role 兜底；再没有默认普通用户）
    isAdmin: (s) => (((s.user as JwtUser | null)?.securityLevel ?? (s.user as JwtUser | null)?.role ?? 1) === 0),
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

this.token = token
this.user = user

localStorage.setItem(JWT_TOKEN_LS_KEY, token)
localStorage.setItem('user', JSON.stringify(user))

this.loaded = true
},

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
