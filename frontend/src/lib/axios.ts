import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor : injecter le token ───────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor : refresh token auto ────────────────────────────────
// Si plusieurs requêtes échouent en 401 en même temps (cas fréquent : une
// page qui déclenche 3-4 appels API en parallèle au montage), on ne veut
// PAS déclencher 3-4 refresh simultanés — le backend fait tourner (SimpleJWT
// ROTATE_REFRESH_TOKENS) et le premier refresh invaliderait déjà le refresh
// token utilisé par les suivants. `isRefreshing` sert donc de verrou : le
// premier 401 lance le refresh, les suivants sont mis en file d'attente
// (failedQueue) et rejoués avec le nouveau token une fois le refresh terminé.
let isRefreshing = false
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Serveur hors ligne ou erreur réseau
    if (!error.response) {
      const code = error.code || 'NETWORK_ERROR'
      const networkError = new Error(
        `Erreur réseau (${code})`
      )
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

      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`
        processQueue(null, data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
