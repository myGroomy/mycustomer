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

function colLetter(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  }
  return result
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

    // ── 1. Read customers sheet ──
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
    const nameIdx = customerHeaders.indexOf('name')
    const orderCountIdx = customerHeaders.indexOf('order_count')
    const branchMembershipsIdx = customerHeaders.indexOf('branch_memberships')

    // Build phone → row index map
    const phoneToRow = new Map<string, number>()
    for (let i = 1; i < customerRows.length; i++) {
      const ph = customerRows[i]?.[phoneIdx]
      if (ph) {
        phoneToRow.set(ph, i)
        phoneToRow.set(ph.replace(/^0/, ''), i)
      }
    }

    // ── 2. Read orders sheet headers ──
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'orders!A:Z',
    })
    const orderRows = ordersResponse.data.values || []
    const orderHeaders = orderRows[0] || []
    if (orderHeaders.length === 0) {
      return NextResponse.json({ error: 'Sheet orders belum memiliki header' }, { status: 400 })
    }

    // ── 3. Process each row ──
    let imported = 0
    const createdCustomers = new Set<string>()
    const errors: string[] = []
    const ordersToAppend: string[][] = []
    const customerUpdates: { rowIndex: number; newCount: number; memberships?: string[] }[] = []
    const newCustomersToAppend: string[][] = []
    const newCustomerIndexMap = new Map<string, number>() // phone → pending row index

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

      let customerId: string
      let customerRowIndex: number | undefined = phoneToRow.get(phone)
      const branchRaw = r.branch?.trim().toUpperCase() || ''
      const branch = branchRaw === 'BDG' ? 'BDG' : branchRaw === 'CMH' ? 'CMH' : ''

      if (customerRowIndex !== undefined) {
        // ── Existing customer ──
        customerId = customerRows[customerRowIndex][idIdx] || ''

        // Update order_count
        const currentCount = orderCountIdx >= 0 ? parseInt(customerRows[customerRowIndex]?.[orderCountIdx] || '0', 10) : 0
        const newCount = currentCount + 1
        let memberships: string[] = []
        if (branchMembershipsIdx >= 0) {
          try { memberships = JSON.parse(customerRows[customerRowIndex]?.[branchMembershipsIdx] || '[]') } catch { memberships = [] }
          if (branch && !memberships.includes(branch)) memberships.push(branch)
        }
        customerUpdates.push({
          rowIndex: customerRowIndex,
          newCount,
          memberships: branch && branchMembershipsIdx >= 0 ? memberships : undefined,
        })
      } else if (newCustomerIndexMap.has(phone)) {
        // ── Customer was created in this same import batch ──
        const pendingIdx = newCustomerIndexMap.get(phone)!
        customerId = newCustomersToAppend[pendingIdx][idIdx] || ''
        // Just increment the order count on the pending row
        const currentCount = parseInt(newCustomersToAppend[pendingIdx][orderCountIdx] || '0', 10)
        newCustomersToAppend[pendingIdx][orderCountIdx] = String(currentCount + 1)
        if (branch && branchMembershipsIdx >= 0) {
          try {
            const mems = JSON.parse(newCustomersToAppend[pendingIdx][branchMembershipsIdx] || '[]')
            if (!mems.includes(branch)) {
              mems.push(branch)
              newCustomersToAppend[pendingIdx][branchMembershipsIdx] = JSON.stringify(mems)
            }
          } catch { /* ignore */ }
        }
      } else {
        // ── New customer: auto-create ──
        customerId = crypto.randomUUID()
        const now = new Date().toISOString()
        const customerName = r.name?.trim() || ''

        const newCustomerRow = customerHeaders.map((header: string) => {
          switch (header) {
            case 'id': return customerId
            case 'phone_normalized': return phone
            case 'name': return customerName
            case 'first_order_date': return orderDate
            case 'created_at': return now
            case 'version': return '1'
            case 'branch': return branch || 'CMH'
            case 'order_count': return '1'
            case 'aliases': return '[]'
            case 'branch_memberships': return JSON.stringify(branch ? [branch] : [])
            default: return ''
          }
        })
        const pendingRowIdx = newCustomersToAppend.length
        newCustomersToAppend.push(newCustomerRow)
        newCustomerIndexMap.set(phone, pendingRowIdx)
        createdCustomers.add(rawPhone)
      }

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
      imported++
    }

    // ── 4. Batch append new customers ──
    if (newCustomersToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'customers!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: newCustomersToAppend },
      })
    }

    // ── 5. Batch append orders ──
    if (ordersToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'orders!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: ordersToAppend },
      })
    }

    // ── 6. Batch update existing customer order_counts ──
    for (const update of customerUpdates) {
      const rowIdx = update.rowIndex + 1
      const existingRow = [...(customerRows[update.rowIndex] || [])]
      while (existingRow.length < customerHeaders.length) existingRow.push('')
      if (orderCountIdx >= 0) existingRow[orderCountIdx] = String(update.newCount)
      if (update.memberships && branchMembershipsIdx >= 0) existingRow[branchMembershipsIdx] = JSON.stringify(update.memberships)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `customers!${colLetter(0)}${rowIdx}:${colLetter(customerHeaders.length - 1)}${rowIdx}`,
        valueInputOption: 'RAW',
        requestBody: { values: [existingRow] },
      })
    }

    return NextResponse.json({
      success: true,
      imported,
      customers_created: newCustomersToAppend.length,
      errors,
    })
  } catch (error) {
    console.error('Import orders error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
