import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])
const TABLES: Record<string, string> = { users: 'app_users', settings: 'app_settings' }

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { sheet, row } = body

    if (!sheet || !ALLOWED_SHEETS.has(sheet) || !row) {
      return NextResponse.json({ error: 'Missing sheet or row parameter' }, { status: 400 })
    }
    if (!['owner', 'admin'].includes(auth.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const table = TABLES[sheet] || sheet
    const payload = { ...row }
    for (const key of ['is_active', 'active', 'is_followed_up']) if (key in payload) payload[key] = String(payload[key]).toLowerCase() === 'true'
    for (const key of ['aliases', 'branch_memberships']) if (typeof payload[key] === 'string') {
      try { payload[key] = JSON.parse(payload[key]) } catch {}
    }
    await supabaseTable(table).insert(payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error appending row:', error)
    return NextResponse.json(
      { error: 'Failed to append row' },
      { status: 500 },
    )
  }
}
