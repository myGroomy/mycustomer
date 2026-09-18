export type ChannelType =
  | 'dine_in'
  | 'takeaway'
  | 'gofood'
  | 'grab'
  | 'shopee'
  | 'whatsapp'
  | 'custom'

export type BranchType = 'CMH' | 'BDG'

export interface Channel {
  id: ChannelType
  label: string
}

export type RetentionStatus = 'active' | 'at_risk' | 'churned'

export interface Customer {
  id: string
  phone_normalized: string
  name: string
  first_order_date: string
  created_at: string
  branch?: string
  order_count?: number
  description?: string
  age_range?: string
  gender?: string
  is_followed_up?: boolean
  followed_up_at?: string
}

export interface CustomerWithStats extends Customer {
  order_count: number
  last_order_date: string
  retention_status: RetentionStatus
  orders?: Array<{ order_date: string; channel: string; branch?: string }>
}

export interface Order {
  id: string
  customer_id: string
  order_date: string
  channel: ChannelType
  raw_phone_input: string | null
  created_at: string
  branch?: string
  is_followed_up?: boolean
  followed_up_at?: string
}

export interface OrderWithCustomer extends Order {
  customer?: Customer
}

export interface User {
  id: string
  username: string
  pin: string
  role: 'owner' | 'kasir'
  created_at: string
  branch?: string
}

export interface RetentionThresholds {
  activeDays: number
  atRiskDays: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
