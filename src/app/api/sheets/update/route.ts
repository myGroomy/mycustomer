import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])

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

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    // Get headers to ensure correct order
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A:Z`,
    })

    const rows = dataResponse.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ error: `Sheet ${sheet} is empty` }, { status: 400 })
    }

    const headers = rows[0]
    const values = headers.map((header: string) => row[header] || '')

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet}!A${rowIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating row:', error)
    return NextResponse.json(
      { error: 'Failed to update row' },
      { status: 500 },
    )
  }
}
