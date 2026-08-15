import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { I18nProvider } from '@/i18n/I18nContext'
import { useAuthStore } from '@/state/authStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CustomerApp } from '@/customer/CustomerApp'
import { StaffApp } from '@/staff/StaffApp'

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  return (
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/staff/*" element={<StaffApp />} />
            <Route path="/*" element={<CustomerApp />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  )
}
