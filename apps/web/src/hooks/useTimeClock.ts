import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Employee, OvertimeRequest, ShiftBreak, StaffMeal, TimeEntry } from '@/types/domain'

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Staff-only: employee roster + recent clock in/out entries, realtime.
 * Fetches a generous 14-day window so both the live "today" view and the
 * payroll calculation (whose period may span a few days) can share one
 * subscription instead of each hook polling separately.
 */
export function useTimeClock() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [breaks, setBreaks] = useState<ShiftBreak[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [{ data: emps }, { data: ents }] = await Promise.all([
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase.from('time_entries').select('*').gte('clock_in', daysAgoISO(14)).order('clock_in', { ascending: false }),
      ])
      const entryIds = ((ents as TimeEntry[]) ?? []).map((e) => e.id)
      const { data: brks } = entryIds.length
        ? await supabase.from('shift_breaks').select('*').in('time_entry_id', entryIds)
        : { data: [] }
      if (!cancelled) {
        setEmployees((emps as Employee[]) ?? [])
        setEntries((ents as TimeEntry[]) ?? [])
        setBreaks((brks as ShiftBreak[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`time_clock_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_breaks' }, () => load())
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

  return { employees, entries, breaks, loading }
}

/** Staff-only: overtime alerts + manual overtime requests, realtime. */
export function useOvertimeRequests() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase.from('overtime_requests').select('*').order('created_at', { ascending: false })
      if (!cancelled) {
        setRequests((data as OvertimeRequest[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`overtime_requests_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, () => load())
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

  return { requests, loading }
}

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Staff-only: today's staff meal orders (break benefit), realtime. Kept
 * separate from payroll on purpose -- these are food comped/discounted to
 * staff, not hours or wages.
 */
export function useStaffMeals() {
  const [meals, setMeals] = useState<StaffMeal[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data } = await supabase
        .from('staff_meals')
        .select('*')
        .gte('created_at', startOfTodayISO())
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setMeals((data as StaffMeal[]) ?? [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`staff_meals_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_meals' }, () => load())
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

  return { meals, loading }
}
