import { NavLink, Navigate, Routes, Route, useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useAuthStore } from '@/state/authStore'
import { StaffLogin } from './StaffLogin'
import { OrdersBoard } from './OrdersBoard'
import { MenuManager } from './MenuManager'
import { Reports } from './Reports'
import { StaffManager } from './StaffManager'
import clsx from 'clsx'

export function StaffApp() {
  const { t } = useI18n()
  const session = useAuthStore((s) => s.session)
  const staff = useAuthStore((s) => s.staff)
  const loading = useAuthStore((s) => s.loading)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-ink)]/50">…</div>

  if (!session) return <StaffLogin />

  if (!staff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-sm text-[var(--color-ink)]/70">
          This account has no staff role. Ask a manager to invite you from the Staff tab.
        </div>
        <button onClick={signOut} className="text-sm underline">
          {t.logout}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] bg-white px-6 py-4">
        <div className="font-[var(--font-heading)] text-lg font-extrabold">Chez Sanji — Dashboard</div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-ink)]/60">
            {staff.name} · {staff.role}
          </span>
          <button
            onClick={async () => {
              await signOut()
              navigate('/staff')
            }}
            className="text-xs underline"
          >
            {t.logout}
          </button>
        </div>
      </div>
      <div className="flex gap-1 border-b border-[var(--color-divider)] bg-white px-6">
        {[
          { to: '/staff', label: t.staffOrdersBoard, end: true },
          { to: '/staff/menu', label: t.manageMenu },
          { to: '/staff/reports', label: 'Reports' },
          ...(staff.role === 'manager' ? [{ to: '/staff/team', label: 'Staff' }] : []),
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              clsx(
                'border-b-2 px-3 py-3 text-sm font-medium',
                isActive ? 'border-[var(--color-accent)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink)]/50',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <div className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<OrdersBoard />} />
          <Route path="/menu" element={<MenuManager canEdit={staff.role === 'manager'} />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/team" element={staff.role === 'manager' ? <StaffManager /> : <Navigate to="/staff" replace />} />
          <Route path="*" element={<Navigate to="/staff" replace />} />
        </Routes>
      </div>
    </div>
  )
}
