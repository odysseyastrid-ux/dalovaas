import { supabase } from './supabaseClient'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Requests notification permission, subscribes to Web Push, and persists the
 * subscription on the customer's account row so notify-order-event can reach them. */
export async function enablePushForAccount(accountId: string): Promise<boolean> {
  if (!pushSupported()) return false
  const vapidKey = import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY
  if (!vapidKey) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
  }

  await supabase.from('accounts').update({ push_subscription: subscription.toJSON() }).eq('id', accountId)
  return true
}

export async function disablePushForAccount(accountId: string): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    await subscription?.unsubscribe()
  }
  await supabase.from('accounts').update({ push_subscription: null }).eq('id', accountId)
}
