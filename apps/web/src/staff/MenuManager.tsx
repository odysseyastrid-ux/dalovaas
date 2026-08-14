import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { CATEGORY_LABELS } from '@/i18n/strings'
import { CATEGORY_ORDER, type MenuCategory, type MenuItem } from '@/types/domain'
import { useAllMenuItems } from '@/hooks/useMenu'
import { supabase } from '@/lib/supabaseClient'
import { formatFCFA } from '@/lib/format'

export function MenuManager({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n()
  const { items, reload } = useAllMenuItems()
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

  const addAddOn = async (item: MenuItem) => {
    await supabase.rpc('upsert_menu_item', {
      p_id: item.id,
      p_cat: item.cat,
      p_name: item.name,
      p_name_fr: item.name_fr,
      p_description: item.description,
      p_description_fr: item.description_fr,
      p_price: item.price,
      p_add_ons: [...item.add_ons, { label: 'New option', label_fr: 'Nouveau supplément', price: 0 }],
      p_sizes: item.sizes,
    })
    reload()
  }

  const updateAddOn = async (item: MenuItem, idx: number, field: 'label' | 'price', value: string) => {
    const addOns = item.add_ons.map((a, i) =>
      i === idx
        ? { ...a, label: field === 'label' ? value : a.label, label_fr: field === 'label' ? value : a.label_fr, price: field === 'price' ? Number(value) || 0 : a.price }
        : a,
    )
    await supabase.rpc('upsert_menu_item', {
      p_id: item.id,
      p_cat: item.cat,
      p_name: item.name,
      p_name_fr: item.name_fr,
      p_description: item.description,
      p_description_fr: item.description_fr,
      p_price: item.price,
      p_add_ons: addOns,
      p_sizes: item.sizes,
    })
    reload()
  }

  const removeAddOn = async (item: MenuItem, idx: number) => {
    await supabase.rpc('upsert_menu_item', {
      p_id: item.id,
      p_cat: item.cat,
      p_name: item.name,
      p_name_fr: item.name_fr,
      p_description: item.description,
      p_description_fr: item.description_fr,
      p_price: item.price,
      p_add_ons: item.add_ons.filter((_, i) => i !== idx),
      p_sizes: item.sizes,
    })
    reload()
  }

  if (!canEdit) {
    return (
      <div>
        <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">{t.manageMenu}</div>
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
      <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">{t.manageMenu}</div>

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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-center">
              <input
                defaultValue={item.name}
                onBlur={(e) => e.target.value !== item.name && updateField(item, 'name', e.target.value)}
                className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
              />
              <input
                type="number"
                defaultValue={item.price}
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
            <div className="mt-3 border-t border-[var(--color-divider)] pt-3">
              <div className="mb-2 text-[11px] font-bold uppercase text-[var(--color-ink)]/60">{t.addOnsLabel}</div>
              {item.add_ons.map((ao, idx) => (
                <div key={idx} className="mb-1.5 flex items-center gap-2">
                  <input
                    defaultValue={ao.label}
                    onBlur={(e) => e.target.value !== ao.label && updateAddOn(item, idx, 'label', e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-divider)] px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    defaultValue={ao.price}
                    onBlur={(e) => Number(e.target.value) !== ao.price && updateAddOn(item, idx, 'price', e.target.value)}
                    className="w-24 rounded-lg border border-[var(--color-divider)] px-2.5 py-1.5 text-xs"
                  />
                  <button onClick={() => removeAddOn(item, idx)} className="px-2 text-xs text-red-600">
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addAddOn(item)} className="mt-1 rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                {t.addAddOnBtn}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
