// @ts-nocheck
/// <reference lib="webworker" />
/**
 * Service worker personnalisé (stratégie injectManifest) — reprend le cache
 * offline précédemment généré automatiquement (generateSW) et ajoute la
 * gestion des notifications push web (VAPID), qui nécessite un event
 * listener 'push' impossible à injecter en mode generateSW.
 */
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

registerRoute(
  ({ url }) => /\/api\/v1\/(academic-years|programs|faculties|departments)\//.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-static-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })],
  })
)

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// ── Notifications push web (VAPID) ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'TIRAHOU', body: '', icon: '/pwa-192x192.png', url: '/notifications' }
  if (event.data) {
    try { data = { ...data, ...event.data.json() } } catch { data.body = event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/pwa-192x192.png',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
