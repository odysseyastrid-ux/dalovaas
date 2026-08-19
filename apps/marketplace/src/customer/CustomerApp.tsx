import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomTabs, ICONS } from '@/components/BottomTabs'
import { useCartStore } from '@/state/cartStore'
import { VendorList } from './VendorList'
import { VendorMenu } from './VendorMenu'
import { Cart } from './Cart'
import { Checkout } from './Checkout'
import { OrderTracking } from './OrderTracking'
import { OrderHistory } from './OrderHistory'
import { Account } from './Account'

export function CustomerApp() {
  const cartCount = useCartStore((s) => s.itemCount())
  const location = useLocation()
  const hideTabs = location.pathname.includes('/checkout') || location.pathname.includes('/vendor/')

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route index element={<VendorList />} />
          <Route path="vendor/:vendorId" element={<VendorMenu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:ref" element={<OrderTracking />} />
          <Route path="account" element={<Account />} />
        </Routes>
      </div>
      {!hideTabs && (
        <BottomTabs
          tabs={[
            { to: '/customer', end: true, label: 'Restaurants', icon: ICONS.store },
            { to: '/customer/cart', label: 'Panier', icon: ICONS.cart, badge: cartCount },
            { to: '/customer/orders', label: 'Commandes', icon: ICONS.list },
            { to: '/customer/account', label: 'Compte', icon: ICONS.account },
          ]}
        />
      )}
    </div>
  )
}
