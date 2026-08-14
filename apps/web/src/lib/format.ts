export function formatFCFA(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ /g, ' ')} FCFA`
}

export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
