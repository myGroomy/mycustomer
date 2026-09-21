import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users', 'customer_branches'])
const TABLES: Record<string, string> = { users: 'app_users', settings: 'app_settings' }
const serialize = (row: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'boolean' ? String(value).toUpperCase() : value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
  ]))
const CLIENT_COLUMNS: Record<string, Set<string>> = {
  customers: new Set(['id', 'phone_normalized', 'name', 'first_order_date', 'created_at', 'branch', 'order_count', 'description', 'age_range', 'usia', 'gender', 'jenis_kelamin', 'aliases', 'branch_memberships', 'is_followed_up', 'followed_up_at']),
  orders: new Set(['id', 'customer_id', 'order_date', 'channel', 'raw_phone_input', 'created_at', 'branch', 'is_followed_up', 'followed_up_at']),
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const sheet = searchParams.get('sheet')

    if (!sheet || !ALLOWED_SHEETS.has(sheet)) {
      return NextResponse.json({ error: 'Missing sheet parameter' }, { status: 400 })
    }
    if (sheet === 'users' && !['owner', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const table = TABLES[sheet] || sheet
    const rows = await supabaseTable(table).list<Record<string, unknown>>({ limit: 1000, ...(sheet === 'settings' ? {} : { order: 'created_at.asc' }) })
    const visibleColumns = CLIENT_COLUMNS[sheet]
    let data = rows.map(serialize).map(row => visibleColumns
      ? Object.fromEntries(Object.entries(row).filter(([key]) => visibleColumns.has(key)))
      : row)

    if (auth.user.role === 'kasir' && auth.user.branch && (sheet === 'orders' || sheet === 'customers')) {
      if (sheet === 'orders') {
        data = data.filter(row => row.branch === auth.user.branch)
      } else {
        const orderRows = await supabaseTable('orders').list<Record<string, unknown>>({ limit: 1000 })
        const customerIdsInBranch = new Set(
          orderRows.filter(row => row.branch === auth.user.branch).map(row => row.customer_id),
        )
        data = data.filter(row => customerIdsInBranch.has(row.id))
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error reading sheet:', error)
    return NextResponse.json(
      { error: 'Failed to read sheet' },
      { status: 500 },
    )
  }
}
