import { useEffect, useState } from 'react'
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
      .channel('otp_relay_queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'otp_relay_queue' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return rows
}
