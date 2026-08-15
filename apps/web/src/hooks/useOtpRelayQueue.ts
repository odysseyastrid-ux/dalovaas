import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface OtpRelayRow {
  id: number
  phone: string
  code: string
  sent: boolean
  created_at: string
}

export function useOtpRelayQueue() {
  const [rows, setRows] = useState<OtpRelayRow[]>([])
  // Supabase realtime channels are keyed by name at the client level -- two
  // hook instances mounted at once (e.g. a header banner + a page panel
  // both showing this queue) would otherwise fight over the same channel
  // name and crash with "cannot add postgres_changes callbacks after
  // subscribe()". useId() keeps every mount's channel unique.
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('otp_relay_queue')
        .select('*')
        .eq('sent', false)
        .order('created_at', { ascending: false })
      if (!cancelled) setRows((data as OtpRelayRow[]) ?? [])
    }
    load()

    const channel = supabase
      .channel(`otp_relay_queue_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'otp_relay_queue' }, () => load())
      // Fires on first connect AND every reconnect (e.g. after flaky fair
      // wifi drops the websocket) -- refetching here means a missed event
      // during the outage can't leave the dashboard silently stale.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return rows
}
