import { useStaffMeals } from '@/hooks/useTimeClock'
import { formatFCFA } from '@/lib/format'
import type { Employee } from '@/types/domain'

/**
 * Manager-facing log of today's staff meals. Deliberately separate from
 * PayrollPanel -- this is a food benefit, not hours or wages, and must
 * never factor into the pay calculation.
 */
export function StaffMealsPanel({ employees }: { employees: Employee[] }) {
  const { meals, loading } = useStaffMeals()
  const nameFor = (id: string) => employees.find((e) => e.id === id)?.name ?? '—'

  const totalOwed = meals.reduce((sum, m) => sum + m.paid_price, 0)
  const freeCount = meals.filter((m) => m.discount_percent === 100).length
  const halfCount = meals.filter((m) => m.discount_percent === 50).length

  return (
    <div>
      <div className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold">Repas staff</div>
      <div className="mb-4 text-xs text-[var(--color-ink)]/60">
        1er repas de pause gratuit, 2ème à -50% — un avantage staff, distinct de la paie.
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Gratuits</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-2xl font-extrabold">{freeCount}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">-50%</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-2xl font-extrabold">{halfCount}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Total dû (caisse)</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-xl font-extrabold">{formatFCFA(totalOwed)}</div>
        </div>
      </div>

      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      {!loading && meals.length === 0 && <div className="text-sm text-[var(--color-ink)]/50">Aucun repas staff aujourd'hui.</div>}

      <div className="flex flex-col gap-2">
        {meals.map((meal) => (
          <div key={meal.id} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] bg-white p-3.5 text-sm">
            <div>
              <span className="font-bold">{nameFor(meal.employee_id)}</span> · {meal.item_name}
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-[var(--color-accent-700)]">
                {meal.discount_percent === 100 ? 'Gratuit' : meal.discount_percent === 50 ? '-50%' : 'Plein tarif'}
              </div>
              <div className="text-[var(--color-ink)]/60">
                {meal.discount_percent > 0 && <span className="line-through">{formatFCFA(meal.original_price)} </span>}
                {formatFCFA(meal.paid_price)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
