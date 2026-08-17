import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { BottomTabs } from '@/components/BottomTabs'
import { useAuthStore } from '@/state/authStore'
import { SplashScreen } from './screens/SplashScreen'
import { PhoneLoginScreen } from './screens/PhoneLoginScreen'
import { VerifyCodeScreen } from './screens/VerifyCodeScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ItemDetailScreen } from './screens/ItemDetailScreen'
import { CartScreen } from './screens/CartScreen'
import { CheckoutScreen } from './screens/CheckoutScreen'
import { TrackingScreen } from './screens/TrackingScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { AccountScreen } from './screens/AccountScreen'
import { OrderHistoryScreen } from './screens/account/OrderHistoryScreen'
import { ProfileScreen } from './screens/account/ProfileScreen'
import { PaymentMethodsScreen } from './screens/account/PaymentMethodsScreen'
import { AddressesScreen } from './screens/account/AddressesScreen'
import { NotificationsScreen } from './screens/account/NotificationsScreen'
import { HelpScreen } from './screens/account/HelpScreen'
import { AboutScreen } from './screens/account/AboutScreen'

const TAB_PATHS = new Set(['/', '/rewards', '/cart', '/account'])
const ONBOARDED_KEY = 'chez-sanji-onboarded'

export type PendingLogin = { mode: 'email'; email: string } | { mode: 'phone'; phone: string }

export function CustomerApp() {
  const session = useAuthStore((s) => s.session)
  const authLoading = useAuthStore((s) => s.loading)
  const location = useLocation()

  // The splash screen (logo + slogan) is shown on every fresh load, not
  // just the first-ever visit -- it's brand presentation, not a one-time
  // tutorial, so it isn't persisted like onboarding is.
  const [entered, setEntered] = useState(false)
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1')
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null)

  useEffect(() => {
    if (session) setOnboarded((prev) => prev)
  }, [session])

  if (authLoading) {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink)]/50">…</div>
      </AppShell>
    )
  }

  if (!entered) {
    return (
      <AppShell>
        <SplashScreen onEnter={() => setEntered(true)} />
      </AppShell>
    )
  }

  if (!onboarded) {
    return (
      <AppShell>
        <OnboardingScreen
          onDone={() => {
            localStorage.setItem(ONBOARDED_KEY, '1')
            setOnboarded(true)
          }}
        />
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell>
        {pendingLogin ? (
          <VerifyCodeScreen pending={pendingLogin} onBack={() => setPendingLogin(null)} />
        ) : (
          <PhoneLoginScreen onCodeSent={(pending) => setPendingLogin(pending)} />
        )}
      </AppShell>
    )
  }

  const showTabs = TAB_PATHS.has(location.pathname)

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/item/:id" element={<ItemDetailScreen />} />
          <Route path="/cart" element={<CartScreen />} />
          <Route path="/checkout" element={<CheckoutScreen />} />
          <Route path="/tracking/:ref" element={<TrackingScreen />} />
          <Route path="/rewards" element={<RewardsScreen />} />
          <Route path="/account" element={<AccountScreen />} />
          <Route path="/account/profile" element={<ProfileScreen />} />
          <Route path="/account/history" element={<OrderHistoryScreen />} />
          <Route path="/account/payment" element={<PaymentMethodsScreen />} />
          <Route path="/account/addresses" element={<AddressesScreen />} />
          <Route path="/account/notifications" element={<NotificationsScreen />} />
          <Route path="/account/help" element={<HelpScreen />} />
          <Route path="/account/about" element={<AboutScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showTabs && <BottomTabs />}
    </AppShell>
  )
}
