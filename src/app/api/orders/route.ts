import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { dataTable } from '@/lib/backendServer'
import { normalizePhone } from '@/utils/normalizePhone'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { customer_id, order_date, channel, raw_phone_input, alias_name } = body
    if (!customer_id || !order_date || !channel) return NextResponse.json({ error: 'Missing required fields: customer_id, order_date, channel' }, { status: 400 })
    const branch = auth.user.role === 'kasir' ? auth.user.branch : String(body.branch || auth.user.branch || '').trim()
    if (!branch) return NextResponse.json({ error: 'Cabang order wajib dipilih' }, { status: 400 })
    const customer = (await dataTable('customers').list<Record<string, unknown>>({ id: `eq.${customer_id}`, limit: 1 }))[0]
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    const memberships = Array.isArray(customer.branch_memberships) ? customer.branch_memberships as string[] : []
    if (auth.user.role === 'kasir' && customer.branch !== branch && !memberships.includes(branch)) {
      const prior = await dataTable('orders').list({ customer_id: `eq.${customer_id}`, branch: `eq.${branch}`, limit: 1 })
      if (!prior.length && normalizePhone(raw_phone_input || '') !== customer.phone_normalized) {
        return NextResponse.json({ error: 'Customer tidak tersedia di cabang akun ini' }, { status: 403 })
      }
    }
    const now = new Date().toISOString()
    const aliases = Array.isArray(customer.aliases) ? [...customer.aliases as Array<Record<string, string>>] : []
    if (typeof alias_name === 'string' && alias_name.trim()) {
      const existing = aliases.find(a => a.name.toLowerCase() === alias_name.trim().toLowerCase())
      if (existing) existing.last_seen_at = now
      else aliases.push({ name: alias_name.trim(), branch, first_seen_at: now, last_seen_at: now })
    }
    const order = (await dataTable('orders').insert<Record<string, unknown>>({
      customer_id, order_date, channel, raw_phone_input: raw_phone_input || null, created_at: now, branch,
    }))[0]
    await dataTable('customers').update({ id: `eq.${customer_id}` }, {
      order_count: Number(customer.order_count || 0) + 1, aliases, branch_memberships: memberships.includes(branch) ? memberships : [...memberships, branch],
    })
    return NextResponse.json({ success: true, order_id: order.id, order_count: Number(customer.order_count || 0) + 1 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
