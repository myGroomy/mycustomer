import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { getSessionCookie } from '@/lib/sessionServer'

const CUSTOMERS_SHEET = 'customers'
const FU_COL = 'is_followed_up'
const FU_AT_COL = 'followed_up_at'

function colLetter(idx: number): string {
  let result = ''
  let n = idx + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

export async function PUT(request: NextRequest) {
  const session = await getSessionCookie()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized — silakan login ulang' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { customer_id, is_followed_up } = body

    if (!customer_id || typeof is_followed_up !== 'boolean') {
      return NextResponse.json(
        { error: 'Parameter wajib: customer_id (string) dan is_followed_up (boolean)' },
        { status: 400 },
      )
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })

    const rows = dataResponse.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customers sheet kosong' }, { status: 400 })
    }

    const headers = [...(rows[0] as string[])]
    const idColIdx = headers.indexOf('id')

    // Pastikan kolom ada (auto-migrasi)
    let fuColIdx = headers.indexOf(FU_COL)
    let fuAtColIdx = headers.indexOf(FU_AT_COL)

    if (fuColIdx === -1) {
      headers.push(FU_COL)
      fuColIdx = headers.length - 1
    }
    if (fuAtColIdx === -1) {
      headers.push(FU_AT_COL)
      fuAtColIdx = headers.length - 1
    }

    const headersDirty = headers.length > rows[0].length
    if (headersDirty) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A1:${colLetter(headers.length - 1)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      })
    }

    // Cari baris customer berdasarkan id
    let targetRowIdx = -1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIdx] === customer_id) {
        targetRowIdx = i
        break
      }
    }

    if (targetRowIdx === -1) {
      return NextResponse.json({ error: `Customer dengan id ${customer_id} tidak ditemukan` }, { status: 404 })
    }

    const fuValue = is_followed_up ? 'TRUE' : 'FALSE'
    const fuAtValue = is_followed_up ? new Date().toISOString() : ''

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${CUSTOMERS_SHEET}!${colLetter(fuColIdx)}${targetRowIdx + 1}`,
            values: [[fuValue]],
          },
          {
            range: `${CUSTOMERS_SHEET}!${colLetter(fuAtColIdx)}${targetRowIdx + 1}`,
            values: [[fuAtValue]],
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      customer_id,
      is_followed_up,
      followed_up_at: fuAtValue,
    })
  } catch (error) {
    console.error('Error updating customer follow-up:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menyimpan follow-up' },
      { status: 500 },
    )
  }
}