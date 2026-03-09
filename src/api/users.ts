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

export interface PageParams {
  pageNo: number
  pageSize: number
}

export interface UsersPageRequest {
  pageNo: number
  pageSize: number
}

export interface UsersPageResponseData {
  list: UserListItem[]
  total: number
}

/**
 * 分页查询用户列表（旧接口，保留不动）
 */
export function apiUsersPage({ pageNo, pageSize }: UsersPageRequest) {
  return request<UsersPageResponseData>('/users/page', {
    method: 'POST',
    body: { page: { pageNo, pageSize } as PageParams },
  })
}

export interface CreateUserParams {
  username: string
  password: string
  dept: string
  role: UserRole
}

/**
 * 创建新用户（旧接口，保留不动）
 */
export function apiCreateUser({ username, password, dept, role }: CreateUserParams) {
  return request<null>('/users/create', {
    method: 'POST',
    body: { username, password, dept, role },
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
 * 新增：PATCH 接口适配（对接后端 JWT 文档）
 * 不影响旧 API，页面可按需切换调用
 * =========================== */

export type UserStatusCode = 0 | 1 // 0 frozen/invalid, 1 valid

/**
 * 新接口：修改用户状态（冻结/解冻）
 * 后端：PATCH /api/v1/auth/users/{id}/status?status=0|1
 */
export function apiPatchUserStatus(params: { id: number; status: UserStatusCode }) {
  const qs = new URLSearchParams({ status: String(params.status) }).toString()
  return request<null>(`/auth/users/${params.id}/status?${qs}`, { method: 'PATCH' })
}

/**
 * 新接口：修改用户权限（securityLevel）
 * 后端：PATCH /api/v1/auth/users/{id}/security-level?securityLevel=0|1
 *
 * 注意：后端规则禁止 0->1，且不能改自己；前端只负责传参，失败由后端返回错误码与 msg
 */
export function apiPatchUserSecurityLevel(params: { id: number; securityLevel: 0 | 1 }) {
  const qs = new URLSearchParams({ securityLevel: String(params.securityLevel) }).toString()
  return request<null>(`/auth/users/${params.id}/security-level?${qs}`, { method: 'PATCH' })
}
