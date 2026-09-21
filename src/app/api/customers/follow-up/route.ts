import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { dataTable } from '@/lib/backendServer'

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const { customer_id, is_followed_up } = await request.json()
    if (!customer_id || typeof is_followed_up !== 'boolean') return NextResponse.json({ error: 'Parameter wajib tidak valid' }, { status: 400 })
    const customer = (await dataTable('customers').list<Record<string, unknown>>({ id: `eq.${customer_id}`, limit: 1 }))[0]
    if (!customer) return NextResponse.json({ error: 'Customer tidak ditemukan' }, { status: 404 })
    if (auth.user.role === 'kasir' && customer.branch && customer.branch !== auth.user.branch) return NextResponse.json({ error: 'Customer tidak tersedia di cabang akun ini' }, { status: 403 })
    const followed_up_at = is_followed_up ? new Date().toISOString() : null
    await dataTable('customers').update({ id: `eq.${customer_id}` }, { is_followed_up, followed_up_at })
    return NextResponse.json({ success: true, customer_id, is_followed_up, followed_up_at })
  } catch { return NextResponse.json({ error: 'Gagal menyimpan follow-up' }, { status: 500 }) }
}
