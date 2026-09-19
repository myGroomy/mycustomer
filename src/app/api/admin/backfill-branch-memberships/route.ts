import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

function columnLetter(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  }
  return result
}

function parseMemberships(value: string | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((branch): branch is string => typeof branch === 'string' && branch.trim().length > 0)
      : []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const apply = body.apply === true
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const [customersResponse, ordersResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A:Z`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${ORDERS_SHEET}!A:Z`,
      }),
    ])

    const customerRows = customersResponse.data.values || []
    const orderRows = ordersResponse.data.values || []
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'Customers sheet kosong' }, { status: 400 })
    }

    const customerHeaders = [...(customerRows[0] as string[])]
    const orderHeaders = (orderRows[0] || []) as string[]
    const customerIdIndex = customerHeaders.indexOf('id')
    const legacyBranchIndex = customerHeaders.indexOf('branch')
    const orderCustomerIdIndex = orderHeaders.indexOf('customer_id')
    const orderBranchIndex = orderHeaders.indexOf('branch')

    if (customerIdIndex === -1 || orderCustomerIdIndex === -1 || orderBranchIndex === -1) {
      return NextResponse.json({ error: 'Kolom id/customer_id/branch wajib tersedia' }, { status: 400 })
    }

    const membershipsIndex = customerHeaders.indexOf('branch_memberships')
    if (membershipsIndex === -1) customerHeaders.push('branch_memberships')
    const targetMembershipsIndex = customerHeaders.indexOf('branch_memberships')

    const branchesByCustomer = new Map<string, Set<string>>()
    for (const row of orderRows.slice(1)) {
      const customerId = row[orderCustomerIdIndex]
      const branch = row[orderBranchIndex]?.trim()
      if (!customerId || !branch) continue
      if (!branchesByCustomer.has(customerId)) branchesByCustomer.set(customerId, new Set())
      branchesByCustomer.get(customerId)!.add(branch)
    }

    const updates: Array<{ row: number; customer_id: string; branches: string[] }> = []
    for (let index = 1; index < customerRows.length; index += 1) {
      const row = [...customerRows[index]]
      while (row.length < customerHeaders.length) row.push('')
      const customerId = row[customerIdIndex]
      if (!customerId) continue

      const branches = new Set(parseMemberships(row[targetMembershipsIndex]))
      const legacyBranch = legacyBranchIndex >= 0 ? row[legacyBranchIndex]?.trim() : ''
      if (legacyBranch) branches.add(legacyBranch)
      for (const branch of branchesByCustomer.get(customerId) || []) branches.add(branch)

      const nextValue = JSON.stringify([...branches].sort())
      if (row[targetMembershipsIndex] !== nextValue) {
        updates.push({ row: index + 1, customer_id: customerId, branches: [...branches].sort() })
        if (apply) row[targetMembershipsIndex] = nextValue
      }
    }

    if (apply && updates.length > 0) {
      if (membershipsIndex === -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${CUSTOMERS_SHEET}!A1:${columnLetter(customerHeaders.length - 1)}1`,
          valueInputOption: 'RAW',
          requestBody: { values: [customerHeaders] },
        })
      }

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates.map((update) => ({
            range: `${CUSTOMERS_SHEET}!${columnLetter(targetMembershipsIndex)}${update.row}`,
            values: [[JSON.stringify(update.branches)]],
          })),
        },
      })
    } else if (apply && membershipsIndex === -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A1:${columnLetter(customerHeaders.length - 1)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [customerHeaders] },
      })
    }

    return NextResponse.json({
      success: true,
      dry_run: !apply,
      updated_count: updates.length,
      preview: updates.slice(0, 100),
    })
  } catch (error) {
    console.error('Error backfilling branch memberships:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal melakukan backfill membership cabang' },
      { status: 500 },
    )
  }
}
