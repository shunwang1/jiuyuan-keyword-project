import { request } from './http'

export type UserRole = 0 | 1

export interface UserListItem {
  userId: number
  username: string
  dept: string
  role: UserRole
  frozen: boolean
}

export interface CreateUserParams {
  username: string
  password: string
  departmentId: number
  securityLevel: UserRole
}

export function apiCreateUser({
  username,
  password,
  departmentId,
  securityLevel,
}: CreateUserParams) {
  return request<null>('/auth/users/add', {
    method: 'POST',
    body: { username, password, departmentId, securityLevel },
  })
}

export interface UpdateUserRoleParams {
  userId: number
  role: UserRole
}

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

export function apiFreezeUser({ userId, frozen }: FreezeUserParams) {
  return request<null>('/users/freeze', {
    method: 'POST',
    body: { userId, frozen },
  })
}

export type UserStatusCode = 0 | 1

export function apiPatchUserStatus(params: { id: number; status: UserStatusCode }) {
  const qs = new URLSearchParams({ status: String(params.status) }).toString()
  return request<null>(`/auth/users/${params.id}/status?${qs}`, { method: 'PATCH' })
}

export function apiPatchUserSecurityLevel(params: { id: number; securityLevel: 0 | 1 }) {
  const qs = new URLSearchParams({ securityLevel: String(params.securityLevel) }).toString()
  return request<null>(`/auth/users/${params.id}/security-level?${qs}`, { method: 'PATCH' })
}

export interface AuthUserItem {
  id: number | string
  username: string
  securityLevel: 0 | 1 | 2
  departmentId: number
  status?: 0 | 1 | '0' | '1' | number | string
}

export interface AuthUsersQueryResponse {
  list: AuthUserItem[]
}

export async function apiAuthUsersQuery(): Promise<AuthUsersQueryResponse> {
  const data = await request<AuthUserItem[] | { data?: AuthUserItem[] }>('/auth/users/query', {
    method: 'GET',
  })

  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
  return { list }
}

export function mapAuthUserToUserListItem(u: AuthUserItem): UserListItem {
  const normalizedId = Number(u.id)
  const normalizedStatus = Number(u.status)

  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw new Error(`用户 ${u.username} 缺少有效 id`)
  }

  return {
    userId: normalizedId,
    username: u.username,
    dept: String(u.departmentId),
    role: (u.securityLevel === 0 ? 0 : 1) as UserRole,
    frozen: normalizedStatus === 0,
  }
}

export interface DepartmentItem {
  id: number
  name: string
}

export async function apiDepartmentsQuery(): Promise<DepartmentItem[]> {
  const data = await request<any[]>('/departments/query', { method: 'GET' })
  const list = Array.isArray(data) ? data : []

  return list
    .map((x) => ({
      id: Number(x?.id),
      name: String(x?.name ?? ''),
    }))
    .filter((x) => Number.isFinite(x.id) && x.name)
}
