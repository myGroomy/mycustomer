import { NextRequest, NextResponse } from 'next/server'
import { authenticatedUser } from '@/lib/apiAuth'
import { supabaseTable } from '@/lib/supabaseServer'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])
const TABLES: Record<string, string> = { users: 'app_users', settings: 'app_settings' }

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { sheet, rowIndex } = body

    if (!sheet || !ALLOWED_SHEETS.has(sheet) || rowIndex === undefined) {
      return NextResponse.json({ error: 'Missing sheet or rowIndex parameter' }, { status: 400 })
    }

    const table = TABLES[sheet] || sheet
    const identity = sheet === 'settings' ? 'key' : 'id'
    const rows = await supabaseTable(table).list<Record<string, unknown>>({ select: identity, order: sheet === 'settings' ? 'key.asc' : 'created_at.asc', limit: 1000 })
    const target = rows[rowIndex]
    if (!target?.[identity]) return NextResponse.json({ error: 'Row not found' }, { status: 404 })
    await supabaseTable(table).remove({ [identity]: `eq.${target[identity]}` })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting row:', error)
    return NextResponse.json(
      { error: 'Failed to delete row' },
      { status: 500 },
    )
  }
}