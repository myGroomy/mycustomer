import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'
import { normalizePhone } from '@/utils/normalizePhone'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!phone || !name) return NextResponse.json({ error: 'Nomor telepon dan nama wajib diisi' }, { status: 400 })
    const normalizedPhone = normalizePhone(phone)
    const branch = auth.user.role === 'kasir' ? auth.user.branch : String(body.branch || auth.user.branch || '').trim()
    const table = supabaseTable('customers')
    const found = (await table.list<Record<string, unknown>>({ phone_normalized: `eq.${normalizedPhone}`, limit: 1 }))[0]
    const now = new Date().toISOString()
    if (!found) {
      const customer = (await table.insert<Record<string, unknown>>({
        phone_normalized: normalizedPhone, name, first_order_date: body.first_order_date || now.slice(0, 10),
        created_at: now, version: '1', branch, order_count: 0, aliases: [], branch_memberships: branch ? [branch] : [],
      }))[0]
      return NextResponse.json({ customer_id: customer.id, phone_normalized: normalizedPhone, name, created: true })
    }
    const memberships = Array.isArray(found.branch_memberships) ? [...found.branch_memberships as string[]] : []
    if (branch && !memberships.includes(branch)) memberships.push(branch)
    const aliases = Array.isArray(found.aliases) ? [...found.aliases as Array<Record<string, string>>] : []
    if (found.name !== name && !aliases.some(a => a.name === found.name && a.branch === branch)) {
      aliases.push({ name: String(found.name), branch, first_seen_at: String(found.created_at || now), last_seen_at: now })
    }
    if (auth.user.role === 'kasir' && found.branch !== branch && !memberships.includes(branch)) {
      return NextResponse.json({ error: 'Customer tidak tersedia di cabang akun ini' }, { status: 403 })
    }
    await table.update({ id: `eq.${found.id}` }, { name, aliases, branch_memberships: memberships })
    const orders = await supabaseTable('orders').list<Record<string, unknown>>({ customer_id: `eq.${found.id}`, branch: branch ? `neq.${branch}` : undefined, limit: 1 })
    return NextResponse.json({ customer_id: found.id, phone_normalized: normalizedPhone, name, created: false, has_other_branch_activity: orders.length > 0 })
  } catch (error) {
    console.error('Error resolving customer:', error)
    return NextResponse.json({ error: 'Gagal memproses customer' }, { status: 500 })
  }
}
