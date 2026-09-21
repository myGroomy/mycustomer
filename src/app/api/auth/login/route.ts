import { NextRequest, NextResponse } from 'next/server'
import { supabaseTable } from '@/lib/supabaseServer'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/sessionServer'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, { status: 429 })
    }
    const { username, pin } = await request.json()
    if (typeof username !== 'string' || typeof pin !== 'string' || !username.trim() || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Username dan PIN tidak valid' }, { status: 400 })
    }

    const users = await supabaseTable('app_users').list({
      username: `eq.${username.trim()}`,
      pin: `eq.${pin}`,
      active: 'eq.true',
      limit: 1,
    })
    const user = users[0] as { id: string; username: string; display_name?: string; role: string; branch?: string } | undefined
    if (!user) return NextResponse.json({ error: 'Username atau PIN salah' }, { status: 401 })

    const sessionUser = {
      id: user.id,
      username: user.username,
      display_name: user.role === 'owner' || user.role === 'admin' ? 'Admin' : user.display_name || user.branch || user.username,
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
    if (error instanceof Error && (
      error.message === 'SESSION_SECRET must be configured with at least 32 characters' ||
      error.message === 'Missing Supabase server env vars'
    )) {
      return NextResponse.json(
        { error: 'Konfigurasi server belum lengkap. Hubungi administrator.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: 'Terjadi kesalahan saat login' }, { status: 500 })
  }
}
