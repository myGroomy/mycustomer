import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedUser(['owner', 'admin'])
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    const { sheet, rowIndex } = body

    if (!sheet || !ALLOWED_SHEETS.has(sheet) || rowIndex === undefined) {
      return NextResponse.json({ error: 'Missing sheet or rowIndex parameter' }, { status: 400 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const tab = meta.data.sheets?.find((s) => s.properties?.title === sheet)
    const sheetId = tab?.properties?.sheetId
    if (sheetId === undefined) {
      return NextResponse.json({ error: `Sheet ${sheet} not found` }, { status: 404 })
    }

    // rowIndex is 0-based among data rows (below header at sheet row 1)
    const startIndex = rowIndex + 1
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 },
            },
          },
        ],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting row:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete row' },
      { status: 500 },
    )
  }
}