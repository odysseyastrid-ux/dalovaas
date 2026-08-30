import { useState } from 'react'
import { useMenu } from '@/hooks/useMenu'
import { useStaffMeals } from '@/hooks/useTimeClock'
import { supabase } from '@/lib/supabaseClient'
import { formatFCFA } from '@/lib/format'
import { useToastStore } from '@/state/toastStore'
import type { Employee } from '@/types/domain'

function discountFor(position: number) {
  // position is 0-based rank among today's meals, including ones already ordered.
  if (position === 0) return 100
  if (position === 1) return 50
  return 0
}

/** Inline picker shown next to an on-break employee to order their break meal(s). */
export function StaffMealPicker({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { items } = useMenu()
  const { meals } = useStaffMeals()
  const showToast = useToastStore((s) => s.show)
  const [selected, setSelected] = useState<string[]>([])
  const [placing, setPlacing] = useState(false)

  const mealsToday = meals.filter((m) => m.employee_id === employee.id).length

  const toggle = (itemId: string) => {
    setSelected((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const order = async () => {
    if (selected.length === 0) return
    setPlacing(true)
    const { error } = await supabase.rpc('order_staff_meal', { p_employee_id: employee.id, p_item_ids: selected })
    setPlacing(false)
    if (error) {
      showToast(error.message)
      return
    }
    showToast(selected.length > 1 ? 'Repas commandés' : 'Repas commandé')
    onClose()
  }

  return (
    <div className="mt-2 w-full rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface)] p-3">
      <div className="mb-2 text-xs font-bold">
        Repas de {employee.name} · {mealsToday === 0 ? '1er gratuit, 2e -50%' : mealsToday === 1 ? 'prochain à -50%' : 'plein tarif désormais'}
      </div>
      <div className="mb-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const checked = selected.includes(item.id)
          const position = mealsToday + selected.indexOf(item.id)
          const discount = checked ? discountFor(position) : null
          return (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                item.out_of_stock ? 'opacity-40' : ''
              } ${checked ? 'border-[var(--color-accent)] bg-white' : 'border-transparent'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={item.out_of_stock}
                  onChange={() => toggle(item.id)}
                  className="h-3.5 w-3.5"
                />
                {item.name}
              </span>
              <span className="text-[var(--color-ink)]/60">
                {checked && discount !== null && discount > 0 ? (
                  <span className="font-bold text-[var(--color-accent-700)]">{discount === 100 ? 'Gratuit' : '-50%'}</span>
                ) : (
                  formatFCFA(item.price)
                )}
                {item.out_of_stock && ' (rupture)'}
              </span>
            </label>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={order}
          disabled={selected.length === 0 || placing}
          className="flex-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold disabled:opacity-40"
        >
          {placing ? '…' : `Commander${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
        <button onClick={onClose} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
          Annuler
        </button>
      </div>
    </div>
  )
}
