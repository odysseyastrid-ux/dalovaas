export type MenuCategory =
  | 'combo'
  | 'burgers'
  | 'fries'
  | 'poutine'
  | 'shakes'
  | 'cocktails'
  | 'soft_drinks'

export const CATEGORY_ORDER: MenuCategory[] = [
  'combo',
  'burgers',
  'fries',
  'poutine',
  'shakes',
  'cocktails',
  'soft_drinks',
]

export interface AddOn {
  label: string
  label_fr: string
  price: number
  icon_url?: string | null
}

export interface SizeOption {
  label: string
  label_fr: string
  price_delta: number
}

export interface MenuItem {
  id: string
  cat: MenuCategory
  name: string
  name_fr: string
  description: string
  description_fr: string
  price: number
  add_ons: AddOn[]
  sizes: SizeOption[]
  image_url: string | null
  out_of_stock: boolean
  deleted: boolean
  sort_order: number
}

export interface Reward {
  id: string
  name: string
  name_fr: string
  cost: number
  item_id: string | null
  active: boolean
}

export type Fulfillment = 'pickup' | 'delivery' | 'dine_in'
export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'cash'
export type OrderStatus = 'active' | 'done'

export interface OrderLine {
  name: string
  cat: string
  qty: number
  unitPrice: number
  addOns: AddOn[]
  lineTotal: number
}

export interface Order {
  id: string
  ref: string
  pickup_code: string
  customer_id: string
  customer_name: string
  customer_phone: string
  fulfillment: Fulfillment
  delivery_address: string | null
  lines: OrderLine[]
  subtotal: number
  delivery_fee: number
  discount: number
  donation_amount: number
  total: number
  promo_code: string | null
  payment_method: PaymentMethod
  paid: boolean
  pending_validation: boolean
  payment_proof_url: string | null
  status: OrderStatus
  order_status_index: 0 | 1 | 2 | 3
  step_deadline: string | null
  location: { lat: number; lng: number } | null
  created_at: string
  validated_at: string | null
  ready_at: string | null
  delivered_at: string | null
}

export interface Account {
  id: string
  phone: string
  profile_name: string
  loyalty_points: number
  saved_address: string | null
  default_payment_method: PaymentMethod
  notif_promos: boolean
  notif_order_updates: boolean
  notif_rewards: boolean
  push_subscription: unknown | null
}

export type StaffRole = 'cashier' | 'manager'

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  active: boolean
}

export interface Employee {
  id: string
  name: string
  active: boolean
  created_at: string
}

export interface TimeEntry {
  id: number
  employee_id: string
  clock_in: string
  clock_out: string | null
  created_at: string
}

export interface CartAddOn {
  label: string
  labelFr: string
  price: number
}

export interface CartLine {
  key: string
  itemId: string
  name: string
  nameFr: string
  cat: MenuCategory
  unitPrice: number
  qty: number
  addOns: CartAddOn[]
  redemptionId?: number
}
