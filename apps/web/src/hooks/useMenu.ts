import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { MenuItem, Reward } from '@/types/domain'

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

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
      .channel('menu_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { items, loading, reload }
}

export function useAllMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true })
    setItems((data as MenuItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel('menu_items_admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { items, loading, reload }
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
