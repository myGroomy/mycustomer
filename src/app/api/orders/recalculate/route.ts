import { NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

export async function POST() {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const [customers, orders] = await Promise.all([
      supabaseTable('customers').list<Record<string, unknown>>({ limit: 1000 }),
      supabaseTable('orders').list<Record<string, unknown>>({ limit: 1000 }),
    ])
    const counts = new Map<string, number>()
    for (const order of orders) counts.set(String(order.customer_id), (counts.get(String(order.customer_id)) || 0) + 1)
    let updated = 0
    await Promise.all(customers.map(async customer => {
      const count = counts.get(String(customer.id)) || 0
      if (Number(customer.order_count || 0) !== count) {
        await supabaseTable('customers').update({ id: `eq.${customer.id}` }, { order_count: count })
        updated++
      }
    }))
    return NextResponse.json({ success: true, total_customers: customers.length, total_orders: orders.length, updated })
  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json({ error: 'Recalculate failed' }, { status: 500 })
  }
}
