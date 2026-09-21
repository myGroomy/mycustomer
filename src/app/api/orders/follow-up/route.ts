import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const { order_id, is_followed_up } = await request.json()
    if (!order_id || typeof is_followed_up !== 'boolean') return NextResponse.json({ error: 'Parameter wajib tidak valid' }, { status: 400 })
    const order = (await supabaseTable('orders').list<Record<string, unknown>>({ id: `eq.${order_id}`, limit: 1 }))[0]
    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
    if (auth.user.role === 'kasir' && order.branch !== auth.user.branch) return NextResponse.json({ error: 'Order tidak tersedia di cabang akun ini' }, { status: 403 })
    const followed_up_at = is_followed_up ? new Date().toISOString() : null
    await supabaseTable('orders').update({ id: `eq.${order_id}` }, { is_followed_up, followed_up_at })
    return NextResponse.json({ success: true, order_id, is_followed_up, followed_up_at })
  } catch { return NextResponse.json({ error: 'Gagal menyimpan follow-up' }, { status: 500 }) }
}
