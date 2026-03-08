// 用户认证相关API接口

import { request } from './http'

export interface UserInfo {
  id: number
  username: string
  role: 0 | 1
  dept: string
}

export interface LoginResponseData {
  user: UserInfo
}

export interface MeResponseData {
  user: UserInfo
}

/**
 * 用户登录
 */
export function apiLogin(username: string, password: string) {
  return request<LoginResponseData>('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
}

/**
 * 用户登出
 */
export function apiLogout() {
  return request<null>('/auth/logout', {
    method: 'POST',
    body: {},
  })
}

/**
 * 获取当前用户信息（cookie会话）
 */
export function apiMe() {
  return request<MeResponseData>('/auth/me', { method: 'GET' })
}
