import { NextRequest, NextResponse } from 'next/server'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/sessionServer'

export async function POST(request: NextRequest) {
  try {
    const { username, pin } = await request.json()
    if (typeof username !== 'string' || typeof pin !== 'string' || !username.trim() || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Username dan PIN tidak valid' }, { status: 400 })
    }

    const response = await getSheets().spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: 'users!A:Z',
    })
    const rows = response.data.values || []
    const headers = rows[0] || []
    const users = rows.slice(1).map((row) => Object.fromEntries(headers.map((h: string, i: number) => [h, row[i] || ''])))
    const user = users.find((candidate) => candidate.username === username.trim() && candidate.pin === pin)
    if (!user) return NextResponse.json({ error: 'Username atau PIN salah' }, { status: 401 })

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      branch: user.branch || '',
    }
    const responseBody = NextResponse.json({ user: sessionUser })
    responseBody.cookies.set(SESSION_COOKIE_NAME, createSessionToken(sessionUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return responseBody
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
