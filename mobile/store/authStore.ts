import { create } from 'zustand'
import * as SecureStore from '../lib/storage'
import { ACCESS_KEY, REFRESH_KEY } from '../lib/api'

export interface Role {
  id: string
  name: string
  description: string
  is_active: boolean
}

export interface AuthUser {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  roles: Role[]
}

export type AppRole = 'etudiant' | 'enseignant' | null

interface AuthState {
  user: AuthUser | null
  isHydrating: boolean
  isAuthenticated: boolean
  role: AppRole
  hydrate: () => Promise<void>
  setAuth: (user: AuthUser, access: string, refresh: string) => Promise<void>
  logout: () => Promise<void>
}

function resolveRole(user: AuthUser | null): AppRole {
  const names = user?.roles?.map((r) => r.name) ?? []
  if (names.includes('enseignant')) return 'enseignant'
  if (names.includes('etudiant')) return 'etudiant'
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  isAuthenticated: false,
  role: null,

  hydrate: async () => {
    try {
      const [access, userJson] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync('auth_user'),
      ])
      if (access && userJson) {
        const user = JSON.parse(userJson) as AuthUser
        set({ user, isAuthenticated: true, role: resolveRole(user), isHydrating: false })
      } else {
        set({ isHydrating: false })
      }
    } catch {
      set({ isHydrating: false })
    }
  },

  setAuth: async (user, access, refresh) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
      SecureStore.setItemAsync('auth_user', JSON.stringify(user)),
    ])
    set({ user, isAuthenticated: true, role: resolveRole(user) })
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync('auth_user'),
    ])
    set({ user: null, isAuthenticated: false, role: null })
  },
}))
