import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Order } from '@/types/domain'

/** Realtime-subscribed single order, looked up by ref. Drives the customer tracking screen. */
export function useOrderByRef(ref: string | null) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ref) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    supabase
      .from('orders')
      .select('*')
      .eq('ref', ref)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setOrder(data as Order | null)
          setLoading(false)
        }
      })

    const channel = supabase
      .channel(`order_${ref}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `ref=eq.${ref}` },
        (payload) => {
          if (payload.eventType === 'DELETE') setOrder(null)
          else setOrder(payload.new as Order)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [ref])

  return { order, loading }
}

/** Realtime-subscribed customer order history. */
export function useMyOrders(customerId: string | null) {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (!customerId) return
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (!cancelled) setOrders((data as Order[]) ?? [])
    }
    load()

    const channel = supabase
      .channel(`my_orders_${customerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` },
        () => load(),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [customerId])

  return orders
}

/** Staff-only: every active order, realtime. */
export function useActiveOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setOrders((data as Order[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`active_orders_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { orders, loading }
}

/** Staff-only: full order history for reporting/export. */
export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? [])
        setLoading(false)
      })
  }, [])

  return { orders, loading }
}
