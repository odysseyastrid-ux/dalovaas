import clsx from 'clsx'
import type { OrderStatus, VendorStatus } from '@/types/domain'

const ORDER_LABELS: Record<OrderStatus, string> = {
  pending: 'Nouvelle',
  accepted: 'En préparation',
  ready_for_pickup: 'Prête',
  picked_up: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

const ORDER_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  ready_for_pickup: 'bg-teal-100 text-teal-700',
  picked_up: 'bg-violet-100 text-violet-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function OrderStatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold', ORDER_COLORS[status], className)}>
      {ORDER_LABELS[status]}
    </span>
  )
}

const VENDOR_LABELS: Record<VendorStatus, string> = {
  pending: 'En attente',
  active: 'Actif',
  suspended: 'Suspendu',
}

const VENDOR_COLORS: Record<VendorStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
}

export function VendorStatusPill({ status, className }: { status: VendorStatus; className?: string }) {
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold', VENDOR_COLORS[status], className)}>
      {VENDOR_LABELS[status]}
    </span>
  )
}
