import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { CATEGORY_LABELS } from '@/i18n/strings'
import { CATEGORY_ORDER, type AddOn, type MenuCategory, type MenuItem } from '@/types/domain'
import { useAllMenuItems, useCategoryAddOns } from '@/hooks/useMenu'
import { supabase } from '@/lib/supabaseClient'
import { formatFCFA } from '@/lib/format'

export function MenuManager({ canEdit }: { canEdit: boolean }) {
  const { t, lang } = useI18n()
  const { items, reload } = useAllMenuItems()
  const { byCategory, reload: reloadAddOns } = useCategoryAddOns()
  const [newCat, setNewCat] = useState<MenuCategory>('burgers')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const visible = items.filter((i) => !i.deleted)

  const addProduct = async () => {
    if (!newName.trim() || !Number(newPrice)) return
    await supabase.rpc('upsert_menu_item', {
      p_id: null,
      p_cat: newCat,
      p_name: newName,
      p_name_fr: newName,
      p_description: '',
      p_description_fr: '',
      p_price: Number(newPrice),
      p_add_ons: [],
      p_sizes: [],
    })
    setNewName('')
    setNewPrice('')
    reload()
  }

  const updateField = async (item: MenuItem, field: 'name' | 'price', value: string) => {
    if (field === 'price') {
      const newPriceVal = Number(value) || 0
      // A typo or an accidental extra digit going live to real customers is
      // expensive and easy to miss on a small mobile screen -- confirm any
      // jump of 3x or more (either direction) before it actually saves.
      const ratio = item.price > 0 ? newPriceVal / item.price : Infinity
      if (item.price > 0 && (ratio >= 3 || ratio <= 1 / 3)) {
        const ok = window.confirm(
          `Le prix passe de ${formatFCFA(item.price)} à ${formatFCFA(newPriceVal)} pour "${item.name}". Confirmer ?`,
        )
        if (!ok) {
          reload() // resets the input back to the real stored value
          return
        }
      }
    }
    await supabase.rpc('upsert_menu_item', {
      p_id: item.id,
      p_cat: item.cat,
      p_name: field === 'name' ? value : item.name,
      p_name_fr: field === 'name' ? value : item.name_fr,
      p_description: item.description,
      p_description_fr: item.description_fr,
      p_price: field === 'price' ? Number(value) || 0 : item.price,
      p_add_ons: item.add_ons,
      p_sizes: item.sizes,
    })
    reload()
  }

  const toggleStock = async (item: MenuItem) => {
    await supabase.rpc('set_menu_item_stock', { p_id: item.id, p_out_of_stock: !item.out_of_stock })
    reload()
  }

  const removeItem = async (item: MenuItem) => {
    await supabase.rpc('soft_delete_menu_item', { p_id: item.id })
    reload()
  }

  const uploadPhoto = async (item: MenuItem, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${item.id}-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true })
    if (uploadErr) return
    const { data: pub } = supabase.storage.from('menu-photos').getPublicUrl(path)
    await supabase.rpc('set_menu_item_image', { p_id: item.id, p_image_url: pub.publicUrl })
    reload()
  }

  // Add-ons belong to the category, not to any single item -- every item in
  // a category always shares the exact same list and prices. Editing one
  // updates every product in that category at once.
  const saveCategoryAddOns = async (cat: MenuCategory, addOns: AddOn[]) => {
    await supabase.rpc('set_category_add_ons', { p_cat: cat, p_add_ons: addOns })
    reloadAddOns()
    reload()
  }

  const addCategoryAddOn = (cat: MenuCategory) => {
    const current = byCategory[cat] ?? []
    saveCategoryAddOns(cat, [...current, { label: 'New option', label_fr: 'Nouveau supplément', price: 0 }])
  }

  const updateCategoryAddOn = (cat: MenuCategory, idx: number, field: 'label' | 'label_fr' | 'price', value: string) => {
    const current = byCategory[cat] ?? []
    const addOns = current.map((a, i) =>
      i === idx ? { ...a, [field]: field === 'price' ? Number(value) || 0 : value } : a,
    )
    saveCategoryAddOns(cat, addOns)
  }

  const uploadCategoryAddOnIcon = async (cat: MenuCategory, idx: number, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `addon-${cat}-${idx}-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true })
    if (uploadErr) return
    const { data: pub } = supabase.storage.from('menu-photos').getPublicUrl(path)
    const current = byCategory[cat] ?? []
    const addOns = current.map((a, i) => (i === idx ? { ...a, icon_url: pub.publicUrl } : a))
    saveCategoryAddOns(cat, addOns)
  }

  const removeCategoryAddOn = (cat: MenuCategory, idx: number) => {
    const current = byCategory[cat] ?? []
    saveCategoryAddOns(cat, current.filter((_, i) => i !== idx))
  }

  if (!canEdit) {
    return (
      <div>
        <div className="mb-4 [font-family:var(--font-heading)] text-lg font-extrabold">{t.manageMenu}</div>
        <div className="flex flex-col gap-2">
          {visible.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] bg-white p-3.5">
              <div>{item.name}</div>
              <div className="text-sm font-bold">{formatFCFA(item.price)}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 [font-family:var(--font-heading)] text-lg font-extrabold">{t.manageMenu}</div>

      <div className="mb-6 rounded-xl border-2 border-[var(--color-ink)] bg-white p-4">
        <div className="mb-3 text-sm font-bold">{t.addProduct}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">{t.category}</div>
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as MenuCategory)}
              className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c].en}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">{t.productName}</div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">{t.productPrice}</div>
            <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <button onClick={addProduct} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">
            {t.addProduct}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--color-divider)] bg-white p-4" style={{ opacity: item.out_of_stock ? 0.55 : 1 }}>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-[var(--color-surface)]">
                {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
              </div>
              <label className="cursor-pointer rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
                {item.image_url ? (lang === 'fr' ? 'Changer la photo' : 'Change photo') : (lang === 'fr' ? 'Ajouter une photo' : 'Add photo')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadPhoto(item, file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-center">
              <input
                key={item.name}
                defaultValue={item.name}
                autoComplete="off"
                onBlur={(e) => e.target.value !== item.name && updateField(item, 'name', e.target.value)}
                className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
              />
              <input
                key={item.price}
                type="number"
                inputMode="numeric"
                defaultValue={item.price}
                autoComplete="off"
                onBlur={(e) => Number(e.target.value) !== item.price && updateField(item, 'price', e.target.value)}
                className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
              />
              <button onClick={() => toggleStock(item)} className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
                {item.out_of_stock ? t.backInStock : t.markOutOfStock}
              </button>
              <button onClick={() => removeItem(item)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600">
                {t.deleteProduct}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold">{t.addOnsLabel}</div>
        <div className="mb-4 text-xs text-[var(--color-ink)]/60">
          {lang === 'fr'
            ? 'Les suppléments sont partagés par catégorie : une modification ici s\'applique à tous les produits de la catégorie.'
            : 'Add-ons are shared per category: a change here applies to every product in that category.'}
        </div>
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.filter((c) => visible.some((i) => i.cat === c)).map((cat) => (
            <div key={cat} className="rounded-xl border border-[var(--color-divider)] bg-white p-4">
              <div className="mb-2 text-xs font-bold uppercase text-[var(--color-ink)]/60">
                {lang === 'fr' ? CATEGORY_LABELS[cat].fr : CATEGORY_LABELS[cat].en}
              </div>
              {(byCategory[cat] ?? []).map((ao, idx) => (
                <div key={idx} className="mb-1.5 flex items-center gap-2">
                  <div className="h-8 w-8 flex-none overflow-hidden rounded-md bg-[var(--color-surface)]">
                    {ao.icon_url && <img src={ao.icon_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <label className="flex-none cursor-pointer rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-[10px] font-bold">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadCategoryAddOnIcon(cat, idx, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <input
                    defaultValue={ao.label}
                    placeholder="Nom (EN)"
                    onBlur={(e) => e.target.value !== ao.label && updateCategoryAddOn(cat, idx, 'label', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-divider)] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    defaultValue={ao.label_fr}
                    placeholder="Nom (FR)"
                    onBlur={(e) => e.target.value !== ao.label_fr && updateCategoryAddOn(cat, idx, 'label_fr', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-divider)] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    defaultValue={ao.price}
                    onBlur={(e) => Number(e.target.value) !== ao.price && updateCategoryAddOn(cat, idx, 'price', e.target.value)}
                    className="w-24 rounded-lg border border-[var(--color-divider)] px-2.5 py-1.5 text-xs"
                  />
                  <button onClick={() => removeCategoryAddOn(cat, idx)} className="px-2 text-xs text-red-600">
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addCategoryAddOn(cat)} className="mt-1 rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                {t.addAddOnBtn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
