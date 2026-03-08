import { defineStore } from 'pinia'
import { apiLogin, apiLogout, apiMe, type UserInfo } from '../api/auth'
import { USE_MOCK_AUTH, MOCK_USERS, type MockUser } from '../config/dev'

type StoredUser = UserInfo | MockUser | null

interface AuthState {
  user: StoredUser
  loaded: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: JSON.parse(localStorage.getItem('user') || 'null') as StoredUser,
    loaded: false,
  }),

  getters: {
    isAuthed: (s: AuthState) => !!s.user,
    role: (s: AuthState) => (s.user?.role ?? 1) as 0 | 1,
    username: (s: AuthState) => s.user?.username ?? '',
    isAdmin: (s: AuthState) => (s.user?.role ?? 1) === 0,
  },

  actions: {
    async login({ username, password }: { username: string; password: string }) {
      if (USE_MOCK_AUTH) {
        const u = username === 'admin' && password === 'admin' ? MOCK_USERS.admin : MOCK_USERS.user
        this.user = u
        localStorage.setItem('user', JSON.stringify(u))
        this.loaded = true
        return
      }

      const data = await apiLogin(username, password)
      this.user = data.user
      localStorage.setItem('user', JSON.stringify(this.user))
      this.loaded = true
    },

    async fetchMe() {
      if (USE_MOCK_AUTH) {
        this.user = JSON.parse(localStorage.getItem('user') || 'null') as StoredUser
        this.loaded = true
        return
      }

      try {
        const data = await apiMe()
        this.user = data.user
        localStorage.setItem('user', JSON.stringify(this.user))
      } catch {
        this.user = null
        localStorage.removeItem('user')
      } finally {
        this.loaded = true
      }
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
      this.loaded = true
      localStorage.removeItem('user')
    },
  },
})
