import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Employee, TimeEntry } from '@/types/domain'

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Staff-only: employee roster + today's clock in/out entries, realtime. */
export function useTimeClock() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [{ data: emps }, { data: ents }] = await Promise.all([
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase.from('time_entries').select('*').gte('clock_in', startOfTodayISO()).order('clock_in', { ascending: false }),
      ])
      if (!cancelled) {
        setEmployees((emps as Employee[]) ?? [])
        setEntries((ents as TimeEntry[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`time_clock_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => load())
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

  return { employees, entries, loading }
}
