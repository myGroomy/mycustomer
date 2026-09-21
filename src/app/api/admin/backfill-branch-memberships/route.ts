import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const apply = (await request.json().catch(() => ({}))).apply === true
    const [customers, orders] = await Promise.all([
      supabaseTable('customers').list<Record<string, unknown>>({ limit: 1000 }),
      supabaseTable('orders').list<Record<string, unknown>>({ limit: 1000 }),
    ])
    const byCustomer = new Map<string, Set<string>>()
    for (const order of orders) {
      if (!order.customer_id || !order.branch) continue
      if (!byCustomer.has(String(order.customer_id))) byCustomer.set(String(order.customer_id), new Set())
      byCustomer.get(String(order.customer_id))!.add(String(order.branch))
    }
    const updates: Array<{ customer_id: string; branches: string[] }> = []
    for (const customer of customers) {
      const branches = new Set<string>(Array.isArray(customer.branch_memberships) ? customer.branch_memberships as string[] : [])
      if (customer.branch) branches.add(String(customer.branch))
      for (const branch of byCustomer.get(String(customer.id)) || []) branches.add(branch)
      const next = [...branches].sort()
      if (JSON.stringify(next) !== JSON.stringify(customer.branch_memberships || [])) {
        updates.push({ customer_id: String(customer.id), branches: next })
        if (apply) await supabaseTable('customers').update({ id: `eq.${customer.id}` }, { branch_memberships: next })
      }
    }
    return NextResponse.json({ success: true, dry_run: !apply, updated_count: updates.length, preview: updates.slice(0, 100) })
  } catch (error) {
    console.error('Error backfilling branch memberships:', error)
    return NextResponse.json({ error: 'Gagal melakukan backfill membership cabang' }, { status: 500 })
  }
}
