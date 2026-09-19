import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const sheet = searchParams.get('sheet')

    if (!sheet || !ALLOWED_SHEETS.has(sheet)) {
      return NextResponse.json({ error: 'Missing sheet parameter' }, { status: 400 })
    }
    if (sheet === 'users' && !['owner', 'admin'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A:Z`,
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const headers = rows[0]
    const data = rows.slice(1).map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || ''
      })
      return obj
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error reading sheet:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read sheet' },
      { status: 500 },
    )
  }
}
