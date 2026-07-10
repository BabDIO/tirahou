import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User as ApiUser } from '../types'

export type AuthUser = ApiUser & { role: string }

function derivePrimaryRole(user: ApiUser): string {
  return user.roles?.[0]?.name ?? ''
}

interface AuthStore {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: ApiUser, access: string, refresh: string) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, access, refresh) => {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({
          user: { ...user, role: derivePrimaryRole(user) },
          token: access,
          refreshToken: refresh,
          isAuthenticated: true,
        })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
)
