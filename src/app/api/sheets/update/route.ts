import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { dataTable } from '@/lib/backendServer'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users', 'customer_branches'])
const TABLES: Record<string, string> = { users: 'app_users', settings: 'app_settings' }

export async function PUT(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { sheet, rowIndex, row } = body

    if (!sheet || !ALLOWED_SHEETS.has(sheet) || rowIndex === undefined || !row) {
      return NextResponse.json({ error: 'Missing sheet, rowIndex, or row parameter' }, { status: 400 })
    }
    if (!['owner', 'admin'].includes(auth.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const table = TABLES[sheet] || sheet
    const identity = sheet === 'settings' ? 'key' : 'id'
    const rows = await dataTable(table).list<Record<string, unknown>>({ select: identity, order: sheet === 'settings' ? 'key.asc' : 'created_at.asc', limit: 1000 })
    const target = rows[rowIndex]
    if (!target?.[identity]) return NextResponse.json({ error: 'Row not found' }, { status: 404 })
    const payload = { ...row }
    for (const key of ['is_active', 'active', 'is_followed_up']) if (key in payload) payload[key] = String(payload[key]).toLowerCase() === 'true'
    for (const key of ['aliases', 'branch_memberships']) if (typeof payload[key] === 'string') {
      try { payload[key] = JSON.parse(payload[key]) } catch {}
    }
    delete payload.id
    await dataTable(table).update({ [identity]: `eq.${target[identity]}` }, payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating row:', error)
    return NextResponse.json(
      { error: 'Failed to update row' },
      { status: 500 },
    )
  }
}
