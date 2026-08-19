import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { AppRole, Courier, MkCustomer, Vendor } from '@/types/domain'

interface AuthState {
  session: Session | null
  role: AppRole
  customer: MkCustomer | null
  vendor: Vendor | null
  courier: Courier | null
  isAdmin: boolean
  loading: boolean
  initialized: boolean
  init: () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  role: null,
  customer: null,
  vendor: null,
  courier: null,
  isAdmin: false,
  loading: true,
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    supabase.auth
      .getSession()
      .then(({ data }) => {
        set({ session: data.session, loading: false })
        if (data.session) get().refreshProfile()
      })
      .catch(() => set({ loading: false }))

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false })
      if (session) {
        get().refreshProfile()
      } else {
        set({ role: null, customer: null, vendor: null, courier: null, isAdmin: false })
      }
    })
  },

  refreshProfile: async () => {
    const uid = get().session?.user?.id
    if (!uid) return

    const [adminRes, vendorRes, courierRes, customerRes] = await Promise.all([
      supabase.from('mk_admins').select('id').eq('id', uid).maybeSingle(),
      supabase.from('mk_vendors').select('*').eq('owner_id', uid).maybeSingle(),
      supabase.from('mk_couriers').select('*').eq('id', uid).maybeSingle(),
      supabase.from('mk_customers').select('*').eq('id', uid).maybeSingle(),
    ])

    const isAdmin = !!adminRes.data
    const vendor = (vendorRes.data as Vendor) ?? null
    const courier = (courierRes.data as Courier) ?? null
    const customer = (customerRes.data as MkCustomer) ?? null

    let role: AppRole = null
    if (isAdmin) role = 'admin'
    else if (vendor) role = 'vendor'
    else if (courier) role = 'courier'
    else if (customer) role = 'customer'

    set({ isAdmin, vendor, courier, customer, role })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, role: null, customer: null, vendor: null, courier: null, isAdmin: false })
  },
}))
