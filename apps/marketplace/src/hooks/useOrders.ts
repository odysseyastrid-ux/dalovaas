import { supabase } from '@/lib/supabaseClient'
import { useRealtimeQuery } from './useRealtimeQuery'
import type { MkOrder } from '@/types/domain'

export function useOrderByRef(ref: string | null) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      if (!ref) return []
      const { data } = await supabase.from('mk_orders').select('*').eq('ref', ref).maybeSingle()
      return data ? [data as MkOrder] : []
    },
    { table: 'mk_orders', filter: ref ? `ref=eq.${ref}` : undefined, enabled: !!ref },
  )
}

export function useMyOrders(customerId: string | null) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      if (!customerId) return []
      const { data } = await supabase
        .from('mk_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      return (data as MkOrder[]) ?? []
    },
    { table: 'mk_orders', filter: customerId ? `customer_id=eq.${customerId}` : undefined, enabled: !!customerId },
  )
}

/** Vendor dashboard: every order for this vendor. */
export function useVendorOrders(vendorId: string | null) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      if (!vendorId) return []
      const { data } = await supabase
        .from('mk_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
      return (data as MkOrder[]) ?? []
    },
    { table: 'mk_orders', filter: vendorId ? `vendor_id=eq.${vendorId}` : undefined, enabled: !!vendorId },
  )
}

/** Courier pool: unassigned orders ready for pickup, across every vendor. */
export function useAvailableDeliveries(enabled: boolean) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      const { data } = await supabase
        .from('mk_orders')
        .select('*')
        .eq('status', 'ready_for_pickup')
        .is('courier_id', null)
        .order('ready_at', { ascending: true })
      return (data as MkOrder[]) ?? []
    },
    { table: 'mk_orders', enabled },
  )
}

/** Courier's own deliveries (claimed, in transit, or delivered). */
export function useCourierDeliveries(courierId: string | null) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      if (!courierId) return []
      const { data } = await supabase
        .from('mk_orders')
        .select('*')
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false })
      return (data as MkOrder[]) ?? []
    },
    { table: 'mk_orders', filter: courierId ? `courier_id=eq.${courierId}` : undefined, enabled: !!courierId },
  )
}

/** Admin: full order book. */
export function useAllOrders(enabled: boolean) {
  return useRealtimeQuery<MkOrder>(
    async () => {
      const { data } = await supabase.from('mk_orders').select('*').order('created_at', { ascending: false }).limit(300)
      return (data as MkOrder[]) ?? []
    },
    { table: 'mk_orders', enabled },
  )
}
