// Average moto/foot courier speed through fair crowds and city traffic, plus
// a fixed buffer for the staff to hand the order off once it's ready.
const AVG_SPEED_KMH = 20
const DISPATCH_BUFFER_MIN = 5

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

export function estimateTravelMinutes(distanceKm: number): number {
  return Math.round((distanceKm / AVG_SPEED_KMH) * 60) + DISPATCH_BUFFER_MIN
}
