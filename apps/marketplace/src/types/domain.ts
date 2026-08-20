export type VendorStatus = 'pending' | 'active' | 'suspended'
export type OrderStatus = 'pending' | 'accepted' | 'ready_for_pickup' | 'picked_up' | 'delivered' | 'cancelled'
export type PaymentMethod = 'mtn_momo' | 'orange_money' | 'cash'
export type VehicleType = 'bike' | 'moto' | 'car'
export type CourierAvailability = 'offline' | 'online' | 'on_delivery'
export type DeliveryOption = 'priority' | 'standard' | 'scheduled'

export interface Vendor {
  id: string
  owner_id: string
  name: string
  name_fr: string
  description: string
  description_fr: string
  cuisine_type: string
  phone: string
  city: string
  address: string
  lat: number | null
  lng: number | null
  logo_url: string | null
  cover_url: string | null
  commission_rate: number
  status: VendorStatus
  rating: number
  rating_count: number
  created_at: string
}

export interface MenuItem {
  id: string
  vendor_id: string
  category: string
  name: string
  name_fr: string
  description: string
  description_fr: string
  price: number
  image_url: string | null
  available: boolean
  deleted: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Courier {
  id: string
  full_name: string
  phone: string
  vehicle_type: VehicleType
  city: string
  address: string
  id_number: string
  plate_number: string
  emergency_contact_phone: string
  status: CourierAvailability
  active: boolean
  verified: boolean
  verified_at: string | null
  rating: number
  rating_count: number
  created_at: string
}

export interface OrderLine {
  item_id: string
  name: string
  unit_price: number
  qty: number
  line_total: number
}

export interface MkOrder {
  id: string
  ref: string
  customer_id: string
  customer_name: string
  customer_phone: string
  vendor_id: string
  vendor_name: string
  courier_id: string | null
  courier_name: string | null
  courier_phone: string | null
  items: OrderLine[]
  subtotal: number
  delivery_fee: number
  commission_amount: number
  total: number
  delivery_address: string
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_option: DeliveryOption
  scheduled_at: string | null
  meeting_point: string | null
  distance_km: number | null
  donation_amount: number
  payment_method: PaymentMethod
  paid: boolean
  notes: string | null
  status: OrderStatus
  cancel_reason: string | null
  created_at: string
  accepted_at: string | null
  ready_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

export interface MkCustomer {
  id: string
  phone: string
  full_name: string
  default_address: string | null
  default_lat: number | null
  default_lng: number | null
  created_at: string
}

export interface CartLine {
  item: MenuItem
  qty: number
}

export type AppRole = 'customer' | 'vendor' | 'courier' | 'admin' | null
