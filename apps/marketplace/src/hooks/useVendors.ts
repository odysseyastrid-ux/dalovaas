import { supabase } from '@/lib/supabaseClient'
import { useRealtimeQuery } from './useRealtimeQuery'
import type { Vendor } from '@/types/domain'

/** Public browse list: every active vendor. */
export function useActiveVendors() {
  return useRealtimeQuery<Vendor>(
    async () => {
      const { data } = await supabase.from('mk_vendors').select('*').eq('status', 'active').order('rating', { ascending: false })
      return (data as Vendor[]) ?? []
    },
    { table: 'mk_vendors' },
  )
}

export function useVendorById(vendorId: string | null) {
  return useRealtimeQuery<Vendor>(
    async () => {
      if (!vendorId) return []
      const { data } = await supabase.from('mk_vendors').select('*').eq('id', vendorId).maybeSingle()
      return data ? [data as Vendor] : []
    },
    { table: 'mk_vendors', filter: vendorId ? `id=eq.${vendorId}` : undefined, enabled: !!vendorId },
  )
}

/** Admin-only: every vendor regardless of status. */
export function useAllVendors() {
  return useRealtimeQuery<Vendor>(
    async () => {
      const { data } = await supabase.from('mk_vendors').select('*').order('created_at', { ascending: false })
      return (data as Vendor[]) ?? []
    },
    { table: 'mk_vendors' },
  )
}
