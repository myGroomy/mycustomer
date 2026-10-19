import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { normalizePhone } from '@/utils/normalizePhone'
import { generateId } from '@/utils/generateId'
import { authenticatedUser } from '@/lib/apiAuth'
import { invalidateSheetCache } from '@/lib/sheetCache'

export interface ImportOrderRow {
  phone: string
  name?: string
  order_date: string
  channel: string
  branch?: string
}

export interface ImportOrdersRequestBody {
  rows: ImportOrderRow[]
  /** true hanya pada chunk terakhir — server menghitung klasifikasi global */
  finalize?: boolean
  /** threshold retensi dari client (hari) */
  activeDays?: number
  atRiskDays?: number
}

interface CustomerAlias {
  name: string
  branch: string
  first_seen_at: string
  last_seen_at: string
}

function colLetter(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  }
  return result
}

function parseAliases(value: string | undefined): CustomerAlias[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((a) => a && typeof a.name === 'string')
      : []
  } catch {
    return []
  }
}

function parseBranches(value: string | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((b): b is string => typeof b === 'string')
      : []
  } catch {
    return []
  }
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Klasifikasi retensi dari tanggal order terakhir (YYYY-MM-DD). */
function classifyStatus(lastDate: string, today: string, activeDays: number, atRiskDays: number): 'active' | 'at_risk' | 'churned' {
  if (!lastDate || lastDate > today) return 'active'
  const days = Math.floor(
    (new Date(today + 'T00:00:00Z').getTime() - new Date(lastDate + 'T00:00:00Z').getTime()) / 86400000,
  )
  if (days <= activeDays) return 'active'
  if (days <= atRiskDays) return 'at_risk'
  return 'churned'
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = (await request.json()) as ImportOrdersRequestBody
    const rows: ImportOrderRow[] = Array.isArray(body.rows) ? body.rows : []
    const finalize = body.finalize === true
    const activeDays = Number.isFinite(body.activeDays) && (body.activeDays as number) > 0 ? Number(body.activeDays) : 30
    const atRiskDays = Number.isFinite(body.atRiskDays) && (body.atRiskDays as number) > 0 ? Number(body.atRiskDays) : 60
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: 'Maksimal 500 baris per chunk. Bagi file menjadi beberapa bagian.' }, { status: 400 })
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
    const firstOrderIdx = customerHeaders.indexOf('first_order_date')
    const createdAtIdx = customerHeaders.indexOf('created_at')
    const versionIdx = customerHeaders.indexOf('version')
    const orderCountIdx = customerHeaders.indexOf('order_count')
    const aliasesIdx = customerHeaders.indexOf('aliases')
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

    // ── 3. Pass 1: validasi + agregat per no telp ──
    // Aturan: no telp = unique key. Agregat menghitung (per phone):
    // - count: total baris order | minDate: tanggal order terkecil
    // - maxDateRow: tanggal terbesar + nama & cabang baris tanggal itu
    // - branches: semua cabang berbeda | names: nama berbeda (nama → tanggal terbesar)
    interface PhoneAgg {
      count: number
      minDate: string
      maxDate: string
      maxDateName: string
      branches: string[]
      names: Map<string, { maxDate: string; minDate: string; branch: string }>
    }
    const valid: Array<{
      line: number
      phone: string
      name: string
      orderDate: string
      channel: string
      branch: string
      rawPhone: string
    }> = []
    const errors: string[] = []
    const phoneAggs = new Map<string, PhoneAgg>()

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

      const branchRaw = r.branch?.trim().toUpperCase() || ''
      const branch = branchRaw === 'BDG' ? 'BDG' : branchRaw === 'CMH' ? 'CMH' : ''
      const name = r.name?.trim() || ''

      valid.push({ line, phone, name, orderDate, channel, branch, rawPhone })

      let agg = phoneAggs.get(phone)
      if (!agg) {
        agg = { count: 0, minDate: orderDate, maxDate: orderDate, maxDateName: name, branches: [], names: new Map() }
        phoneAggs.set(phone, agg)
      }
      agg.count++
      if (orderDate < agg.minDate) agg.minDate = orderDate
      if (orderDate >= agg.maxDate) {
        agg.maxDate = orderDate
        if (name) agg.maxDateName = name
      }
      if (branch && !agg.branches.includes(branch)) agg.branches.push(branch)
      if (name) {
        const entry = agg.names.get(name)
        if (!entry) {
          agg.names.set(name, { maxDate: orderDate, minDate: orderDate, branch })
        } else {
          if (orderDate > entry.maxDate) {
            entry.maxDate = orderDate
            entry.branch = branch || entry.branch
          }
          if (orderDate < entry.minDate) entry.minDate = orderDate
        }
      }
    }

    // ── 4. Pass 2: tulis customer (baru / promosi nama + alias) ──
    // newCustomersToAppend: baris SIAP TULIS penuh (header → nilai)
    // customerUpdates: { rowIndex, fields } — diterapkan via batchUpdate tunggal
    const newCustomersToAppend: string[][] = []
    const phoneToNewIdx = new Map<string, number>() // phone → index di newCustomersToAppend
    const customerUpdates = new Map<number, Record<string, string>>()
    let aliasesAdded = 0
    const now = new Date().toISOString()

    for (const [phone, agg] of phoneAggs) {
      const canonicalName = agg.maxDateName // nama baris tanggal terbaru di chunk
      const rowIndex = phoneToRow.get(phone)

      if (rowIndex === undefined) {
        // ── Customer baru: buat dari agregat chunk ──
        const customerId = crypto.randomUUID()
        // Alias = semua nama selain kanonis (history tanggal order)
        const aliases: CustomerAlias[] = []
        for (const [aliasName, info] of agg.names) {
          if (!sameName(aliasName, canonicalName)) {
            aliases.push({ name: aliasName, branch: info.branch, first_seen_at: info.minDate, last_seen_at: info.maxDate })
          }
        }
        aliasesAdded += aliases.length
        const row: Record<string, string> = {
          id: customerId,
          phone_normalized: phone,
          name: canonicalName,
          first_order_date: agg.minDate,
          created_at: now,
          version: '1',
          branch: agg.branches[0] || 'CMH',
          order_count: String(agg.count),
          description: '',
          age_range: '',
          usia: '',
          gender: '',
          jenis_kelamin: '',
          aliases: JSON.stringify(aliases),
          branch_memberships: JSON.stringify(agg.branches),
        }
        phoneToNewIdx.set(phone, newCustomersToAppend.length)
        newCustomersToAppend.push(customerHeaders.map((h: string) => row[h] ?? ''))
      } else {
        // ── Customer sudah ada: promosi nama terbaru + catat alias ──
        const existingRow = customerRows[rowIndex] || []
        const existingName = (nameIdx >= 0 ? existingRow[nameIdx] : '') || ''
        const existingAliases = aliasesIdx >= 0 ? parseAliases(existingRow[aliasesIdx]) : []
        const existingMemberships = branchMembershipsIdx >= 0 ? parseBranches(existingRow[branchMembershipsIdx]) : []

        // Nama yang menang = nama baris tanggal terbaru di chunk (kalau ada);
        // kalau chunk tidak bawa nama, pertahankan nama existing.
        const newCanonical = canonicalName || existingName

        // Alias = nama lama existing + nama lain di chunk, kecuali kanonis baru
        const merged: CustomerAlias[] = [...existingAliases]
        // Nama lama existing yang digantikan → alias (aturannya sama dengan resolve)
        if (existingName && newCanonical && !sameName(existingName, newCanonical)
          && !merged.some((a) => sameName(a.name, existingName))) {
          merged.push({
            name: existingName,
            branch: agg.branches[0] || '',
            first_seen_at: (createdAtIdx >= 0 ? existingRow[createdAtIdx] : '') || '',
            last_seen_at: agg.maxDate,
          })
          aliasesAdded++
        }
        // Nama lain dari chunk → alias dengan history tanggalnya
        // NOTE: tanggal alias yang sudah ada tidak diubah dari chunk ini
        for (const [aliasName, info] of agg.names) {
          if (!aliasName || sameName(aliasName, newCanonical)) continue
          if (merged.some((a) => sameName(a.name, aliasName))) continue
          merged.push({ name: aliasName, branch: info.branch, first_seen_at: info.minDate, last_seen_at: info.maxDate })
          aliasesAdded++
        }

        const newMemberships = [...existingMemberships]
        for (const b of agg.branches) {
          if (b && !newMemberships.includes(b)) newMemberships.push(b)
        }

        const existingCount = orderCountIdx >= 0 ? parseInt(existingRow[orderCountIdx] || '0', 10) : 0
        const existingFirst = (firstOrderIdx >= 0 ? existingRow[firstOrderIdx] : '') || ''
        const fields: Record<string, string> = {}
        if (orderCountIdx >= 0) fields['order_count'] = String(existingCount + agg.count)
        // first_order_date = tanggal terkecil yang pernah ada (existing vs chunk)
        if (firstOrderIdx >= 0 && (!existingFirst || agg.minDate < existingFirst)) {
          fields['first_order_date'] = agg.minDate
        }
        if (nameIdx >= 0 && newCanonical !== existingName) fields['name'] = newCanonical
        if (aliasesIdx >= 0) fields['aliases'] = JSON.stringify(merged)
        if (branchMembershipsIdx >= 0) fields['branch_memberships'] = JSON.stringify(newMemberships)
        if (versionIdx >= 0) {
          fields['version'] = String(parseInt(existingRow[versionIdx] || '1', 10) + 1)
        }
        customerUpdates.set(rowIndex, fields)
      }
    }

    // ── 5. Tulis: append customer baru, batchUpdate customer existing ──
    if (newCustomersToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'customers!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: newCustomersToAppend },
      })
    }

    if (customerUpdates.size > 0) {
      const data = [...customerUpdates.entries()].map(([rowIndex, fields]) => {
        const lastCol = colLetter(customerHeaders.length - 1)
        return {
          range: `customers!A${rowIndex + 1}:${lastCol}${rowIndex + 1}`,
          values: [
            customerHeaders.map((header: string) => {
              if (header in fields) return fields[header]
              return customerRows[rowIndex]?.[customerHeaders.indexOf(header)] || ''
            }),
          ],
        }
      })
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: 'RAW', data },
      })
    }

    // ── 6. Tulis orders (id customer sudah final) ──
    const ordersToAppend: string[][] = []
    for (const v of valid) {
      const rowIndex = phoneToRow.get(v.phone)
      let customerId: string
      if (rowIndex !== undefined) {
        customerId = customerRows[rowIndex]?.[idIdx] || ''
      } else {
        const pendingIdx = phoneToNewIdx.get(v.phone)
        customerId = pendingIdx !== undefined ? newCustomersToAppend[pendingIdx][idIdx] || '' : ''
      }
      const orderId = generateId()
      const createdAt = new Date().toISOString()
      const orderValues = orderHeaders.map((header: string) => {
        switch (header) {
          case 'id': return orderId
          case 'customer_id': return customerId
          case 'order_date': return v.orderDate
          case 'channel': return v.channel
          case 'raw_phone_input': return v.rawPhone
          case 'created_at': return createdAt
          case 'branch': return v.branch
          default: return ''
        }
      })
      ordersToAppend.push(orderValues)
    }
    const imported = ordersToAppend.length
    if (ordersToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'orders!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: ordersToAppend },
      })
    }

    // ── 7. Invalidate cache (orders + customers berubah) ──
    if (ordersToAppend.length > 0 || newCustomersToAppend.length > 0 || customerUpdates.size > 0) {
      await invalidateSheetCache(['customers', 'orders'])
    }

    // ── 8. Klasifikasi global (hanya saat finalize) ──
    // Klasifikasi retensi adalah fungsi dari HARI INI → dihitung dari order
    // terakhir customer di sheet (bukan disimpan), supaya tidak pernah basi.
    let classification: { active: number; at_risk: number; churned: number } | undefined
    if (finalize) {
      const [custRes, ordRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'customers!A:Z' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'orders!A:Z' }),
      ])
      const allCustomers = custRes.data.values || []
      const allOrders = ordRes.data.values || []
      const cHeaders = allCustomers[0] || []
      const oHeaders = allOrders[0] || []
      const cIdIdx = cHeaders.indexOf('id')
      const cFirstIdx = cHeaders.indexOf('first_order_date')
      const oCustIdx = oHeaders.indexOf('customer_id')
      const oDateIdx = oHeaders.indexOf('order_date')
      const lastByCustomer = new Map<string, string>()
      for (let i = 1; i < allOrders.length; i++) {
        const cid = allOrders[i]?.[oCustIdx]
        const d = allOrders[i]?.[oDateIdx] || ''
        if (!cid || !d) continue
        const prev = lastByCustomer.get(cid)
        if (!prev || d > prev) lastByCustomer.set(cid, d)
      }
      const today = new Date().toISOString().slice(0, 10)
      classification = { active: 0, at_risk: 0, churned: 0 }
      for (let i = 1; i < allCustomers.length; i++) {
        const cid = allCustomers[i]?.[cIdIdx]
        const first = allCustomers[i]?.[cFirstIdx] || ''
        const last = lastByCustomer.get(cid || '') || first
        classification[classifyStatus(last, today, activeDays, atRiskDays)]++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      customers_created: newCustomersToAppend.length,
      aliases_added: aliasesAdded,
      errors,
      ...(classification ? { classification } : {}),
    })
  } catch (error) {
    console.error('Import orders error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
