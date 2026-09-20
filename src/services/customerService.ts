import { getSheetData, appendRow, updateRow } from './sheetsService'
import { normalizePhone } from '@/utils/normalizePhone'
import { generateId } from '@/utils/generateId'
import type { Customer, CustomerWithStats, PaginatedResponse, CustomerAlias } from '@/types'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

function toCustomer(row: Record<string, string>): Customer {
  let aliases: CustomerAlias[] = []
  let branchMemberships: string[] = []
  try {
    const parsed = JSON.parse(row.aliases || '[]')
    if (Array.isArray(parsed)) {
      aliases = parsed
    }
  } catch {
    // aliases mungkin berupa teks biasa, bukan JSON
    if (row.aliases && typeof row.aliases === 'string') {
      aliases = [{ name: row.aliases, branch: '', first_seen_at: '', last_seen_at: '' }]
    }
  }
  try {
    const parsed = JSON.parse(row.branch_memberships || '[]')
    if (Array.isArray(parsed)) branchMemberships = parsed.filter((branch): branch is string => typeof branch === 'string')
  } catch {
    branchMemberships = []
  }
  return {
    id: row.id,
    phone_normalized: row.phone_normalized,
    name: row.name,
    first_order_date: row.first_order_date,
    created_at: row.created_at,
    branch: row.branch || '',
    order_count: parseInt(row.order_count || '0', 10),
    description: row.description || '',
    age_range: row.age_range || '',
    usia: row.usia || '',
    gender: row.gender || '',
    jenis_kelamin: row.jenis_kelamin || '',
    is_followed_up: row.is_followed_up === 'TRUE' || row.is_followed_up === 'true',
    followed_up_at: row.followed_up_at || '',
    aliases,
    branch_memberships: branchMemberships,
  }
}

export async function resolveCustomer(
  phone: string,
  name: string,
  firstOrderDate?: string,
  branch?: string,
): Promise<{ customer_id: string; phone_normalized: string; name: string; created: boolean; has_other_branch_activity?: boolean }> {
  const response = await fetch('/api/customers/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, name, first_order_date: firstOrderDate, branch }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Gagal memproses customer')
  return data
}

function paginate<T>(data: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = page * pageSize
  const end = start + pageSize
  return {
    data: data.slice(start, end),
    count: data.length,
    page,
    pageSize,
    totalPages: Math.ceil(data.length / pageSize),
  }
}

// Fast search: only fetches customers, no orders
export async function searchCustomers(
  query: string,
  page = 0,
  pageSize = 20,
): Promise<PaginatedResponse<CustomerWithStats>> {
  const customers = await getSheetData(CUSTOMERS_SHEET)
  const q = query.toLowerCase()
  // Normalize query: strip leading 0 for phone matching
  const qNoZero = q.startsWith('0') ? q.slice(1) : q

  const filtered = customers
    .filter(c => {
      const nameMatch = c.name?.toLowerCase().includes(q)
      const phone = c.phone_normalized || ''
      // Match both with and without leading 0
      const phoneMatch = phone.includes(q) || phone.includes(qNoZero)

      // Cocokkan juga dengan setiap nama alias (case-insensitive)
      let aliasMatch = false
      try {
        const parsed = JSON.parse(c.aliases || '[]')
        if (Array.isArray(parsed)) {
          aliasMatch = parsed.some(
            (a: { name?: string }) =>
              typeof a.name === 'string' && a.name.toLowerCase().includes(q),
          )
        }
      } catch {
        // Fallback: aliases mungkin berupa teks biasa
        if (c.aliases && typeof c.aliases === 'string') {
          aliasMatch = c.aliases.toLowerCase().includes(q)
        }
      }

      // Cocokkan juga dengan usia dan jenis_kelamin (case-insensitive)
      const usiaMatch = (c.usia || '').toLowerCase().includes(q)
      const genderMatch = (c.gender || '').toLowerCase().includes(q)
      const jenisKelaminMatch = (c.jenis_kelamin || '').toLowerCase().includes(q)

      return nameMatch || phoneMatch || aliasMatch || usiaMatch || genderMatch || jenisKelaminMatch
    })
    .map(c => ({
      ...toCustomer(c),
      order_count: parseInt(c.order_count || '0', 10),
      last_order_date: c.first_order_date,
      retention_status: 'active' as const,
      orders: [],
    }))

  return paginate(filtered, page, pageSize)
}

// Get single customer with stats (orders)
export async function getCustomerById(id: string): Promise<CustomerWithStats | null> {
  const customers = await getSheetData(CUSTOMERS_SHEET)
  const customer = customers.find(c => c.id === id)
  if (!customer) return null

  const orders = await getSheetData(ORDERS_SHEET)
  const customerOrders = orders
    .filter(o => o.customer_id === id)
    .map(o => ({ order_date: o.order_date, channel: o.channel, branch: o.branch }))

  const lastOrderDate = customerOrders.length > 0
    ? customerOrders.reduce((latest, o) => o.order_date > latest ? o.order_date : latest, customerOrders[0].order_date)
    : customer.first_order_date

  return {
    ...toCustomer(customer),
    order_count: parseInt(customer.order_count || '0', 10),
    last_order_date: lastOrderDate,
    retention_status: 'active',
    orders: customerOrders,
  }
}

// Get all customers with stats (for dashboard)
export async function getCustomersWithStats(
  page = 0,
  pageSize = 20,
): Promise<PaginatedResponse<CustomerWithStats>> {
  const customers = await getSheetData(CUSTOMERS_SHEET)
  const orders = await getSheetData(ORDERS_SHEET)

  const ordersByCustomer = new Map<string, Array<{ order_date: string; channel: string; branch?: string }>>()
  const lastOrderDateByCustomer = new Map<string, string>()

  for (const order of orders) {
    const customerId = order.customer_id
    if (!ordersByCustomer.has(customerId)) {
      ordersByCustomer.set(customerId, [])
    }
    ordersByCustomer.get(customerId)!.push({
      order_date: order.order_date,
      channel: order.channel,
      branch: order.branch,
    })

    const currentLast = lastOrderDateByCustomer.get(customerId) || ''
    if (order.order_date > currentLast) {
      lastOrderDateByCustomer.set(customerId, order.order_date)
    }
  }

  const customersWithStats = customers.map(c => {
    const customer = toCustomer(c)
    const customerOrders = ordersByCustomer.get(c.id) || []
    const lastOrderDate = lastOrderDateByCustomer.get(c.id) || c.first_order_date

    return {
      ...customer,
      order_count: parseInt(c.order_count || '0', 10),
      last_order_date: lastOrderDate,
      retention_status: 'active' as const,
      orders: customerOrders,
    }
  })

  return paginate(customersWithStats, page, pageSize)
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const normalized = normalizePhone(phone)
  // Normalize without leading 0 for matching
  const normalizedNoZero = normalized.startsWith('0') ? normalized.slice(1) : normalized

  const customers = await getSheetData(CUSTOMERS_SHEET)
  const customer = customers.find(c => {
    const stored = c.phone_normalized || ''
    return stored === normalized || stored === normalizedNoZero ||
           stored === phone || stored === phone.replace(/^0/, '')
  })
  return customer ? toCustomer(customer) : null
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'created_at'>,
): Promise<Customer> {
  const existing = await findCustomerByPhone(customer.phone_normalized)
  if (existing) {
    throw new Error('Customer with this phone already exists')
  }

  const newCustomer: Customer = {
    id: generateId(),
    phone_normalized: normalizePhone(customer.phone_normalized),
    name: customer.name,
    first_order_date: customer.first_order_date,
    created_at: new Date().toISOString(),
    branch: customer.branch || '',
    order_count: 0,
    description: customer.description || '',
    age_range: customer.age_range || '',
    usia: customer.usia || '',
    gender: customer.gender || '',
    jenis_kelamin: customer.jenis_kelamin || '',
  }

  await appendRow(CUSTOMERS_SHEET, {
    id: newCustomer.id,
    phone_normalized: newCustomer.phone_normalized,
    name: newCustomer.name,
    first_order_date: newCustomer.first_order_date,
    created_at: newCustomer.created_at,
    version: '1',
    branch: newCustomer.branch || '',
    order_count: '0',
    description: newCustomer.description || '',
    age_range: newCustomer.age_range || '',
    usia: newCustomer.usia || '',
    gender: newCustomer.gender || '',
    jenis_kelamin: newCustomer.jenis_kelamin || '',
  })

  return newCustomer
}

export async function updateCustomer(
  id: string,
  updates: Partial<Pick<Customer, 'name' | 'phone_normalized' | 'age_range' | 'usia' | 'gender' | 'jenis_kelamin' | 'description' | 'aliases'>>,
): Promise<Customer> {
  const customers = await getSheetData(CUSTOMERS_SHEET)
  const index = customers.findIndex(c => c.id === id)

  if (index === -1) {
    throw new Error('Customer not found')
  }

  const existing = customers[index]

  // Resolve aliases: gunakan update jika ada, fallback ke data existing di sheet
  let aliasesJson = existing.aliases || '[]'
  if (updates.aliases !== undefined) {
    aliasesJson = JSON.stringify(updates.aliases)
  }

  const updatedData: Record<string, string> = {
    id: existing.id,
    phone_normalized: updates.phone_normalized
      ? normalizePhone(updates.phone_normalized)
      : existing.phone_normalized,
    name: updates.name ? updates.name.trim() : existing.name,
    first_order_date: existing.first_order_date,
    created_at: existing.created_at,
    version: String(parseInt(existing.version || '1') + 1),
    branch: existing.branch || '',
    order_count: existing.order_count || '0',
    description: updates.description !== undefined ? updates.description : (existing.description || ''),
    age_range: updates.age_range !== undefined ? updates.age_range : (existing.age_range || ''),
    usia: updates.usia !== undefined ? updates.usia : (existing.usia || ''),
    gender: updates.gender !== undefined ? updates.gender : (existing.gender || ''),
    jenis_kelamin: updates.jenis_kelamin !== undefined ? updates.jenis_kelamin : (existing.jenis_kelamin || ''),
    aliases: aliasesJson,
    branch_memberships: existing.branch_memberships || '[]',
  }

  await updateRow(CUSTOMERS_SHEET, index, updatedData)

  let parsedAliases: CustomerAlias[] = []
  try {
    const p = JSON.parse(aliasesJson)
    if (Array.isArray(p)) parsedAliases = p
  } catch { /* kosongkan */ }

  return {
    id: updatedData.id,
    phone_normalized: updatedData.phone_normalized,
    name: updatedData.name,
    first_order_date: updatedData.first_order_date,
    created_at: updatedData.created_at,
    branch: updatedData.branch,
    order_count: parseInt(updatedData.order_count, 10),
    description: updatedData.description,
    age_range: updatedData.age_range,
    usia: updatedData.usia,
    gender: updatedData.gender,
    jenis_kelamin: updatedData.jenis_kelamin,
    aliases: parsedAliases,
  }
}

export async function updateCustomerProfile(
  id: string,
  payload: {
    aliases?: string
    usia?: string
    jenis_kelamin?: string
  },
): Promise<Customer> {
  const customers = await getSheetData(CUSTOMERS_SHEET)
  const index = customers.findIndex(c => c.id === id)

  if (index === -1) {
    throw new Error('Customer not found')
  }

  const existing = customers[index]

  const updatedData: Record<string, string> = {
    id: existing.id,
    phone_normalized: existing.phone_normalized,
    name: existing.name,
    first_order_date: existing.first_order_date,
    created_at: existing.created_at,
    version: String(parseInt(existing.version || '1') + 1),
    branch: existing.branch || '',
    order_count: existing.order_count || '0',
    description: existing.description || '',
    age_range: existing.age_range || '',
    usia: payload.usia !== undefined ? payload.usia : (existing.usia || ''),
    gender: payload.jenis_kelamin !== undefined ? payload.jenis_kelamin : (existing.gender || ''),
    jenis_kelamin: payload.jenis_kelamin !== undefined ? payload.jenis_kelamin : (existing.jenis_kelamin || ''),
    aliases: payload.aliases !== undefined ? payload.aliases : (existing.aliases || ''),
    branch_memberships: existing.branch_memberships || '[]',
  }

  await updateRow(CUSTOMERS_SHEET, index, updatedData)

  return {
    id: updatedData.id,
    phone_normalized: updatedData.phone_normalized,
    name: updatedData.name,
    first_order_date: updatedData.first_order_date,
    created_at: updatedData.created_at,
    branch: updatedData.branch,
    order_count: parseInt(updatedData.order_count, 10),
    description: updatedData.description,
    age_range: updatedData.age_range,
    usia: updatedData.usia,
    gender: updatedData.gender,
    jenis_kelamin: updatedData.jenis_kelamin,
    aliases: [],
  }
}

/**
 * Menyimpan perubahan daftar alias customer ke Google Sheets.
 * Alias disimpan sebagai JSON string di kolom `aliases`.
 *
 * @param id - ID customer
 * @param aliases - Array CustomerAlias yang akan disimpan
 */
export async function updateCustomerAliases(
  id: string,
  aliases: CustomerAlias[],
): Promise<Customer> {
  return updateCustomer(id, { aliases })
}
