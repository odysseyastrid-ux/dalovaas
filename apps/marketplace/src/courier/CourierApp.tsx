import { Route, Routes } from 'react-router-dom'
import { BottomTabs, ICONS } from '@/components/BottomTabs'
import { useAuthStore } from '@/state/authStore'
import { useCourierDeliveries } from '@/hooks/useOrders'
import { AvailableDeliveries } from './AvailableDeliveries'
import { MyDeliveries } from './MyDeliveries'
import { CourierProfile } from './CourierProfile'

export function CourierApp() {
  const courier = useAuthStore((s) => s.courier)
  const { data: myOrders } = useCourierDeliveries(courier?.id ?? null)
  const activeCount = myOrders.filter((o) => o.status === 'picked_up').length

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route index element={<AvailableDeliveries />} />
          <Route path="mes-courses" element={<MyDeliveries />} />
          <Route path="profil" element={<CourierProfile />} />
        </Routes>
      </div>
      <BottomTabs
        tabs={[
          { to: '/courier', end: true, label: 'Disponibles', icon: ICONS.gauge },
          { to: '/courier/mes-courses', label: 'Mes courses', icon: ICONS.bike, badge: activeCount },
          { to: '/courier/profil', label: 'Profil', icon: ICONS.account },
        ]}
      />
    </div>
  )
}
