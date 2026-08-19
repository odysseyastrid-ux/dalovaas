import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Account } from '@/types/domain'

/** Staff-only: every customer account, realtime (RLS allows staff to read all rows). */
export function useAllAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })
      if (!cancelled) {
        setAccounts((data as Account[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`all_accounts_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => load())
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
  }, [instanceId])

  return { accounts, loading }
}
