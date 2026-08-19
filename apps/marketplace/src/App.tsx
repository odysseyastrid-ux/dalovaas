import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { Toast } from '@/components/Toast'
import { Landing } from '@/auth/Landing'
import { CustomerAuth } from '@/auth/CustomerAuth'
import { PartnerAuth } from '@/auth/PartnerAuth'
import { CourierAuth } from '@/auth/CourierAuth'
import { AdminAuth } from '@/auth/AdminAuth'
import { PendingVendor } from '@/vendor/PendingVendor'
import { CustomerApp } from '@/customer/CustomerApp'
import { VendorApp } from '@/vendor/VendorApp'
import { CourierApp } from '@/courier/CourierApp'
import { AdminApp } from '@/admin/AdminApp'

function roleHome(role: ReturnType<typeof useAuthStore.getState>['role']) {
  if (role === 'customer') return '/customer'
  if (role === 'vendor') return '/vendor'
  if (role === 'courier') return '/courier'
  if (role === 'admin') return '/admin'
  return null
}

/** Once a session resolves to a known role, bounce away from the public
 * landing/auth screens straight into that role's app. */
function AuthRedirect() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const vendor = useAuthStore((s) => s.vendor)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading || !session) return
    const onAuthOrPublicRoute = location.pathname === '/' || location.pathname.startsWith('/auth')
    if (!onAuthOrPublicRoute) return

    const home = roleHome(role)
    if (home) navigate(home, { replace: true })
    else if (vendor) navigate('/vendor', { replace: true })
  }, [loading, session, role, vendor, location.pathname, navigate])

  return null
}

function RequireRole({ role, children }: { role: 'customer' | 'vendor' | 'courier' | 'admin'; children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const currentRole = useAuthStore((s) => s.role)
  const vendor = useAuthStore((s) => s.vendor)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/" replace />
  if (role === 'vendor' && vendor && vendor.status !== 'active') return <PendingVendor />
  if (currentRole !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)]">
      <div className="font-[var(--font-heading)] text-lg font-bold text-[var(--color-accent-700)]">Dalovaas…</div>
    </div>
  )
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    init()
  }, [init])

  if (loading) return <FullScreenLoader />

  return (
    <>
      <AuthRedirect />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/client" element={<CustomerAuth />} />
        <Route path="/auth/partenaire" element={<PartnerAuth />} />
        <Route path="/auth/livreur" element={<CourierAuth />} />
        <Route path="/auth/admin" element={<AdminAuth />} />

        <Route
          path="/customer/*"
          element={
            <RequireRole role="customer">
              <CustomerApp />
            </RequireRole>
          }
        />
        <Route
          path="/vendor/*"
          element={
            <RequireRole role="vendor">
              <VendorApp />
            </RequireRole>
          }
        />
        <Route
          path="/courier/*"
          element={
            <RequireRole role="courier">
              <CourierApp />
            </RequireRole>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RequireRole role="admin">
              <AdminApp />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
