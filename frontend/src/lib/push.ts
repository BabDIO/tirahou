import { communicationApi } from '../api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const { data } = await communicationApi.getVapidPublicKey()
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.public_key) as BufferSource,
  })

  const json = subscription.toJSON()
  await communicationApi.subscribePush({
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
  })
  return true
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentPushSubscription()
  if (!subscription) return
  await communicationApi.unsubscribePush(subscription.endpoint)
  await subscription.unsubscribe()
}
