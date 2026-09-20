import { NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

export async function POST() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error

  try {
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    // 1. Baca semua orders
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })
    const orderRows = (ordersResponse.data.values || []).slice(1) // skip header

    // 2. Hitung order_count per customer_id
    const countMap: Record<string, number> = {}
    for (const row of orderRows) {
      const ordersHeaders = (ordersResponse.data.values || [])[0] || []
      const customerIdCol = ordersHeaders.indexOf('customer_id')
      const cid = row[customerIdCol]
      if (cid) {
        countMap[cid] = (countMap[cid] || 0) + 1
      }
    }

    // 3. Baca customers
    const customersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })
    const customerRows = customersResponse.data.values || []
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'No customers found' }, { status: 500 })
    }

    const headers = customerRows[0]
    const idCol = headers.indexOf('id')
    const orderCountCol = headers.indexOf('order_count')

    if (orderCountCol < 0) {
      return NextResponse.json({ error: 'order_count column not found in sheet' }, { status: 500 })
    }

    // 4. Update setiap baris customer
    const updates: string[][] = []
    let updated = 0
    for (let i = 1; i < customerRows.length; i++) {
      const cid = customerRows[i][idCol]
      const newCount = countMap[cid] || 0
      const currentCount = parseInt(customerRows[i][orderCountCol] || '0', 10)
      if (currentCount !== newCount) {
        const colLetter = String.fromCharCode(65 + orderCountCol)
        updates.push([`${CUSTOMERS_SHEET}!${colLetter}${i + 1}`, String(newCount)])
        updated++
      }
    }

    // Batch update
    if (updates.length > 0) {
      await Promise.all(
        updates.map(([range, value]) =>
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: { values: [[value]] },
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      total_customers: customerRows.length - 1,
      total_orders: orderRows.length,
      updated,
    })
  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json(
      { error: 'Recalculate failed' },
      { status: 500 },
    )
  }
}
