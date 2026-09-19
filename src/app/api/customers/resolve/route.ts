import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'
import { normalizePhone } from '@/utils/normalizePhone'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

function colLetter(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  }
  return result
}

function parseAliases(value: string | undefined): Array<{ name: string; branch: string; first_seen_at: string; last_seen_at: string }> {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((alias) => alias && typeof alias.name === 'string') : []
  } catch {
    return []
  }
}

function parseBranches(value: string | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((branch): branch is string => typeof branch === 'string') : []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!phone || !name) {
      return NextResponse.json({ error: 'Nomor telepon dan nama wajib diisi' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })
    const rows = response.data.values || []
    const headers = [...(rows[0] || [])]
    const columnsToMigrate = ['aliases', 'branch_memberships'].filter((column) => !headers.includes(column))
    if (columnsToMigrate.length > 0) {
      headers.push(...columnsToMigrate)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A1:${colLetter(headers.length - 1)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      })
    }
    const phoneIndex = headers.indexOf('phone_normalized')
    const idIndex = headers.indexOf('id')
    const matchIndex = rows.findIndex((row, index) => index > 0 && row[phoneIndex] === normalizedPhone)
    const now = new Date().toISOString()
    const requestedBranch = typeof body.branch === 'string' ? body.branch.trim() : ''
    const branch = auth.user.role === 'kasir' ? auth.user.branch : requestedBranch || auth.user.branch

    if (matchIndex === -1) {
      const customerId = crypto.randomUUID()
      const values = headers.map((header: string) => {
        if (header === 'id') return customerId
        if (header === 'phone_normalized') return normalizedPhone
        if (header === 'name') return name
        if (header === 'first_order_date') return body.first_order_date || now.slice(0, 10)
        if (header === 'created_at') return now
        if (header === 'version') return '1'
        if (header === 'branch') return branch
        if (header === 'order_count') return '0'
        if (header === 'aliases') return '[]'
        if (header === 'branch_memberships') return JSON.stringify(branch ? [branch] : [])
        return ''
      })
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      })
      return NextResponse.json({ customer_id: customerId, phone_normalized: normalizedPhone, name, created: true })
    }

    const row = [...rows[matchIndex]]
    while (row.length < headers.length) row.push('')
    const existingName = row[headers.indexOf('name')] || ''
    const aliasesIndex = headers.indexOf('aliases')
    const membershipsIndex = headers.indexOf('branch_memberships')
    const aliases = parseAliases(aliasesIndex >= 0 ? row[aliasesIndex] : '')
    const memberships = parseBranches(membershipsIndex >= 0 ? row[membershipsIndex] : '')
    if (branch && !memberships.includes(branch)) memberships.push(branch)
    if (existingName && existingName !== name && !aliases.some((alias) => alias.name === existingName && alias.branch === branch)) {
      aliases.push({ name: existingName, branch, first_seen_at: row[headers.indexOf('created_at')] || now, last_seen_at: now })
    }
    const nameIndex = headers.indexOf('name')
    if (nameIndex >= 0) row[nameIndex] = name
    if (aliasesIndex >= 0) row[aliasesIndex] = JSON.stringify(aliases)
    if (membershipsIndex >= 0) row[membershipsIndex] = JSON.stringify(memberships)
    if (nameIndex >= 0 || aliasesIndex >= 0 || membershipsIndex >= 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A${matchIndex + 1}:${colLetter(headers.length - 1)}${matchIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      })
    }

    const customerId = row[idIndex]
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })
    const orderRows = ordersResponse.data.values || []
    const orderHeaders = orderRows[0] || []
    const hasOtherBranchActivity = branch
      ? orderRows.slice(1).some((order) => order[orderHeaders.indexOf('customer_id')] === customerId && order[orderHeaders.indexOf('branch')] !== branch)
      : false

    return NextResponse.json({
      customer_id: customerId,
      phone_normalized: normalizedPhone,
      name,
      created: false,
      has_other_branch_activity: hasOtherBranchActivity,
    })
  } catch (error) {
    console.error('Error resolving customer:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memproses customer' }, { status: 500 })
  }
}
