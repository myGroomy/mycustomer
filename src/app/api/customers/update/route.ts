import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { dataTable } from '@/lib/backendServer'
import { normalizePhone } from '@/utils/normalizePhone'

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id customer diperlukan' }, { status: 400 })
    const customer = (await dataTable('customers').list<Record<string, unknown>>({ id: `eq.${body.id}`, limit: 1 }))[0]
    if (!customer) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 })
    if (auth.user.role === 'kasir' && customer.branch && customer.branch !== auth.user.branch) return NextResponse.json({ error: 'Customer tidak tersedia di cabang akun ini' }, { status: 403 })
    const updates: Record<string, unknown> = {}
    if (body.aliases !== undefined) { try { updates.aliases = typeof body.aliases === 'string' ? JSON.parse(body.aliases) : body.aliases } catch { updates.aliases = [] } }
    if (body.usia !== undefined) updates.usia = body.usia
    if (body.jenis_kelamin !== undefined) { updates.jenis_kelamin = body.jenis_kelamin; updates.gender = body.jenis_kelamin }
    if (Object.keys(updates).length) await dataTable('customers').update({ id: `eq.${body.id}` }, updates)
    return NextResponse.json({ success: true, customer_id: body.id, updated_fields: body })
  } catch { return NextResponse.json({ error: 'Gagal memperbarui profil customer' }, { status: 500 }) }
}
