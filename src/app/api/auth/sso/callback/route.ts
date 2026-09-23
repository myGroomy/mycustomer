import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/sessionServer'
import { verifyLauncherHandoff } from '@/lib/sso'

function safePath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app'
  return value.slice(0, 500)
}

export async function GET(request: NextRequest) {
  try {
    const payload = verifyLauncherHandoff(request.nextUrl.searchParams.get('token'))
    if (!payload) return NextResponse.redirect(new URL('/login?sso=invalid', request.url))

    const role = payload.roleName.toLowerCase().includes('admin') ? 'admin' : 'kasir'
    const user = {
      id: payload.employeeId,
      username: payload.username,
      display_name: payload.employeeName,
      role,
      branch: payload.baseBranch,
    }
    const response = NextResponse.redirect(new URL(safePath(request.nextUrl.searchParams.get('returnPath')), request.url))
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error('SSO callback error:', error)
    return NextResponse.redirect(new URL('/login?sso=unavailable', request.url))
  }
}
