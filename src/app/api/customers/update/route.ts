import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { authenticatedUser } from '@/lib/apiAuth'

const CUSTOMERS_SHEET = 'customers'

function colLetter(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result
  }
  return result
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticatedUser()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { id, aliases, usia, jenis_kelamin } = body

    if (!id) {
      return NextResponse.json({ error: 'id customer diperlukan' }, { status: 400 })
    }

    const sheets = getSheets()
    const spreadsheetId = getSpreadsheetId()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMERS_SHEET}!A:Z`,
    })
    const rows = response.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customers sheet kosong' }, { status: 400 })
    }

    const headers = [...(rows[0] as string[])]
    const idColIdx = headers.indexOf('id')
    if (idColIdx === -1) {
      return NextResponse.json({ error: 'Kolom id tidak ditemukan' }, { status: 400 })
    }

    const matchIndex = rows.findIndex((row, index) => index > 0 && row[idColIdx] === id)
    if (matchIndex === -1) {
      return NextResponse.json({ error: `Customer dengan id ${id} tidak ditemukan` }, { status: 404 })
    }

    const targetRow = [...(rows[matchIndex] as string[])]
    while (targetRow.length < headers.length) targetRow.push('')

    const updates: Record<number, string> = {}

    const aliasesIndex = headers.indexOf('aliases')
    const usiaIndex = headers.indexOf('usia')
    const jenisKelaminIndex = headers.indexOf('jenis_kelamin')

    if (aliasesIndex >= 0 && aliases !== undefined) {
      targetRow[aliasesIndex] = aliases
      updates[aliasesIndex] = aliases
    }
    if (usiaIndex >= 0 && usia !== undefined) {
      targetRow[usiaIndex] = usia
      updates[usiaIndex] = usia
    }
    if (jenisKelaminIndex >= 0 && jenis_kelamin !== undefined) {
      targetRow[jenisKelaminIndex] = jenis_kelamin
      updates[jenisKelaminIndex] = jenis_kelamin
    }

    const versionIndex = headers.indexOf('version')
    if (versionIndex >= 0) {
      const currentVersion = parseInt(targetRow[versionIndex] || '1', 10)
      targetRow[versionIndex] = String(currentVersion + 1)
      updates[versionIndex] = String(currentVersion + 1)
    }

    if (Object.keys(updates).length > 0) {
      const updateData = headers.map((_, colIdx) => updates[colIdx] !== undefined ? updates[colIdx] : targetRow[colIdx])
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMERS_SHEET}!A${matchIndex + 1}:${colLetter(headers.length - 1)}${matchIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updateData] },
      })
    }

    return NextResponse.json({
      success: true,
      customer_id: id,
      updated_fields: { aliases, usia, jenis_kelamin },
    })
  } catch (error) {
    console.error('Error updating customer profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memperbarui profil customer' },
      { status: 500 },
    )
  }
}
