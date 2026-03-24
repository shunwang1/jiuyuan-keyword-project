// 用户管理相关API接口（仅管理员可用）

import { request } from './http'

export type UserRole = 0 | 1

export interface UserListItem {
userId: number
username: string
dept: string
role: UserRole
frozen: boolean
// 若后端返回 password（不建议），可加上：
  // password?: string
}

export interface CreateUserParams {
username: string
password: string
departmentId: number
securityLevel: UserRole
}

/**
* 创建新用户
* POST /api/v1/auth/users/add
* 请求体：
* {
*   username,
*   password,
*   departmentId,
*   securityLevel
* }
*/
export function apiCreateUser({ username, password, departmentId, securityLevel }: CreateUserParams) {
return request<null>('/auth/users/add', {
method: 'POST',
body: { username, password, departmentId, securityLevel },
})
}

export interface UpdateUserRoleParams {
userId: number
role: UserRole
}

/**
* 更新用户角色（旧接口，保留不动）
*/
export function apiUpdateUserRole({ userId, role }: UpdateUserRoleParams) {
return request<null>('/users/updateRole', {
method: 'POST',
body: { userId, role },
})
}

export interface FreezeUserParams {
userId: number
frozen: boolean
}

/**
* 冻结或解冻用户（旧接口，保留不动）
*/
export function apiFreezeUser({ userId, frozen }: FreezeUserParams) {
return request<null>('/users/freeze', {
method: 'POST',
body: { userId, frozen },
})
}

/* ===========================
* PATCH 接口适配（对接后端 JWT 文档）
* =========================== */

export type UserStatusCode = 0 | 1 // 0 frozen/invalid, 1 valid

/**
* 新接口：修改用户状态（冻结/解冻）
* PATCH /api/v1/auth/users/{id}/status?status=0|1
*/
export function apiPatchUserStatus(params: { id: number; status: UserStatusCode }) {
const qs = new URLSearchParams({ status: String(params.status) }).toString()
return request<null>(`/auth/users/${params.id}/status?${qs}`, { method: 'PATCH' })
}

/**
* 新接口：修改用户权限（securityLevel）
* PATCH /api/v1/auth/users/{id}/security-level?securityLevel=0|1
*/
export function apiPatchUserSecurityLevel(params: { id: number; securityLevel: 0 | 1 }) {
const qs = new URLSearchParams({ securityLevel: String(params.securityLevel) }).toString()
return request<null>(`/auth/users/${params.id}/security-level?${qs}`, { method: 'PATCH' })
}

/* ===========================
* 查询所有用户
* GET /api/v1/auth/users/query
* =========================== */

export interface AuthUserItem {
username: string
securityLevel: 0 | 1 | 2
departmentId: number
}

export interface AuthUsersQueryResponse {
list: AuthUserItem[]
}

/**
* 查询所有用户
*/
export async function apiAuthUsersQuery(): Promise<AuthUsersQueryResponse> {
const data = await request<AuthUserItem[]>('/auth/users/query', { method: 'GET' })
return { list: data || [] }
}

/**
* 将 AuthUserItem 映射为旧的 UserListItem 结构（仅供页面复用）
*/
export function mapAuthUserToUserListItem(u: AuthUserItem, index: number): UserListItem {
return {
userId: index + 1, // 后端目前未提供 id，可用索引占位
    username: u.username,
dept: String(u.departmentId),
role: (u.securityLevel === 0 ? 0 : 1) as UserRole,
frozen: false,
}
}
