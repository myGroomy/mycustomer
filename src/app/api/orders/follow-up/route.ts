import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { cookies } from 'next/headers'

const ORDERS_SHEET = 'orders'
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
  const cookieStore = await cookies()
  const session = cookieStore.get('retainly_session')
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized — silakan login ulang' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { order_id, is_followed_up } = body

    if (!order_id || typeof is_followed_up !== 'boolean') {
      return NextResponse.json(
        { error: 'Parameter wajib: order_id (string) dan is_followed_up (boolean)' },
        { status: 400 },
      )
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()

    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET}!A:Z`,
    })

    const rows = dataResponse.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Orders sheet kosong' }, { status: 400 })
    }

    const headers = [...(rows[0] as string[])]
    const idColIdx = headers.indexOf('id')

    // Pastikan kolom is_followed_up & followed_up_at ada (auto-migrasi)
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
        range: `${ORDERS_SHEET}!A1:${colLetter(headers.length - 1)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      })
    }

    // Cari baris order berdasarkan id
    let targetRowIdx = -1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIdx] === order_id) {
        targetRowIdx = i
        break
      }
    }

    if (targetRowIdx === -1) {
      return NextResponse.json({ error: `Order dengan id ${order_id} tidak ditemukan` }, { status: 404 })
    }

    const fuValue = is_followed_up ? 'TRUE' : 'FALSE'
    const fuAtValue = is_followed_up ? new Date().toISOString() : ''

    // Update hanya 2 sel yang relevan (is_followed_up + followed_up_at)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${ORDERS_SHEET}!${colLetter(fuColIdx)}${targetRowIdx + 1}`,
            values: [[fuValue]],
          },
          {
            range: `${ORDERS_SHEET}!${colLetter(fuAtColIdx)}${targetRowIdx + 1}`,
            values: [[fuAtValue]],
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      order_id,
      is_followed_up,
      followed_up_at: fuAtValue,
    })
  } catch (error) {
    console.error('Error updating order follow-up:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menyimpan follow-up' },
      { status: 500 },
    )
  }
}