import { supabase } from '@/lib/supabaseClient'
import { useRealtimeQuery } from './useRealtimeQuery'
import type { MenuItem } from '@/types/domain'

export function useMenuItems(vendorId: string | null) {
  return useRealtimeQuery<MenuItem>(
    async () => {
      if (!vendorId) return []
      const { data } = await supabase
        .from('mk_menu_items')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('deleted', false)
        .order('sort_order', { ascending: true })
      return (data as MenuItem[]) ?? []
    },
    { table: 'mk_menu_items', filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined, enabled: !!vendorId },
  )
}
