import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useMenu } from '@/hooks/useMenu'
import { formatFCFA } from '@/lib/format'
import { useCartStore } from '@/state/cartStore'
import { useToastStore } from '@/state/toastStore'
import { Button } from '@/components/Button'
import { ComboOfferModal } from './ComboOfferModal'
import type { MenuItem } from '@/types/domain'

export function ItemDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { items } = useMenu()
  const addLine = useCartStore((s) => s.addLine)
  const showToast = useToastStore((s) => s.show)

  const item = items.find((i) => i.id === id)
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)
  const [zoomed, setZoomed] = useState(false)
  const [showCombo, setShowCombo] = useState(false)

  const unitPrice = useMemo(() => {
    if (!item) return 0
    const addOnsTotal = item.add_ons.filter((a) => selectedAddOns.has(a.label)).reduce((sum, a) => sum + a.price, 0)
    return item.price + addOnsTotal
  }, [item, selectedAddOns])

  // Combo upsell: burgers get frites + a drink at -15%, poutine gets just a
  // drink at -15%. Offered once, right before the item is added to cart.
  const friesItem = useMemo(() => items.find((i) => i.cat === 'fries' && !i.out_of_stock) ?? null, [items])
  const drinkOptions = useMemo(() => items.filter((i) => i.cat === 'soft_drinks' && !i.out_of_stock), [items])
  const comboEligible =
    !!item &&
    (item.cat === 'burgers' || item.cat === 'poutine') &&
    drinkOptions.length > 0 &&
    (item.cat !== 'burgers' || !!friesItem)

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <button onClick={() => navigate('/')} className="text-sm underline">
          ← {t.home}
        </button>
      </div>
    )
  }

  const toggleAddOn = (label: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const doAdd = (combo?: MenuItem) => {
    const bundlePrice = combo
      ? unitPrice + (item.cat === 'burgers' ? friesItem?.price ?? 0 : 0) + combo.price
      : unitPrice
    const comboDiscount = combo ? Math.round(bundlePrice * 0.15) : 0
    addLine({
      itemId: item.id,
      name: item.name,
      nameFr: item.name_fr,
      cat: item.cat,
      unitPrice: bundlePrice - comboDiscount,
      qty,
      addOns: item.add_ons
        .filter((a) => selectedAddOns.has(a.label))
        .map((a) => ({ label: a.label, labelFr: a.label_fr, price: a.price })),
      combo: combo ? { drinkItemId: combo.id, drinkName: combo.name, drinkNameFr: combo.name_fr } : undefined,
    })
    showToast((lang === 'fr' ? 'Ajouté au panier : ' : 'Added to cart: ') + (lang === 'fr' ? item.name_fr : item.name))
    navigate('/')
  }

  const add = () => {
    if (comboEligible) {
      setShowCombo(true)
      return
    }
    doAdd()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28">
        <div className="relative">
          <div
            className={`h-[280px] w-full overflow-hidden bg-[var(--color-surface)] ${item.image_url ? 'cursor-zoom-in' : ''}`}
            onClick={() => item.image_url && setZoomed(true)}
          >
            {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="font-[var(--font-heading)] text-2xl font-extrabold">
              {lang === 'fr' ? item.name_fr : item.name}
            </div>
            <div className="whitespace-nowrap font-[var(--font-heading)] text-lg font-extrabold">
              {formatFCFA(unitPrice)}
            </div>
          </div>
          <div className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/70">
            {lang === 'fr' ? item.description_fr : item.description}
          </div>

          {item.add_ons.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide">
                {t.addOns}
              </div>
              {item.add_ons.map((ao) => {
                const checked = selectedAddOns.has(ao.label)
                return (
                  <div
                    key={ao.label}
                    onClick={() => toggleAddOn(ao.label)}
                    className="flex cursor-pointer items-center justify-between border-b border-[var(--color-divider)] py-3"
                  >
                    <div className="flex items-center gap-3">
                      {ao.icon_url && (
                        <div className="h-9 w-9 flex-none overflow-hidden rounded-lg bg-[var(--color-surface)]">
                          <img src={ao.icon_url} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div
                        className="h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-[var(--color-ink)]/60"
                        style={{ background: checked ? 'var(--color-accent)' : 'transparent' }}
                      />
                      <div className="text-sm">{lang === 'fr' ? ao.label_fr : ao.label}</div>
                    </div>
                    <div className="text-sm text-[var(--color-ink)]/60">
                      {ao.price > 0 ? '+' + formatFCFA(ao.price) : lang === 'fr' ? 'Gratuit' : 'Free'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide">{t.qty}</div>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--color-divider)]"
            >
              −
            </button>
            <div className="min-w-5 text-center text-sm">{qty}</div>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--color-divider)]"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-[var(--color-divider)] bg-[var(--color-bg)] p-4">
        <Button block onClick={add}>
          {t.addToCart} · {formatFCFA(unitPrice * qty)}
        </Button>
      </div>
      {zoomed && item.image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomed(false)}
        >
          <img src={item.image_url} alt={item.name} className="max-h-full max-w-full object-contain" />
          <button
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {showCombo && (
        <ComboOfferModal
          item={item}
          baseUnitPrice={unitPrice}
          qty={qty}
          friesItem={friesItem}
          drinkOptions={drinkOptions}
          lang={lang}
          onAccept={(drink) => {
            setShowCombo(false)
            doAdd(drink)
          }}
          onDecline={() => {
            setShowCombo(false)
            doAdd()
          }}
        />
      )}
    </div>
  )
}
