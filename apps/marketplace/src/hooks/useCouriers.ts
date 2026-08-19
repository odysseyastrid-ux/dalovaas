import { supabase } from '@/lib/supabaseClient'
import { useRealtimeQuery } from './useRealtimeQuery'
import type { Courier } from '@/types/domain'

/** Admin-only: RLS restricts mk_couriers to own row + admin, so this only
 * ever resolves rows for a signed-in admin. */
export function useAllCouriers(enabled: boolean) {
  return useRealtimeQuery<Courier>(
    async () => {
      const { data } = await supabase.from('mk_couriers').select('*').order('created_at', { ascending: false })
      return (data as Courier[]) ?? []
    },
    { table: 'mk_couriers', enabled },
  )
}
