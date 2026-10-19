import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'
import { normalizePhone } from '@/utils/normalizePhone'
import { invalidateSheetCache } from '@/lib/sheetCache'

const CUSTOMERS_SHEET = 'customers'
const ORDERS_SHEET = 'orders'

// Per-customer mutex: serialisasi read-modify-write order_count
// agar concurrent POST tidak lost-update.
const customerLocks = new Map<string, Promise<unknown>>()

async function withCustomerLock<T>(customerId: string, fn: () => Promise<T>): Promise<T> {
  const prev = customerLocks.get(customerId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const next = prev.then(() => gate, () => gate)
  customerLocks.set(customerId, next)
  try {
    await prev.catch(() => {})
    return await fn()
  } finally {
    release()
    if (customerLocks.get(customerId) === next) {
      customerLocks.delete(customerId)
    }
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { customer_id, order_date, channel, raw_phone_input, branch: requestedBranch, alias_name, usia, jenis_kelamin } = body

    if (!customer_id || !order_date || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, order_date, channel' },
        { status: 400 },
      )
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()
    const branch = auth.user.role === 'kasir'
      ? auth.user.branch
      : (typeof requestedBranch === 'string' ? requestedBranch.trim() : '') || auth.user.branch
    if (!branch) {
      return NextResponse.json({ error: 'Cabang order wajib dipilih' }, { status: 400 })
    }

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

    // 2. Generate ID untuk order baru
    const orderId = crypto.randomUUID()

    // 3. Baca orders (untuk cek akses kasir)
    const ordersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })

    const orderRows = ordersResponse.data.values || []
    const orderHeaders = orderRows.length > 0 ? orderRows[0] : []
    if (auth.user.role === 'kasir' && branch) {
      const orderCustomerIndex = orderHeaders.indexOf('customer_id')
      const orderBranchIndex = orderHeaders.indexOf('branch')
      const customerHasBranchAccess = orderRows.slice(1).some(
        row => row[orderCustomerIndex] === customer_id && row[orderBranchIndex] === branch,
      )
      const customerBranchIndex = customerHeaders.indexOf('branch')
      const membershipIndex = customerHeaders.indexOf('branch_memberships')
      let memberships: string[] = []
      try {
        memberships = membershipIndex >= 0 ? JSON.parse(customerRow[membershipIndex] || '[]') : []
      } catch {
        memberships = []
      }
      const customerBelongsToBranch =
        (customerBranchIndex >= 0 && customerRow[customerBranchIndex] === branch) ||
        (Array.isArray(memberships) && memberships.includes(branch)) ||
        normalizePhone(raw_phone_input || '') === customerRow[customerHeaders.indexOf('phone_normalized')]
      if (!customerHasBranchAccess && !customerBelongsToBranch) {
        return NextResponse.json({ error: 'Customer tidak tersedia di cabang akun ini' }, { status: 403 })
      }
    }

    const newOrderValues = orderHeaders.map((header: string) => {
      switch (header) {
        case 'id': return orderId
        case 'customer_id': return customer_id
        case 'order_date': return order_date
        case 'channel': return channel
        case 'raw_phone_input': return raw_phone_input || ''
        case 'created_at': return new Date().toISOString()
        case 'branch': return branch
        default: return ''
      }
    })

    // 4. Append order + update order_count dalam lock per-customer
    const result = await withCustomerLock(customer_id, async () => {
      // Re-read baris customer di bawah lock untuk dapat count terbaru
      const freshResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A${customerRowIndex + 1}:${String.fromCharCode(65 + Math.min(customerHeaders.length - 1, 25))}${customerRowIndex + 1}`,
      })
      const freshRow = freshResponse.data.values?.[0] || customerRow
      const freshCount = orderCountCol >= 0 ? parseInt(freshRow[orderCountCol] || '0', 10) : 0
      const newCount = freshCount + 1

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${ORDERS_SHEET}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: { values: [newOrderValues] },
      })

      const rowToWrite = [...freshRow]
      while (rowToWrite.length < customerHeaders.length) rowToWrite.push('')

      if (orderCountCol >= 0) {
        rowToWrite[orderCountCol] = String(newCount)
      }

      if (typeof usia === 'string' && usia.trim()) {
        const usiaCol = customerHeaders.indexOf('usia')
        if (usiaCol >= 0) rowToWrite[usiaCol] = usia.trim()
      }

      if (typeof jenis_kelamin === 'string' && jenis_kelamin.trim()) {
        const jenisKelaminCol = customerHeaders.indexOf('jenis_kelamin')
        if (jenisKelaminCol >= 0) rowToWrite[jenisKelaminCol] = jenis_kelamin.trim()
      }

      const aliasesCol = customerHeaders.indexOf('aliases')
      const rowNameIdx = customerHeaders.indexOf('name')
      const rowName = rowNameIdx >= 0 ? (rowToWrite[rowNameIdx] || '') : ''
      // Aturan alias terpadu (konsisten dengan import & resolve):
      // alias_name eksplisit menang; kalau tidak ada, nama params name dari
      // client (kalau beda dari nama existing) ikut naik jadi nama terbaru
      // dan nama lama turun jadi alias. Nama tidak pernah hilang.
      const explicitAlias = (typeof alias_name === 'string' && alias_name.trim()) ? alias_name.trim() : ''
      const nameParam = typeof (body as { name?: unknown }).name === 'string' ? ((body as { name?: string }).name || '').trim() : ''
      if (aliasesCol >= 0) {
        let aliases: Array<{ name: string; branch: string; first_seen_at: string; last_seen_at: string }> = []
        try {
          const parsed = JSON.parse(rowToWrite[aliasesCol] || '[]')
          if (Array.isArray(parsed)) aliases = parsed
        } catch {
          aliases = []
        }
        const now = new Date().toISOString()
        const upsertAlias = (aliasName: string, branchValue: string) => {
          if (!aliasName) return
          const trimmedAlias = aliasName.trim()
          if (!trimmedAlias) return
          const existingAlias = aliases.find((alias) => alias.name.toLowerCase() === trimmedAlias.toLowerCase())
          if (existingAlias) {
            existingAlias.last_seen_at = now
          } else {
            aliases.push({ name: trimmedAlias, branch: branchValue, first_seen_at: now, last_seen_at: now })
          }
        }
        // 1) Nama lama existing yang digantikan param name → jadi alias
        if (rowNameIdx >= 0 && nameParam && rowName && nameParam.toLowerCase() !== rowName.toLowerCase()) {
          upsertAlias(rowName, branch)
          rowToWrite[rowNameIdx] = nameParam
        }
        // 2) Alias eksplisit (dialog "Tambah Alias Customer" di UI)
        if (explicitAlias) {
          upsertAlias(explicitAlias, branch)
        }
        rowToWrite[aliasesCol] = JSON.stringify(aliases)
      }

      const lastColLetter = String.fromCharCode(65 + Math.min(customerHeaders.length - 1, 25))
      const rowUpdateRange = `${CUSTOMERS_SHEET}!A${customerRowIndex + 1}:${lastColLetter}${customerRowIndex + 1}`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: rowUpdateRange,
        valueInputOption: 'RAW',
        requestBody: { values: [rowToWrite] },
      })

      return newCount
    })

    // Orders & order_count customer berubah → invalidate keduanya
    await invalidateSheetCache(['orders', 'customers'])

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_count: result,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    )
  }
}
