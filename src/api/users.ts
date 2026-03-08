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
 * 分页查询用户列表
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
 * 创建新用户
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
 * 更新用户角色
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
 * 冻结或解冻用户
 */
export function apiFreezeUser({ userId, frozen }: FreezeUserParams) {
  return request<null>('/users/freeze', {
    method: 'POST',
    body: { userId, frozen },
  })
}
