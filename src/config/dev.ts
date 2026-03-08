/**
 * 前端开发模式开关：
 * true  => 不依赖后端，会话/登录走前端mock，允许直接看界面
 * false => 严格走后端cookie会话（后端完成后改回false）
 */
export const USE_MOCK_AUTH = true
export const USE_MOCK_API = true

export interface MockUser {
  id: number
  username: string
  role: 0 | 1
  dept: string
}

/**
 * mock 用户（你可改）
 * role: 0 管理员, 1 普通用户
 */
export const MOCK_USERS: Record<'admin' | 'user', MockUser> = {
  admin: { id: 1, username: 'admin', role: 0, dept: '系统管理部' },
  user: { id: 2, username: 'user', role: 1, dept: '默认部门' },
}
