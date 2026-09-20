import { NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { normalizePhone } from '@/utils/normalizePhone'
import { generateId } from '@/utils/generateId'
import { authenticatedUser } from '@/lib/apiAuth'

const STAGING_SHEETS = ['staging_cmh', 'staging_bdg']

interface StagingRow {
  tanggal: string
  nama: string
  tipe_order: string
  no_telp: string
  branch: string
  rowIndex: number
}

function mapChannel(tipeOrder: string): string {
  const tipe = tipeOrder.toLowerCase().trim()
  if (tipe.includes('dine') || tipe.includes('makan')) return 'dine_in'
  if (tipe.includes('take') || tipe.includes('bawa')) return 'takeaway'
  if (tipe.includes('gofood') || tipe.includes('gojek')) return 'gofood'
  if (tipe.includes('grab')) return 'grab'
  if (tipe.includes('shopee')) return 'shopee'
  if (tipe.includes('wa') || tipe.includes('whatsapp')) return 'whatsapp'
  return 'custom'
}

export async function POST() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    let totalImported = 0
    let totalSkipped = 0
    const errors: string[] = []

    // Get existing customers and orders for dedup
    const [customersRes, ordersRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'customers!A:Z' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'orders!A:Z' }),
    ])

    const existingCustomers = customersRes.data.values || []
    const existingOrders = ordersRes.data.values || []
    const customerHeaders = existingCustomers[0] || []
    const orderHeaders = existingOrders[0] || []

    // Build phone -> customer lookup
    const phoneToCustomer = new Map<string, Record<string, string>>()
    for (let i = 1; i < existingCustomers.length; i++) {
      const row = existingCustomers[i]
      if (row[1]) { // phone_normalized is column B
        phoneToCustomer.set(row[1], {
          id: row[0],
          phone_normalized: row[1],
          name: row[2],
        })
        // Also index without leading 0
        const noZero = row[1].replace(/^0/, '')
        phoneToCustomer.set(noZero, {
          id: row[0],
          phone_normalized: row[1],
          name: row[2],
        })
      }
    }

    // Build set of existing orders for dedup: "date|customer_id|channel"
    const existingOrderKeys = new Set<string>()
    for (let i = 1; i < existingOrders.length; i++) {
      const row = existingOrders[i]
      if (row[1] && row[2] && row[3]) {
        existingOrderKeys.add(`${row[2]}|${row[1]}|${row[3]}`)
      }
    }

    // Process each staging sheet
    for (const sheetName of STAGING_SHEETS) {
      const branch = sheetName === 'staging_cmh' ? 'CMH' : 'BDG'

      let stagingRes
      try {
        stagingRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:E`,
        })
      } catch {
        // Sheet doesn't exist yet, skip
        continue
      }

      const rows = stagingRes.data.values || []
      if (rows.length <= 1) continue // empty or header only

      const header = rows[0].map((h: string) => h.toLowerCase().trim())
      const tglIdx = header.indexOf('tanggal')
      const namaIdx = header.indexOf('nama')
      const tipeIdx = header.indexOf('tipe_order') !== -1 ? header.indexOf('tipe_order') : header.indexOf('tipe')
      const telpIdx = header.indexOf('no_telp') !== -1 ? header.indexOf('no_telp') : header.indexOf('telepon')

      if (tglIdx === -1 || namaIdx === -1 || telpIdx === -1) {
        errors.push(`${sheetName}: header tidak valid. Butuh: tanggal, nama, tipe_order, no_telp`)
        continue
      }

      const rowsToUpdate: Array<{ rowIndex: number; values: string[] }> = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const tanggal = row[tglIdx]?.trim() || ''
        const nama = row[namaIdx]?.trim() || ''
        const tipeOrder = tipeIdx !== -1 ? (row[tipeIdx]?.trim() || '') : 'custom'
        const noTelp = row[telpIdx]?.trim() || ''

        if (!tanggal || !nama || !noTelp) continue

        const phone = normalizePhone(noTelp)
        const channel = mapChannel(tipeOrder)

        // Find or create customer
        let customerId = ''
        const existing = phoneToCustomer.get(phone) || phoneToCustomer.get(phone.replace(/^0/, ''))
        if (existing) {
          customerId = existing.id
        } else {
          // Create new customer
          customerId = generateId()
          const newCustomer = {
            id: customerId,
            phone_normalized: phone,
            name: nama,
            first_order_date: tanggal,
            created_at: new Date().toISOString(),
            branch,
          }
          const customerValues = customerHeaders.map((header: string) => {
            if (header === 'id') return newCustomer.id
            if (header === 'phone_normalized') return newCustomer.phone_normalized
            if (header === 'name') return newCustomer.name
            if (header === 'first_order_date') return newCustomer.first_order_date
            if (header === 'created_at') return newCustomer.created_at
            if (header === 'version') return '1'
            if (header === 'branch') return newCustomer.branch
            if (header === 'order_count') return '0'
            if (header === 'aliases') return '[]'
            if (header === 'branch_memberships') return JSON.stringify([branch])
            return ''
          })
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `customers!A:${String.fromCharCode(64 + customerHeaders.length)}`,
            valueInputOption: 'RAW',
            requestBody: { values: [customerValues] },
          })
          phoneToCustomer.set(phone, { id: customerId, phone_normalized: phone, name: nama })
        }

        // Check duplicate order
        const orderKey = `${tanggal}|${customerId}|${channel}`
        if (existingOrderKeys.has(orderKey)) {
          totalSkipped++
          rowsToUpdate.push({ rowIndex: i + 1, values: [...row, 'done'] })
          continue
        }

        // Create order
        const newOrder = {
          id: generateId(),
          customer_id: customerId,
          order_date: tanggal,
          channel,
          raw_phone_input: noTelp,
          created_at: new Date().toISOString(),
          branch,
        }
        const orderValues = orderHeaders.map((header: string) => {
          if (header === 'id') return newOrder.id
          if (header === 'customer_id') return newOrder.customer_id
          if (header === 'order_date') return newOrder.order_date
          if (header === 'channel') return newOrder.channel
          if (header === 'raw_phone_input') return newOrder.raw_phone_input
          if (header === 'created_at') return newOrder.created_at
          if (header === 'branch') return newOrder.branch
          return ''
        })
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `orders!A:${String.fromCharCode(64 + orderHeaders.length)}`,
          valueInputOption: 'RAW',
          requestBody: { values: [orderValues] },
        })

        existingOrderKeys.add(orderKey)
        totalImported++
        rowsToUpdate.push({ rowIndex: i + 1, values: [...row, 'done'] })
      }

      // Batch update status column
      if (rowsToUpdate.length > 0) {
        const data = rowsToUpdate.map(r => ({
          range: `${sheetName}!E${r.rowIndex}`,
          values: [['done']],
        }))

        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      skipped: totalSkipped,
      errors,
    })
  } catch (error) {
    console.error('Sync staging error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 },
    )
  }
}
