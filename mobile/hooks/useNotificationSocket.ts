import { useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { ACCESS_KEY } from '../lib/api'
import * as SecureStore from '../lib/storage'

function buildWsUrl(token: string): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  const origin = apiUrl.replace(/\/api\/v1\/?$/, '')
  const wsOrigin = origin.replace(/^http/, 'ws')
  return `${wsOrigin}/ws/notifications/?token=${encodeURIComponent(token)}`
}

interface IncomingNotification {
  title: string
  message: string
}

/**
 * Pendant de useNotificationSocket côté web (frontend/src/hooks) — même
 * backend WebSocket, même reconnexion avec backoff. Différence : pas de
 * librairie de toast ici, donc on réutilise Alert.alert, déjà utilisé
 * ailleurs dans l'app pour ce type de message ponctuel (voir attendance.tsx,
 * grades.tsx) plutôt que d'introduire un nouveau système d'UI pour ça seul.
 */
export function useNotificationSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)

  useEffect(() => {
    if (!isAuthenticated) return
    shouldReconnect.current = true
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const connect = async () => {
      const token = await SecureStore.getItemAsync(ACCESS_KEY)
      if (!token || cancelled) return

      socket = new WebSocket(buildWsUrl(token))

      socket.onopen = () => {
        reconnectAttempt.current = 0
      }

      socket.onmessage = (event) => {
        let notif: IncomingNotification
        try {
          notif = JSON.parse(event.data)
        } catch {
          return
        }
        Alert.alert(notif.title || 'Nouvelle notification', notif.message || undefined)
      }

      socket.onclose = (event) => {
        if (!shouldReconnect.current || cancelled || event.code === 4001) return
        const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt.current)
        reconnectAttempt.current += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      shouldReconnect.current = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [isAuthenticated])
}
