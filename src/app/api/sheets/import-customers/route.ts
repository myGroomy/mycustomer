import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'
import { normalizePhone } from '@/utils/normalizePhone'

export interface ImportCustomerRow {
  name: string; phone: string; branch?: string; gender?: string; age_range?: string; first_order_date?: string; description?: string
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const rows: ImportCustomerRow[] = Array.isArray(body.rows) ? body.rows : []
    if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris untuk diimport' }, { status: 400 })
    if (rows.length > 1000) return NextResponse.json({ error: 'Maksimal 1000 baris per import' }, { status: 400 })
    const existing = await supabaseTable('customers').list<Record<string, unknown>>({ select: 'phone_normalized', limit: 1000 })
    const seen = new Set(existing.map(row => String(row.phone_normalized)))
    let imported = 0; let skipped = 0; const errors: string[] = []; const payloads: Record<string, unknown>[] = []
    for (const [index, row] of rows.entries()) {
      const name = row.name?.trim(); const phone = normalizePhone(row.phone || '')
      if (!name || !phone) { errors.push(`Baris ${index + 2}: nama & no WhatsApp wajib diisi`); continue }
      if (seen.has(phone)) { skipped++; continue }
      const branch = ['CMH', 'BDG'].includes((row.branch || '').trim().toUpperCase()) ? (row.branch || '').trim().toUpperCase() : ''
      payloads.push({ phone_normalized: phone, name, first_order_date: row.first_order_date?.trim() || new Date().toISOString().slice(0, 10), branch, order_count: 0, description: row.description?.trim() || '', age_range: row.age_range?.trim() || '', gender: row.gender?.trim().toUpperCase() || '', created_at: new Date().toISOString(), aliases: [], branch_memberships: branch ? [branch] : [] })
      seen.add(phone); imported++
    }
    if (payloads.length) await supabaseTable('customers').insert(payloads)
    return NextResponse.json({ success: true, imported, skipped, errors })
  } catch (error) {
    console.error('Import customers error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
