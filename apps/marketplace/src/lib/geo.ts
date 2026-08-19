import type { DeliveryOption } from '@/types/domain'

/** Mirrors the haversine distance used server-side in mk_create_order —
 * this is only ever a client-side preview; the authoritative fee is always
 * recomputed in the database. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Mirrors the fee formula in mk_create_order — a preview only. */
export function estimateDeliveryFee(option: DeliveryOption, distanceKm: number | null): number {
  const d = distanceKm ?? 6
  if (option === 'priority') return d <= 5 ? 1000 : 2000
  return Math.min(1800, Math.max(500, Math.round((300 + d * 120) / 50) * 50))
}
