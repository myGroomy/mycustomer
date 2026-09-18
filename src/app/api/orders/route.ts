import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { getSessionCookie } from '@/lib/sessionServer'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

export async function POST(request: NextRequest) {
  // Auth minimal — cek session cookie
  const session = await getSessionCookie()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized — silakan login ulang' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customer_id, order_date, channel, raw_phone_input, branch, alias_note } = body

    if (!customer_id || !order_date || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, order_date, channel' },
        { status: 400 },
      )
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    // 1. Baca semua data customers untuk cari index customer yang benar
    const customersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })

    const customerRows = customersResponse.data.values || []
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'Customers sheet is empty' }, { status: 500 })
    }

    const customerHeaders = customerRows[0]
    const customerRowIndex = customerRows.findIndex(
      (row, idx) => idx > 0 && row[customerHeaders.indexOf('id')] === customer_id,
    )

    if (customerRowIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerRow = customerRows[customerRowIndex]
    const orderCountCol = customerHeaders.indexOf('order_count')
    const currentCount = orderCountCol >= 0 ? parseInt(customerRow[orderCountCol] || '0', 10) : 0

    // 2. Generate ID untuk order baru
    const orderId = crypto.randomUUID()

    // 3. Tulis order baru ke orders sheet
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })

    const orderRows = ordersResponse.data.values || []
    const orderHeaders = orderRows.length > 0 ? orderRows[0] : []

    const newOrderValues = orderHeaders.map((header: string) => {
      switch (header) {
        case 'id': return orderId
        case 'customer_id': return customer_id
        case 'order_date': return order_date
        case 'channel': return channel
        case 'raw_phone_input': return raw_phone_input || ''
        case 'created_at': return new Date().toISOString()
        case 'branch': return branch || ''
        default: return ''
      }
    })

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newOrderValues] },
    })

    // 4. Update order_count + description di customers sheet (satu operasi server-side)
    const newCount = currentCount + 1
    const rowToWrite = [...customerRow]
    while (rowToWrite.length < customerHeaders.length) rowToWrite.push('')

    if (orderCountCol >= 0) {
      rowToWrite[orderCountCol] = String(newCount)
    }

    const descCol = customerHeaders.indexOf('description')
    if (alias_note && descCol >= 0) {
      const existingDesc = rowToWrite[descCol] || ''
      rowToWrite[descCol] = existingDesc ? `${existingDesc}\n${alias_note}` : alias_note
    }

    const lastColLetter = String.fromCharCode(65 + Math.min(customerHeaders.length - 1, 25))
    const rowUpdateRange = `${CUSTOMERS_SHEET}!A${customerRowIndex + 1}:${lastColLetter}${customerRowIndex + 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowUpdateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowToWrite] },
    })

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_count: newCount,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 },
    )
  }
}
