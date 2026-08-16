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
      .subscribe((status) => {
        // Reconnecting after a dropped connection replays no missed events,
        // so re-fetch to make sure the customer's tracking screen can't get
        // stuck on a stale status.
        if (status === 'SUBSCRIBED') {
          supabase
            .from('orders')
            .select('*')
            .eq('ref', ref)
            .maybeSingle()
            .then(({ data }) => {
              if (!cancelled) setOrder(data as Order | null)
            })
        }
      })

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

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
        .eq('deleted', false)
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
      // Refetch on every (re)connect so a dropped websocket during a flaky
      // connection can't leave the board silently missing an order.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

    // Belt-and-suspenders on top of realtime: mobile browsers routinely
    // suspend a backgrounded tab/PWA (screen lock, app switch) and can kill
    // the websocket without ever firing a reconnect the client can react
    // to. Re-fetch whenever the tab regains focus/visibility, and on a
    // short timer regardless, so the board can't get stuck needing a
    // manual page refresh.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', load)
    const pollId = setInterval(load, 20000)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', load)
      clearInterval(pollId)
    }
  }, [instanceId])

  return { orders, loading }
}

/** Staff-only: full order history for reporting/export. */
export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setOrders((data as Order[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`all_orders_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { orders, loading }
}
