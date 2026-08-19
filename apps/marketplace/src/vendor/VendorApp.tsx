import { Route, Routes } from 'react-router-dom'
import { BottomTabs, ICONS } from '@/components/BottomTabs'
import { useVendorOrders } from '@/hooks/useOrders'
import { useAuthStore } from '@/state/authStore'
import { OrdersBoard } from './OrdersBoard'
import { MenuManager } from './MenuManager'
import { VendorProfile } from './VendorProfile'

export function VendorApp() {
  const vendor = useAuthStore((s) => s.vendor)
  const { data: orders } = useVendorOrders(vendor?.id ?? null)
  const newCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route index element={<OrdersBoard />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="profil" element={<VendorProfile />} />
        </Routes>
      </div>
      <BottomTabs
        tabs={[
          { to: '/vendor', end: true, label: 'Commandes', icon: ICONS.list, badge: newCount },
          { to: '/vendor/menu', label: 'Menu', icon: ICONS.store },
          { to: '/vendor/profil', label: 'Profil', icon: ICONS.account },
        ]}
      />
    </div>
  )
}
