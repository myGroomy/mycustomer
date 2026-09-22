import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { normalizePhone } from '@/utils/normalizePhone'
import { generateId } from '@/utils/generateId'
import { authenticatedUser } from '@/lib/apiAuth'

export interface ImportOrderRow {
  phone: string
  name?: string
  order_date: string
  channel: string
  branch?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const rows: ImportOrderRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    }
    if (rows.length > 10000) {
      return NextResponse.json({ error: 'Maksimal 10000 baris per import' }, { status: 400 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    // 1. Read customers
    const customersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'customers!A:Z',
    })
    const customerRows = customersResponse.data.values || []
    const customerHeaders = customerRows[0] || []
    if (customerHeaders.length === 0) {
      return NextResponse.json({ error: 'Sheet customers belum memiliki header' }, { status: 400 })
    }

    const phoneIdx = customerHeaders.indexOf('phone_normalized')
    const idIdx = customerHeaders.indexOf('id')
    const orderCountIdx = customerHeaders.indexOf('order_count')
    const branchMembershipsIdx = customerHeaders.indexOf('branch_memberships')

    // Build phone → row index map (fast lookup)
    const phoneToRow = new Map<string, number>()
    for (let i = 1; i < customerRows.length; i++) {
      const ph = customerRows[i]?.[phoneIdx]
      if (ph) {
        phoneToRow.set(ph, i)
        phoneToRow.set(ph.replace(/^0/, ''), i)
      }
    }

    // 2. Read orders sheet headers
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'orders!A:Z',
    })
    const orderRows = ordersResponse.data.values || []
    const orderHeaders = orderRows[0] || []
    if (orderHeaders.length === 0) {
      return NextResponse.json({ error: 'Sheet orders belum memiliki header' }, { status: 400 })
    }

    // 3. Process each row
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const ordersToAppend: string[][] = []
    const customerUpdates: { rowIndex: number; newCount: number; memberships?: string[] }[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const line = i + 2
      const rawPhone = r.phone?.trim() || ''
      const orderDate = r.order_date?.trim() || ''
      const channel = r.channel?.trim() || ''

      if (!rawPhone || !orderDate || !channel) {
        errors.push(`Baris ${line}: no WA, tanggal order, & channel wajib diisi`)
        continue
      }

      const phone = normalizePhone(rawPhone)
      if (!phone) {
        errors.push(`Baris ${line}: no WhatsApp tidak valid`)
        continue
      }

      const customerRowIndex = phoneToRow.get(phone)
      if (customerRowIndex === undefined) {
        skipped++
        errors.push(`Baris ${line}: customer dengan no WA ${rawPhone} tidak ditemukan`)
        continue
      }

      const customerId = customerRows[customerRowIndex]?.[idIdx] || ''
      const branchRaw = r.branch?.trim().toUpperCase() || ''
      const branch = branchRaw === 'BDG' ? 'BDG' : branchRaw === 'CMH' ? 'CMH' : ''

      // Build order row
      const orderId = generateId()
      const now = new Date().toISOString()
      const orderValues = orderHeaders.map((header: string) => {
        switch (header) {
          case 'id': return orderId
          case 'customer_id': return customerId
          case 'order_date': return orderDate
          case 'channel': return channel
          case 'raw_phone_input': return rawPhone
          case 'created_at': return now
          case 'branch': return branch
          default: return ''
        }
      })
      ordersToAppend.push(orderValues)

      // Update customer order_count + branch_memberships
      const currentCount = orderCountIdx >= 0 ? parseInt(customerRows[customerRowIndex]?.[orderCountIdx] || '0', 10) : 0
      const newCount = currentCount + 1

      let memberships: string[] = []
      if (branchMembershipsIdx >= 0) {
        try { memberships = JSON.parse(customerRows[customerRowIndex]?.[branchMembershipsIdx] || '[]') } catch { memberships = [] }
        if (branch && !memberships.includes(branch)) memberships.push(branch)
      }

      customerUpdates.push({ rowIndex: customerRowIndex, newCount, memberships: branch && branchMembershipsIdx >= 0 ? memberships : undefined })
      imported++
    }

    // 4. Batch append orders
    if (ordersToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'orders!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: ordersToAppend },
      })
    }

    // 5. Batch update customer order_counts
    const colLetter = (idx: number): string => {
      let result = ''
      for (let v = idx + 1; v > 0; v = Math.floor((v - 1) / 26)) {
        result = String.fromCharCode(65 + ((v - 1) % 26)) + result
      }
      return result
    }

    for (const update of customerUpdates) {
      const rowIdx = update.rowIndex + 1
      const updates: Record<string, string> = {}
      if (orderCountIdx >= 0) updates[colLetter(orderCountIdx)] = String(update.newCount)
      if (update.memberships && branchMembershipsIdx >= 0) updates[colLetter(branchMembershipsIdx)] = JSON.stringify(update.memberships)

      if (Object.keys(updates).length > 0) {
        const range = `customers!${colLetter(0)}${rowIdx}:${colLetter(customerHeaders.length - 1)}${rowIdx}`
        const existingRow = [...(customerRows[update.rowIndex] || [])]
        while (existingRow.length < customerHeaders.length) existingRow.push('')
        if (orderCountIdx >= 0) existingRow[orderCountIdx] = String(update.newCount)
        if (update.memberships && branchMembershipsIdx >= 0) existingRow[branchMembershipsIdx] = JSON.stringify(update.memberships)
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: { values: [existingRow] },
        })
      }
    }

    return NextResponse.json({ success: true, imported, skipped, errors })
  } catch (error) {
    console.error('Import orders error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
