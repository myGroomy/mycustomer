import { NextRequest, NextResponse } from 'next/server'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function middleware(request: NextRequest) {
  if (!STATE_CHANGING_METHODS.has(request.method)) return NextResponse.next()

  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
