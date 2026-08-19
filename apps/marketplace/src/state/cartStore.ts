import { create } from 'zustand'
import type { CartLine, MenuItem } from '@/types/domain'

interface CartState {
  vendorId: string | null
  vendorName: string | null
  lines: CartLine[]
  addItem: (item: MenuItem, vendorName: string) => void
  incrementQty: (itemId: string) => void
  decrementQty: (itemId: string) => void
  removeItem: (itemId: string) => void
  clear: () => void
  subtotal: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  vendorId: null,
  vendorName: null,
  lines: [],

  addItem: (item, vendorName) => {
    const state = get()
    // Marketplace carts hold a single vendor's items at a time — switching
    // vendors starts a fresh cart, mirroring how every food-delivery app works.
    if (state.vendorId && state.vendorId !== item.vendor_id) {
      set({ vendorId: item.vendor_id, vendorName, lines: [{ item, qty: 1 }] })
      return
    }
    const existing = state.lines.find((l) => l.item.id === item.id)
    if (existing) {
      set({
        vendorId: item.vendor_id,
        vendorName,
        lines: state.lines.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l)),
      })
    } else {
      set({ vendorId: item.vendor_id, vendorName, lines: [...state.lines, { item, qty: 1 }] })
    }
  },

  incrementQty: (itemId) =>
    set((state) => ({ lines: state.lines.map((l) => (l.item.id === itemId ? { ...l, qty: l.qty + 1 } : l)) })),

  decrementQty: (itemId) =>
    set((state) => {
      const lines = state.lines
        .map((l) => (l.item.id === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
      return { lines, vendorId: lines.length ? state.vendorId : null, vendorName: lines.length ? state.vendorName : null }
    }),

  removeItem: (itemId) =>
    set((state) => {
      const lines = state.lines.filter((l) => l.item.id !== itemId)
      return { lines, vendorId: lines.length ? state.vendorId : null, vendorName: lines.length ? state.vendorName : null }
    }),

  clear: () => set({ vendorId: null, vendorName: null, lines: [] }),

  subtotal: () => get().lines.reduce((sum, l) => sum + l.item.price * l.qty, 0),
  itemCount: () => get().lines.reduce((sum, l) => sum + l.qty, 0),
}))
