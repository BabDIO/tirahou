import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { useToast } from './useToast'

function buildWsUrl(token: string): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1'
  const origin = apiUrl.replace(/\/api\/v1\/?$/, '')
  const wsOrigin = origin.replace(/^http/, 'ws')
  return `${wsOrigin}/ws/notifications/?token=${encodeURIComponent(token)}`
}

interface IncomingNotification {
  id: number
  title: string
  message: string
}

/**
 * Ouvre un WebSocket vers /ws/notifications/ pour recevoir les notifications
 * en temps réel (au lieu d'attendre le prochain polling de 30s). Reconnexion
 * automatique avec backoff ; le polling existant reste en place comme filet
 * de sécurité si la connexion échoue (réseau restrictif, proxy sans upgrade
 * WebSocket, etc.).
 */
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const reconnectAttempt = useRef(0)
  const shouldReconnect = useRef(true)

  useEffect(() => {
    if (!token) return
    shouldReconnect.current = true
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
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
        queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
        queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
        toastRef.current.showToast(notif.title || notif.message, 'info')
      }

      socket.onclose = (event) => {
        if (!shouldReconnect.current || event.code === 4001) return
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
      shouldReconnect.current = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [token, queryClient])
}
