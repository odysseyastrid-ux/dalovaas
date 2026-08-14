import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useCartStore, cartSubtotal } from '@/state/cartStore'
import { formatFCFA } from '@/lib/format'
import { Button } from '@/components/Button'

export function CartScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const lines = useCartStore((s) => s.lines)
  const incLine = useCartStore((s) => s.incLine)
  const decLine = useCartStore((s) => s.decLine)
  const removeLine = useCartStore((s) => s.removeLine)

  const subtotal = cartSubtotal(lines)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-divider)] p-4 font-[var(--font-heading)] text-lg font-extrabold">
        {t.yourCart}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="text-sm text-[var(--color-ink)]/60">{t.emptyCart}</div>
          <Button onClick={() => navigate('/')}>{t.browseMenu}</Button>
        </div>
      ) : (
        <>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
            {lines.map((line) => (
              <div key={line.key} className="border-b border-[var(--color-divider)] py-4">
                <div className="flex justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-[var(--font-heading)] text-sm font-bold">
                      {lang === 'fr' ? line.nameFr : line.name}
                    </div>
                    {line.addOns.length > 0 && (
                      <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                        {line.addOns.map((a) => (lang === 'fr' ? a.labelFr : a.label)).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="font-[var(--font-heading)] text-sm font-bold">
                    {formatFCFA(line.unitPrice * line.qty)}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => decLine(line.key)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--color-divider)]"
                  >
                    −
                  </button>
                  <div className="min-w-4 text-center text-[13px]">{line.qty}</div>
                  <button
                    onClick={() => incLine(line.key)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-[var(--color-divider)]"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeLine(line.key)}
                    className="ml-auto text-xs text-[var(--color-ink)]/60 underline"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--color-divider)] p-4">
            <div className="mb-1 flex justify-between text-[13px] text-[var(--color-ink)]/70">
              <span>{t.subtotal}</span>
              <span>{formatFCFA(subtotal)}</span>
            </div>
            <div className="mb-4 flex justify-between font-[var(--font-heading)] text-base font-extrabold">
              <span>{t.total}</span>
              <span>{formatFCFA(subtotal)}</span>
            </div>
            <Button block onClick={() => navigate('/checkout')}>
              {t.sendOrder}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
