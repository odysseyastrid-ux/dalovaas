import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { CATEGORY_LABELS, type Lang } from '@/i18n/strings'
import { CATEGORY_ORDER, type MenuCategory } from '@/types/domain'
import { useMenu } from '@/hooks/useMenu'
import { useAppSettings } from '@/hooks/useAppSettings'
import { formatFCFA } from '@/lib/format'
import { useCartStore } from '@/state/cartStore'
import { useToastStore } from '@/state/toastStore'
import { PromoCarousel } from '@/components/PromoCarousel'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ScrollProgressBar } from '@/components/ScrollProgressBar'
import { Spinner } from '@/components/Spinner'
import { ComboOfferModal } from './ComboOfferModal'

const STAFF_WHATSAPP_NUMBER = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER || '237652776763'

// "Tout" and "Combo" are deliberately not customer-browsable categories --
// combos are now offered dynamically via the add-to-cart upsell popup
// instead of as their own standalone products.
const CUSTOMER_CATEGORIES = CATEGORY_ORDER.filter((c) => c !== 'combo')

// Same drink choices as the combo offer on the item detail page -- kept in
// sync deliberately since this is the same upsell, just triggered from the
// quick-add "+" button instead.
const COMBO_DRINK_IDS = ['d1', 'itm_9b8fc4d6c5']

export function HomeScreen() {
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const { items, loading } = useMenu()
  const { settings } = useAppSettings()
  const [category, setCategory] = useState<MenuCategory>(CUSTOMER_CATEGORIES[0])
  const [logoFailed, setLogoFailed] = useState(false)
  const [comboPromptItem, setComboPromptItem] = useState<(typeof items)[number] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const addLine = useCartStore((s) => s.addLine)
  const showToast = useToastStore((s) => s.show)

  // Cheapest first, most expensive last, within each category.
  const filtered = useMemo(
    () => items.filter((i) => i.cat === category).sort((a, b) => a.price - b.price),
    [items, category],
  )

  const friesItem = useMemo(() => items.find((i) => i.cat === 'fries' && !i.out_of_stock) ?? null, [items])
  const drinkOptions = useMemo(
    () => items.filter((i) => i.cat === 'soft_drinks' && !i.out_of_stock && COMBO_DRINK_IDS.includes(i.id)),
    [items],
  )

  const addPlain = (item: (typeof items)[number]) => {
    addLine({
      itemId: item.id,
      name: item.name,
      nameFr: item.name_fr,
      cat: item.cat,
      unitPrice: item.price,
      qty: 1,
      addOns: [],
    })
    showToast((lang === 'fr' ? 'Ajouté au panier : ' : 'Added to cart: ') + (lang === 'fr' ? item.name_fr : item.name))
  }

  const quickAdd = (item: (typeof items)[number], e: React.MouseEvent) => {
    e.stopPropagation()
    const comboEligible =
      (item.cat === 'burgers' || item.cat === 'poutine') && drinkOptions.length > 0 && (item.cat !== 'burgers' || !!friesItem)
    if (comboEligible) {
      setComboPromptItem(item)
      return
    }
    addPlain(item)
  }

  const acceptCombo = (drink: (typeof items)[number]) => {
    const item = comboPromptItem
    if (!item) return
    const bundlePrice = item.price + (item.cat === 'burgers' ? friesItem?.price ?? 0 : 0) + drink.price
    const comboDiscount = Math.round(bundlePrice * 0.15)
    addLine({
      itemId: item.id,
      name: item.name,
      nameFr: item.name_fr,
      cat: item.cat,
      unitPrice: bundlePrice - comboDiscount,
      qty: 1,
      addOns: [],
      combo: { drinkItemId: drink.id, drinkName: drink.name, drinkNameFr: drink.name_fr },
    })
    showToast((lang === 'fr' ? 'Combo ajouté : ' : 'Combo added: ') + (lang === 'fr' ? item.name_fr : item.name))
    setComboPromptItem(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <button
          onClick={toggleLang}
          className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 [font-family:var(--font-heading)] text-[11px] font-bold"
        >
          {lang.toUpperCase()} / {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          {settings.logo_url && !logoFailed ? (
            <img
              src={settings.logo_url}
              alt="Marlyse"
              onError={() => setLogoFailed(true)}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-accent)]">
              M
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/account')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto">
        <ScrollProgressBar containerRef={scrollRef} />
        <PromoCarousel slides={settings.promo_slides} />

        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 py-4">
          {CUSTOMER_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {CATEGORY_LABELS[cat][lang as Lang]}
            </CategoryChip>
          ))}
        </div>

        <div className="flex flex-col gap-3 px-4 pb-8">
          {loading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer gap-4 rounded-2xl bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(26,21,18,0.06)]"
            >
              <div className="h-[76px] w-[76px] flex-none overflow-hidden rounded-xl bg-[var(--color-surface)]">
                {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="[font-family:var(--font-heading)] text-[15px] font-bold">
                  {lang === 'fr' ? item.name_fr : item.name}
                  {item.out_of_stock && (
                    <span className="ml-2 text-[10px] font-normal text-red-600">{t.outOfStock}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--color-ink)]/60">
                  {lang === 'fr' ? item.description_fr : item.description}
                </div>
                <div className="mt-1.5 [font-family:var(--font-heading)] text-[13px] font-bold">{formatFCFA(item.price)}</div>
              </div>
              <button
                disabled={item.out_of_stock}
                onClick={(e) => quickAdd(item, e)}
                className="flex h-8 w-8 flex-none items-center self-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-ink)] disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      <ScrollToTop containerRef={scrollRef} />
      <a
        href={`https://wa.me/${STAFF_WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener"
        aria-label="Contacter le support sur WhatsApp"
        className="absolute bottom-20 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:brightness-105"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.02c-.24.68-1.41 1.32-1.95 1.36-.5.04-1 .24-3.37-.7-2.86-1.14-4.7-4.06-4.84-4.25-.14-.19-1.16-1.54-1.16-2.93 0-1.4.73-2.08 1-2.36.24-.26.5-.34.68-.34h.5c.16 0 .38-.06.58.45.24.6.79 2.06.86 2.21.07.14.11.31.02.5-.1.19-.14.31-.28.48-.14.16-.29.36-.42.48-.14.14-.28.28-.12.55.16.28.72 1.18 1.55 1.9 1.06.94 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.7-.82.88-1.1.19-.28.38-.23.63-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.32.07.12.07.68-.17 1.36z" />
        </svg>
      </a>

      {comboPromptItem && (
        <ComboOfferModal
          item={comboPromptItem}
          baseUnitPrice={comboPromptItem.price}
          qty={1}
          friesItem={friesItem}
          drinkOptions={drinkOptions}
          lang={lang}
          onAccept={acceptCombo}
          onDecline={() => {
            addPlain(comboPromptItem)
            setComboPromptItem(null)
          }}
        />
      )}
    </div>
  )
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-none whitespace-nowrap rounded-full border-2 border-[var(--color-ink)] px-4 py-2 [font-family:var(--font-heading)] text-sm font-bold"
      style={{ backgroundImage: active ? 'var(--gradient-ink)' : 'none', color: active ? 'var(--color-accent)' : 'var(--color-ink)' }}
    >
      {children}
    </button>
  )
}
