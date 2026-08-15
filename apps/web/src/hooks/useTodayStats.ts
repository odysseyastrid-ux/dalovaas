import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface TodayStats {
  orderCount: number
  revenue: number
}

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Staff-only: today's order count + revenue (validated/non-pending orders only). */
export function useTodayStats() {
  const [stats, setStats] = useState<TodayStats>({ orderCount: 0, revenue: 0 })
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('total, pending_validation')
        .gte('created_at', startOfTodayISO())
      if (!cancelled && data) {
        const validated = data.filter((o) => !o.pending_validation)
        setStats({
          orderCount: data.length,
          revenue: validated.reduce((sum, o) => sum + o.total, 0),
        })
      }
    }
    load()

    const channel = supabase
      .channel(`today_stats_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return stats
}
