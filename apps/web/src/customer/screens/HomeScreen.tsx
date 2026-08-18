import { useMemo, useState } from 'react'
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

// "Tout" and "Combo" are deliberately not customer-browsable categories --
// combos are now offered dynamically via the add-to-cart upsell popup
// instead of as their own standalone products.
const CUSTOMER_CATEGORIES = CATEGORY_ORDER.filter((c) => c !== 'combo')

export function HomeScreen() {
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const { items, loading } = useMenu()
  const { settings } = useAppSettings()
  const [category, setCategory] = useState<MenuCategory>(CUSTOMER_CATEGORIES[0])
  const [logoFailed, setLogoFailed] = useState(false)
  const addLine = useCartStore((s) => s.addLine)
  const showToast = useToastStore((s) => s.show)

  const filtered = useMemo(() => items.filter((i) => i.cat === category), [items, category])

  const quickAdd = (item: (typeof items)[number], e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <button
          onClick={toggleLang}
          className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 font-[var(--font-heading)] text-[11px] font-bold"
        >
          {lang.toUpperCase()} / {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          {settings.logo_url && !logoFailed ? (
            <img
              src={settings.logo_url}
              alt="Chez Sanji"
              onError={() => setLogoFailed(true)}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ink)] text-xs font-black text-[var(--color-accent)]">
              CS
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

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <PromoCarousel slides={settings.promo_slides} />

        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 py-4">
          {CUSTOMER_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {CATEGORY_LABELS[cat][lang as Lang]}
            </CategoryChip>
          ))}
        </div>

        <div className="px-4 pb-8">
          {loading && <div className="py-8 text-center text-sm text-[var(--color-ink)]/50">…</div>}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="flex cursor-pointer gap-4 border-b border-[var(--color-divider)] py-4"
            >
              <div className="h-[76px] w-[76px] flex-none overflow-hidden rounded-lg bg-[var(--color-surface)]">
                {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-[var(--font-heading)] text-[15px] font-bold">
                  {lang === 'fr' ? item.name_fr : item.name}
                  {item.out_of_stock && (
                    <span className="ml-2 text-[10px] font-normal text-red-600">{t.outOfStock}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--color-ink)]/60">
                  {lang === 'fr' ? item.description_fr : item.description}
                </div>
                <div className="mt-1.5 font-[var(--font-heading)] text-[13px] font-bold">{formatFCFA(item.price)}</div>
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
    </div>
  )
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-none whitespace-nowrap rounded-full border-2 border-[var(--color-ink)] px-4 py-2 font-[var(--font-heading)] text-sm font-bold"
      style={{ backgroundImage: active ? 'var(--gradient-ink)' : 'none', color: active ? 'var(--color-accent)' : 'var(--color-ink)' }}
    >
      {children}
    </button>
  )
}
