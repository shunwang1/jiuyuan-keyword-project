// 用户认证相关API接口（JWT：login data 为 token 字符串）

import { request } from './http'

export type JwtToken = string

export function apiLogin(username: string, password: string) {
  return request<JwtToken>('/auth/login', {
    method: 'POST',
    body: { username, password },
  })
}

/**
 * 退出登录：后端无状态，调不调都行；按文档提供 loginOut
 */
export function apiLogout() {
  return request<null>('/auth/loginOut', {
    method: 'POST',
    body: {},
  })
}
