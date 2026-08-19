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
  // Clicking a password-reset email link establishes a fully valid,
  // authenticated session (Supabase fires PASSWORD_RECOVERY) -- that's
  // required so updateUser({password}) can run, but it also means the link
  // itself grants dashboard access if nothing forces the reset step first.
  // This flag lets the staff app hold the user on the reset screen,
  // regardless of route, until they've actually set a new password.
  isRecoverySession: boolean
  clearRecoverySession: () => void
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
  isRecoverySession: false,

  clearRecoverySession: () => set({ isRecoverySession: false }),

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

    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, loading: false, ...(event === 'PASSWORD_RECOVERY' ? { isRecoverySession: true } : {}) })
      if (session) {
        get().refreshAccount()
        get().refreshStaff()
      } else {
        set({ account: null, staff: null, isRecoverySession: false })
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
