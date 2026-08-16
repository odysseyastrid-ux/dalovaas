import { useEffect, useId, useState } from 'react'
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

export interface HourlyRates {
  bar: number
  counter: number
  kitchen: number
  dressing: number
  service: number
}

export interface VenueLocation {
  lat: number
  lng: number
}

export interface AppSettings {
  logo_url: string | null
  promo_slides: PromoSlide[]
  onboarding_images: Record<string, string>
  payment_icons: Record<string, string>
  payment_orange_money: PaymentAccount
  payment_mtn_momo: PaymentAccount
  charity_logo_url: string | null
  hourly_rates: HourlyRates
  payroll_period_start: string
  overtime_threshold_hours: number
  overtime_alerts_enabled: boolean
  require_gps_checkin: boolean
  venue_location: VenueLocation | null
  manager_pin: string
  owner_pin: string
  company_email: string
}

const DEFAULTS: AppSettings = {
  logo_url: null,
  promo_slides: [],
  onboarding_images: {},
  payment_icons: {},
  payment_orange_money: { number: '', name: '', ussd: '#150#' },
  payment_mtn_momo: { number: '', name: '', ussd: '*126#' },
  charity_logo_url: null,
  hourly_rates: { bar: 700, counter: 700, kitchen: 700, dressing: 700, service: 500 },
  payroll_period_start: new Date().toISOString(),
  overtime_threshold_hours: 40,
  overtime_alerts_enabled: true,
  require_gps_checkin: false,
  venue_location: null,
  manager_pin: '4821',
  owner_pin: '1910',
  company_email: '',
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const instanceId = useId()

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
      .channel(`app_settings_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => reload())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') reload()
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId])

  return { settings, reload }
}
