import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine, Fulfillment, PaymentMethod } from '@/types/domain'

interface CartState {
  lines: CartLine[]
  fulfillment: Fulfillment
  paymentMethod: PaymentMethod
  address: string
  promoCode: string
  promoApplied: boolean
  roundUpDonation: boolean
  addLine: (line: Omit<CartLine, 'key'>) => void
  incLine: (key: string) => void
  decLine: (key: string) => void
  removeLine: (key: string) => void
  clear: () => void
  setFulfillment: (f: Fulfillment) => void
  setPaymentMethod: (p: PaymentMethod) => void
  setAddress: (a: string) => void
  setPromoCode: (c: string) => void
  setPromoApplied: (v: boolean) => void
  setRoundUpDonation: (v: boolean) => void
}

function lineKey(itemId: string, addOns: CartLine['addOns'], redemptionId?: number, comboDrinkId?: string) {
  if (redemptionId) return `redeemed-${redemptionId}`
  return itemId + '::' + addOns.map((a) => a.label).sort().join(',') + (comboDrinkId ? `::combo-${comboDrinkId}` : '')
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      fulfillment: 'pickup',
      paymentMethod: 'cash',
      address: '',
      promoCode: '',
      promoApplied: false,
      roundUpDonation: false,

      addLine: (line) =>
        set((state) => {
          const key = lineKey(line.itemId, line.addOns, line.redemptionId, line.combo?.drinkItemId)
          if (line.redemptionId) {
            // a reward redemption is single-use -- never merges, always qty 1
            return { lines: [...state.lines, { ...line, qty: 1, key }] }
          }
          const existing = state.lines.find((l) => l.key === key)
          if (existing) {
            return {
              lines: state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)),
            }
          }
          return { lines: [...state.lines, { ...line, key }] }
        }),

      incLine: (key) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.key === key && !l.redemptionId ? { ...l, qty: l.qty + 1 } : l)),
        })),

      decLine: (key) =>
        set((state) => ({
          lines: state.lines.flatMap((l) => {
            if (l.key !== key) return [l]
            return l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }]
          }),
        })),

      removeLine: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      clear: () => set({ lines: [], promoCode: '', promoApplied: false, roundUpDonation: false }),

      setFulfillment: (f) => set({ fulfillment: f }),
      setPaymentMethod: (p) => set({ paymentMethod: p }),
      setAddress: (a) => set({ address: a }),
      setPromoCode: (c) => set({ promoCode: c }),
      setPromoApplied: (v) => set({ promoApplied: v }),
      setRoundUpDonation: (v) => set({ roundUpDonation: v }),
    }),
    { name: 'chez-sanji-cart-v1' },
  ),
)

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
}
