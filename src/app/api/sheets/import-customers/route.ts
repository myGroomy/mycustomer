import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { normalizePhone } from '@/utils/normalizePhone'
import { generateId } from '@/utils/generateId'
import { authenticatedUser } from '@/lib/apiAuth'

export interface ImportCustomerRow {
  name: string
  phone: string
  branch?: string
  gender?: string
  age_range?: string
  first_order_date?: string
  description?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const rows: ImportCustomerRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    }
    if (rows.length > 10000) {
      return NextResponse.json({ error: 'Maksimal 10000 baris per import' }, { status: 400 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'customers!A:Z',
    })

    const existing = dataResponse.data.values || []
    const headers = existing[0] || []
    if (headers.length === 0) {
      return NextResponse.json({ error: 'Sheet customers belum memiliki header' }, { status: 400 })
    }

    const phoneIdx = headers.indexOf('phone_normalized')
    const seen = new Set<string>()
    for (let i = 1; i < existing.length; i++) {
      const ph = existing[i]?.[phoneIdx]
      if (ph) {
        seen.add(ph)
        seen.add(ph.replace(/^0/, ''))
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    const toAppend: string[][] = []

    rows.forEach((r, i) => {
      const line = i + 2
      const name = r.name?.trim() || ''
      const rawPhone = r.phone?.trim() || ''

      if (!name || !rawPhone) {
        errors.push(`Baris ${line}: nama & no WhatsApp wajib diisi`)
        return
      }
      if (name.length > 150 || rawPhone.length > 40) {
        errors.push(`Baris ${line}: panjang nama atau nomor WhatsApp tidak valid`)
        return
      }

      const phone = normalizePhone(rawPhone)
      if (!phone) {
        errors.push(`Baris ${line}: no WhatsApp tidak valid`)
        return
      }

      if (seen.has(phone) || seen.has(phone.replace(/^0/, ''))) {
        skipped++
        return
      }

      const branchRaw = r.branch?.trim().toUpperCase() || ''
      const branch = branchRaw === 'BDG' ? 'BDG' : branchRaw === 'CMH' ? 'CMH' : ''

      const genderRaw = r.gender?.trim().toUpperCase() || ''
      const gender = genderRaw === 'L' ? 'L' : genderRaw === 'P' ? 'P' : ''

      const firstOrderDate = r.first_order_date?.trim() || today

      const customer: Record<string, string> = {
        id: generateId(),
        phone_normalized: phone,
        name,
        first_order_date: firstOrderDate,
        created_at: new Date().toISOString(),
        version: '1',
        branch,
        order_count: '0',
        description: r.description?.trim() || '',
        age_range: r.age_range?.trim() || '',
        gender,
      }

      toAppend.push(headers.map((h: string) => customer[h] ?? ''))
      seen.add(phone)
      seen.add(phone.replace(/^0/, ''))
      imported++
    })

    if (toAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'customers!A:Z',
        valueInputOption: 'RAW',
        requestBody: { values: toAppend },
      })
    }

    return NextResponse.json({ success: true, imported, skipped, errors })
  } catch (error) {
    console.error('Import customers error:', error)
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 },
    )
  }
}