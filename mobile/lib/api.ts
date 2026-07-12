import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from './storage'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const ACCESS_KEY = 'access_token'
export const REFRESH_KEY = 'refresh_token'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor : injecter le token ───────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor : refresh token auto ────────────────────────────────
let isRefreshing = false
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = []
let onAuthExpired: (() => void) | null = null

export function setOnAuthExpired(cb: () => void) {
  onAuthExpired = cb
}

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response) {
      const code = error.code || 'NETWORK_ERROR'
      const networkError = new Error(`Erreur réseau (${code})`)
      ;(networkError as Error & { isNetworkError: boolean; code?: string }).isNetworkError = true
      ;(networkError as Error & { isNetworkError: boolean; code?: string }).code = code
      return Promise.reject(networkError)
    }
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refresh = await SecureStore.getItemAsync(REFRESH_KEY)
      if (!refresh) {
        isRefreshing = false
        await SecureStore.deleteItemAsync(ACCESS_KEY)
        await SecureStore.deleteItemAsync(REFRESH_KEY)
        onAuthExpired?.()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
        await SecureStore.setItemAsync(ACCESS_KEY, data.access)
        processQueue(null, data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        await SecureStore.deleteItemAsync(ACCESS_KEY)
        await SecureStore.deleteItemAsync(REFRESH_KEY)
        onAuthExpired?.()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
