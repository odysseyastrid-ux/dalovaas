import { useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { useMenuItems } from '@/hooks/useMenuItems'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Field, Input, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'

export function MenuManager() {
  const vendor = useAuthStore((s) => s.vendor)
  const { data: items, loading } = useMenuItems(vendor?.id ?? null)
  const showToast = useToastStore((s) => s.show)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const addItem = async () => {
    if (!vendor || !name.trim() || !price) return
    setSaving(true)
    const { error } = await supabase.from('mk_menu_items').insert({
      vendor_id: vendor.id,
      category: category.trim() || 'plats',
      name: name.trim(),
      name_fr: name.trim(),
      description: description.trim(),
      price: Math.round(Number(price)),
    })
    setSaving(false)
    if (error) {
      showToast(error.message)
      return
    }
    setName('')
    setDescription('')
    setPrice('')
    setShowForm(false)
    showToast('Article ajouté')
  }

  const toggleAvailable = async (id: string, available: boolean) => {
    await supabase.from('mk_menu_items').update({ available: !available }).eq('id', id)
  }

  const updatePrice = async (id: string, newPrice: number) => {
    await supabase.from('mk_menu_items').update({ price: newPrice }).eq('id', id)
  }

  const removeItem = async (id: string) => {
    await supabase.from('mk_menu_items').update({ deleted: true }).eq('id', id)
    showToast('Article supprimé')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-[var(--font-heading)] text-2xl font-extrabold">Mon menu</div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg font-bold text-white"
        >
          {showForm ? '×' : '+'}
        </button>
      </div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">{items.length} article{items.length !== 1 ? 's' : ''}</div>

      {showForm && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <Field label="Catégorie">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex : Burgers, Frites…" />
          </Field>
          <Field label="Nom du plat">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="Prix (FCFA)">
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Button disabled={saving || !name.trim() || !price} onClick={addItem}>
            {saving ? '…' : 'Ajouter au menu'}
          </Button>
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{item.name}</div>
              <div className="text-xs text-[var(--color-ink)]/50">{item.category}</div>
              <input
                type="number"
                defaultValue={item.price}
                onBlur={(e) => {
                  const v = Math.round(Number(e.target.value))
                  if (v > 0 && v !== item.price) updatePrice(item.id, v)
                }}
                className="mt-1 w-24 rounded border border-[var(--color-divider)] px-2 py-1 text-sm font-bold text-[var(--color-accent-700)]"
              />
              <span className="ml-1 text-xs text-[var(--color-ink)]/50">FCFA</span>
            </div>
            <button
              onClick={() => toggleAvailable(item.id, item.available)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--color-surface)] text-[var(--color-ink)]/50'}`}
            >
              {item.available ? 'Disponible' : 'Épuisé'}
            </button>
            <button onClick={() => removeItem(item.id)} className="text-lg text-red-400">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
