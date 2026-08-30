import type { Order } from '@/types/domain'
import { formatFCFA } from './format'

const INK = '#1a1512'
const MUTED = '#6b6259'
const DIVIDER = '#ece9e2'
const WIDTH = 480
const PAD_X = 28

type Row =
  | { kind: 'title'; text: string; h: number }
  | { kind: 'subtitle'; text: string; h: number }
  | { kind: 'divider'; h: number }
  | { kind: 'ref'; ref: string; date: string; h: number }
  | { kind: 'item'; label: string; value: string; h: number }
  | { kind: 'addon'; label: string; value: string; h: number }
  | { kind: 'kv'; label: string; value: string; bold: boolean; h: number }
  | { kind: 'spacer'; h: number }
  | { kind: 'footer'; text: string; h: number }

function formatDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PAYMENT_LABEL: Record<string, { fr: string; en: string }> = {
  cash: { fr: 'Espèces', en: 'Cash' },
  orange_money: { fr: 'Orange Money', en: 'Orange Money' },
  mtn_momo: { fr: 'MTN MoMo', en: 'MTN MoMo' },
}

function buildRows(order: Order, lang: 'fr' | 'en'): Row[] {
  const rows: Row[] = []
  rows.push({ kind: 'title', text: 'CHEZ SANJI', h: 38 })
  rows.push({ kind: 'subtitle', text: lang === 'fr' ? 'Reçu de commande' : 'Order receipt', h: 26 })
  rows.push({ kind: 'divider', h: 20 })
  rows.push({ kind: 'ref', ref: order.ref, date: formatDate(order.created_at, lang), h: 26 })
  rows.push({ kind: 'divider', h: 20 })

  for (const line of order.lines) {
    rows.push({ kind: 'item', label: `${line.qty}x ${line.name}`, value: formatFCFA(line.lineTotal), h: 24 })
    for (const addOn of line.addOns) {
      rows.push({
        kind: 'addon',
        label: `  + ${lang === 'fr' ? addOn.label_fr : addOn.label}`,
        value: addOn.price > 0 ? formatFCFA(addOn.price) : lang === 'fr' ? 'Gratuit' : 'Free',
        h: 20,
      })
    }
  }

  rows.push({ kind: 'divider', h: 20 })
  rows.push({ kind: 'kv', label: lang === 'fr' ? 'Sous-total' : 'Subtotal', value: formatFCFA(order.subtotal), bold: false, h: 24 })
  if (order.delivery_fee) {
    rows.push({ kind: 'kv', label: lang === 'fr' ? 'Livraison' : 'Delivery', value: formatFCFA(order.delivery_fee), bold: false, h: 24 })
  }
  if (order.discount) {
    rows.push({ kind: 'kv', label: lang === 'fr' ? 'Réduction' : 'Discount', value: `-${formatFCFA(order.discount)}`, bold: false, h: 24 })
  }
  if (order.donation_amount) {
    rows.push({
      kind: 'kv',
      label: lang === 'fr' ? 'Don caritatif' : 'Charity donation',
      value: `+${formatFCFA(order.donation_amount)}`,
      bold: false,
      h: 24,
    })
    rows.push({
      kind: 'footer',
      text: lang === 'fr' ? 'pour « Je lis, je m\'épanouis »' : 'for "Je lis, je m\'épanouis"',
      h: 18,
    })
  }
  rows.push({ kind: 'kv', label: lang === 'fr' ? 'Total' : 'Total', value: formatFCFA(order.total), bold: true, h: 32 })
  rows.push({ kind: 'divider', h: 20 })

  const paymentLabel = PAYMENT_LABEL[order.payment_method]
  rows.push({
    kind: 'kv',
    label: lang === 'fr' ? 'Paiement' : 'Payment',
    value: paymentLabel ? paymentLabel[lang] : order.payment_method,
    bold: false,
    h: 24,
  })
  rows.push({ kind: 'kv', label: lang === 'fr' ? 'Code de retrait' : 'Pickup code', value: order.pickup_code, bold: true, h: 32 })

  rows.push({ kind: 'spacer', h: 16 })
  rows.push({ kind: 'footer', text: lang === 'fr' ? 'Merci de votre commande !' : 'Thank you for your order!', h: 24 })
  return rows
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save()
  ctx.strokeStyle = DIVIDER
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(PAD_X, y)
  ctx.lineTo(WIDTH - PAD_X, y)
  ctx.stroke()
  ctx.restore()
}

/** Renders an order as a PNG receipt image and triggers a browser download. */
export async function downloadReceipt(order: Order, lang: 'fr' | 'en') {
  const rows = buildRows(order, lang)
  const topMargin = 32
  const bottomMargin = 32
  const height = topMargin + rows.reduce((sum, r) => sum + r.h, 0) + bottomMargin

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, height)

  let y = topMargin
  for (const row of rows) {
    y += row.h
    const baseline = y - row.h * 0.35
    ctx.textAlign = 'left'
    switch (row.kind) {
      case 'title':
        ctx.fillStyle = INK
        ctx.font = '800 24px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(row.text, WIDTH / 2, baseline)
        break
      case 'subtitle':
        ctx.fillStyle = MUTED
        ctx.font = '400 12px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(row.text, WIDTH / 2, baseline)
        break
      case 'divider':
        drawDivider(ctx, y - row.h / 2)
        break
      case 'ref':
        ctx.fillStyle = INK
        ctx.font = '700 15px system-ui, sans-serif'
        ctx.fillText(row.ref, PAD_X, baseline)
        ctx.fillStyle = MUTED
        ctx.font = '400 12px system-ui, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(row.date, WIDTH - PAD_X, baseline)
        break
      case 'item':
        ctx.fillStyle = INK
        ctx.font = '600 14px system-ui, sans-serif'
        ctx.fillText(row.label, PAD_X, baseline)
        ctx.textAlign = 'right'
        ctx.fillText(row.value, WIDTH - PAD_X, baseline)
        break
      case 'addon':
        ctx.fillStyle = MUTED
        ctx.font = '400 12px system-ui, sans-serif'
        ctx.fillText(row.label, PAD_X, baseline)
        ctx.textAlign = 'right'
        ctx.fillText(row.value, WIDTH - PAD_X, baseline)
        break
      case 'kv':
        ctx.fillStyle = INK
        ctx.font = row.bold ? '800 17px system-ui, sans-serif' : '400 14px system-ui, sans-serif'
        ctx.fillText(row.label, PAD_X, baseline)
        ctx.textAlign = 'right'
        ctx.fillText(row.value, WIDTH - PAD_X, baseline)
        break
      case 'footer':
        ctx.fillStyle = MUTED
        ctx.font = '600 13px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(row.text, WIDTH / 2, baseline)
        break
      case 'spacer':
        break
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recu-${order.ref}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
