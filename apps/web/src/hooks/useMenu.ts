import { useEffect, useId, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AddOn, MenuCategory, MenuItem, Reward } from '@/types/domain'

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  const reload = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('deleted', false)
      .order('sort_order', { ascending: true })
    setItems((data as MenuItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`menu_items_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { items, loading, reload }
}

export function useAllMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  const reload = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true })
    setItems((data as MenuItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`menu_items_admin_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { items, loading, reload }
}

/** Staff-only: add-ons are shared per category, one row per category, realtime. */
export function useCategoryAddOns() {
  const [byCategory, setByCategory] = useState<Record<string, AddOn[]>>({})
  const [loading, setLoading] = useState(true)
  const instanceId = useId()

  const reload = async () => {
    const { data } = await supabase.from('category_add_ons').select('cat, add_ons')
    const next: Record<string, AddOn[]> = {}
    for (const row of (data as { cat: MenuCategory; add_ons: AddOn[] }[]) ?? []) {
      next[row.cat] = row.add_ons
    }
    setByCategory(next)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel(`category_add_ons_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_add_ons' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { byCategory, loading, reload }
}

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([])

  useEffect(() => {
    supabase
      .from('rewards')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setRewards((data as Reward[]) ?? []))
  }, [])

  return rewards
}
