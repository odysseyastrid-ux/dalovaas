import { Route, Routes } from 'react-router-dom'
import { BottomTabs, ICONS } from '@/components/BottomTabs'
import { useAllVendors } from '@/hooks/useVendors'
import { Overview } from './Overview'
import { VendorsManagement } from './VendorsManagement'
import { CouriersManagement } from './CouriersManagement'
import { OrdersOverview } from './OrdersOverview'

export function AdminApp() {
  const { data: vendors } = useAllVendors()
  const pendingCount = vendors.filter((v) => v.status === 'pending').length

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="restaurants" element={<VendorsManagement />} />
          <Route path="livreurs" element={<CouriersManagement />} />
          <Route path="commandes" element={<OrdersOverview />} />
        </Routes>
      </div>
      <BottomTabs
        tabs={[
          { to: '/admin', end: true, label: 'Aperçu', icon: ICONS.gauge },
          { to: '/admin/restaurants', label: 'Restaurants', icon: ICONS.store, badge: pendingCount },
          { to: '/admin/livreurs', label: 'Livreurs', icon: ICONS.bike },
          { to: '/admin/commandes', label: 'Commandes', icon: ICONS.list },
        ]}
      />
    </div>
  )
}
