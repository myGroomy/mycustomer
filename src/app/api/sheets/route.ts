import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users', 'customer_branches'])
const ORDERS_SHEET = 'orders'
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

    if (!sheet) {
      return NextResponse.json({ error: 'Missing sheet parameter' }, { status: 400 })
    }
    if (!ALLOWED_SHEETS.has(sheet)) {
      return NextResponse.json({ error: `Sheet tidak valid: ${sheet}` }, { status: 400 })
    }
    if (sheet === 'users' && !['owner', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A:Z`,
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const headers = rows[0]
    const visibleColumns = CLIENT_COLUMNS[sheet]
    let data = rows.slice(1).map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((header: string, index: number) => {
        if (!visibleColumns || visibleColumns.has(header)) obj[header] = row[index] || ''
      })
      return obj
    })

    if (auth.user.role === 'kasir' && auth.user.branch && (sheet === 'orders' || sheet === 'customers')) {
      if (sheet === 'orders') {
        data = data.filter(row => row.branch === auth.user.branch)
      } else {
        const orderResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${ORDERS_SHEET}!A:Z`,
        })
        const orderRows = orderResponse.data.values || []
        const orderHeaders = orderRows[0] || []
        const customerIdsInBranch = new Set(
          orderRows.slice(1)
            .filter(row => row[orderHeaders.indexOf('branch')] === auth.user.branch)
            .map(row => row[orderHeaders.indexOf('customer_id')]),
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
