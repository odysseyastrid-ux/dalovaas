import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Account, StaffMember } from '@/types/domain'

interface AuthState {
  session: Session | null
  account: Account | null
  staff: StaffMember | null
  loading: boolean
  initialized: boolean
  init: () => void
  refreshAccount: () => Promise<void>
  refreshStaff: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  account: null,
  staff: null,
  loading: true,
  initialized: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false })
      if (data.session) {
        get().refreshAccount()
        get().refreshStaff()
      }
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false })
      if (session) {
        get().refreshAccount()
        get().refreshStaff()
      } else {
        set({ account: null, staff: null })
      }
    })
  },

  refreshAccount: async () => {
    const uid = get().session?.user?.id
    if (!uid) return
    const { data } = await supabase.from('accounts').select('*').eq('id', uid).maybeSingle()
    if (data) set({ account: data as Account })
  },

  refreshStaff: async () => {
    const uid = get().session?.user?.id
    if (!uid) return
    const { data } = await supabase.from('staff').select('id, name, role, active').eq('id', uid).maybeSingle()
    set({ staff: (data as StaffMember) ?? null })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, account: null, staff: null })
  },
}))
