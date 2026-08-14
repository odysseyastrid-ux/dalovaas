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
}

function lineKey(itemId: string, addOns: CartLine['addOns']) {
  return itemId + '::' + addOns.map((a) => a.label).sort().join(',')
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

      addLine: (line) =>
        set((state) => {
          const key = lineKey(line.itemId, line.addOns)
          const existing = state.lines.find((l) => l.key === key)
          if (existing) {
            return {
              lines: state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)),
            }
          }
          return { lines: [...state.lines, { ...line, key }] }
        }),

      incLine: (key) =>
        set((state) => ({ lines: state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) })),

      decLine: (key) =>
        set((state) => ({
          lines: state.lines.flatMap((l) => {
            if (l.key !== key) return [l]
            return l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }]
          }),
        })),

      removeLine: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      clear: () => set({ lines: [], promoCode: '', promoApplied: false }),

      setFulfillment: (f) => set({ fulfillment: f }),
      setPaymentMethod: (p) => set({ paymentMethod: p }),
      setAddress: (a) => set({ address: a }),
      setPromoCode: (c) => set({ promoCode: c }),
      setPromoApplied: (v) => set({ promoApplied: v }),
    }),
    { name: 'chez-sanji-cart-v1' },
  ),
)

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
}
