self.addEventListener('push', (event) => {
  let data = { title: 'Chez Sanji', body: '' }
  try {
    data = event.data.json()
  } catch {
    data.body = event.data ? event.data.text() : ''
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Chez Sanji', {
      body: data.body,
      tag: data.tag,
      icon: '/favicon.svg',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
