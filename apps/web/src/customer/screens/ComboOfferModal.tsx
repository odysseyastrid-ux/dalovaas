import { formatFCFA } from '@/lib/format'
import type { MenuItem } from '@/types/domain'

/** Shown once when the customer adds a burger or poutine: offer to bundle it into a combo at -15%. */
export function ComboOfferModal({
  item,
  baseUnitPrice,
  qty,
  friesItem,
  drinkOptions,
  lang,
  onAccept,
  onDecline,
}: {
  item: MenuItem
  baseUnitPrice: number
  qty: number
  friesItem: MenuItem | null
  drinkOptions: MenuItem[]
  lang: 'fr' | 'en'
  onAccept: (drink: MenuItem) => void
  onDecline: () => void
}) {
  const isBurger = item.cat === 'burgers'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onDecline}>
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--color-bg)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold">
          {lang === 'fr' ? 'Envie d’un combo ?' : 'Make it a combo?'}
        </div>
        <div className="mb-4 text-sm text-[var(--color-ink)]/70">
          {isBurger
            ? lang === 'fr'
              ? 'Ajoutez des frites et une boisson, -15% sur le combo.'
              : 'Add fries and a drink, -15% off the combo.'
            : lang === 'fr'
              ? 'Ajoutez une boisson, -15% sur le combo.'
              : 'Add a drink, -15% off the combo.'}
        </div>
        <div className="mb-4 flex flex-col gap-2">
          {drinkOptions.map((drink) => {
            const bundleTotal = (baseUnitPrice + (isBurger ? friesItem?.price ?? 0 : 0) + drink.price) * qty
            const total = bundleTotal - Math.round(bundleTotal * 0.15)
            return (
              <button
                key={drink.id}
                onClick={() => onAccept(drink)}
                className="flex items-center justify-between rounded-xl border-2 border-[var(--color-ink)] px-4 py-3 text-left"
              >
                <span className="text-sm font-bold">
                  {isBurger ? (lang === 'fr' ? 'Frites + ' : 'Fries + ') : ''}
                  {lang === 'fr' ? drink.name_fr : drink.name}
                </span>
                <span className="text-xs font-bold text-[var(--color-accent-700)]">{formatFCFA(total)}</span>
              </button>
            )
          })}
        </div>
        <button onClick={onDecline} className="w-full text-center text-xs text-[var(--color-ink)]/50 underline">
          {lang === 'fr' ? 'Non merci, juste l’article' : 'No thanks, just the item'}
        </button>
      </div>
    </div>
  )
}
