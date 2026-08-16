import { useState } from 'react'
import { useMenu } from '@/hooks/useMenu'
import { useStaffMeals } from '@/hooks/useTimeClock'
import { supabase } from '@/lib/supabaseClient'
import { formatFCFA } from '@/lib/format'
import { useToastStore } from '@/state/toastStore'
import type { Employee } from '@/types/domain'

/** Inline picker shown next to an on-break employee to order their break meal. */
export function StaffMealPicker({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { items } = useMenu()
  const { meals } = useStaffMeals()
  const showToast = useToastStore((s) => s.show)
  const [itemId, setItemId] = useState('')
  const [placing, setPlacing] = useState(false)

  const mealsToday = meals.filter((m) => m.employee_id === employee.id).length
  const nextDiscount = mealsToday === 0 ? 100 : mealsToday === 1 ? 50 : 0

  const order = async () => {
    if (!itemId) return
    setPlacing(true)
    const { error } = await supabase.rpc('order_staff_meal', { p_employee_id: employee.id, p_item_id: itemId })
    setPlacing(false)
    if (error) {
      showToast(error.message)
      return
    }
    showToast('Repas commandé')
    onClose()
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface)] p-3">
      <div className="mb-2 text-xs font-bold">
        Repas de {employee.name} —{' '}
        <span className="text-[var(--color-accent-700)]">
          {nextDiscount === 100 ? 'gratuit' : nextDiscount === 50 ? '-50%' : 'plein tarif'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="flex-1 rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-xs">
          <option value="">Choisir un plat…</option>
          {items.map((item) => (
            <option key={item.id} value={item.id} disabled={item.out_of_stock}>
              {item.name} — {formatFCFA(item.price)}
              {item.out_of_stock ? ' (rupture)' : ''}
            </option>
          ))}
        </select>
        <button onClick={order} disabled={!itemId || placing} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold disabled:opacity-40">
          {placing ? '…' : 'Commander'}
        </button>
        <button onClick={onClose} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
          Annuler
        </button>
      </div>
    </div>
  )
}
