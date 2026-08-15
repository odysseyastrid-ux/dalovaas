import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface PromoSlide {
  image_url: string
  sort_order: number
}

export interface PaymentAccount {
  number: string
  name: string
  ussd: string
}

export interface AppSettings {
  logo_url: string | null
  promo_slides: PromoSlide[]
  onboarding_images: Record<string, string>
  payment_icons: Record<string, string>
  payment_orange_money: PaymentAccount
  payment_mtn_momo: PaymentAccount
}

const DEFAULTS: AppSettings = {
  logo_url: null,
  promo_slides: [],
  onboarding_images: {},
  payment_icons: {},
  payment_orange_money: { number: '', name: '', ussd: '#150#' },
  payment_mtn_momo: { number: '', name: '', ussd: '*126#' },
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)

  const reload = async () => {
    const { data } = await supabase.from('app_settings').select('key, value')
    if (!data) return
    const next = { ...DEFAULTS }
    for (const row of data) {
      ;(next as unknown as Record<string, unknown>)[row.key] = row.value
    }
    setSettings(next)
  }

  useEffect(() => {
    reload()
    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { settings, reload }
}
