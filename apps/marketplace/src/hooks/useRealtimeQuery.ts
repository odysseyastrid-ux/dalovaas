import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Options {
  table: string
  filter?: string
  enabled?: boolean
}

/** Runs `fetcher` once, then re-runs it on every postgres_changes event for
 * `table` (optionally scoped by `filter`), on reconnect, on tab focus, and
 * on a slow poll — the same belt-and-suspenders pattern the Chez Sanji app
 * uses, since realtime alone can silently drop on a backgrounded mobile tab. */
export function useRealtimeQuery<T>(fetcher: () => Promise<T[]>, { table, filter, enabled = true }: Options) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false

    const load = async () => {
      const rows = await fetcher()
      if (!cancelled) {
        setData(rows)
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`${table}_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => load())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load()
      })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled, instanceId])

  return { data, loading }
}
