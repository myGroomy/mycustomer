import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { dataTable } from '@/lib/backendServer'

const SESSION_COOKIE = 'mycustomer_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export interface AuthenticatedUser {
  id: string
  username: string
  display_name: string
  role: string
  branch: string
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters')
  }
  return secret
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url')
}

export function createSessionToken(user: AuthenticatedUser): string {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): AuthenticatedUser | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthenticatedUser & { exp?: number }
    if (!parsed.id || !parsed.username || !parsed.role || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return { id: parsed.id, username: parsed.username, display_name: parsed.display_name || parsed.branch || parsed.username, role: parsed.role, branch: parsed.branch || '' }
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function requireSession(roles?: string[]): Promise<AuthenticatedUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('UNAUTHORIZED')
  try {
    const current = (await dataTable('app_users').list({
      id: `eq.${user.id}`,
      active: 'eq.true',
      limit: 1,
    }))[0] as { id: string; username: string; display_name: string; role: string; branch?: string } | undefined
    if (!current) {
      throw new Error('UNAUTHORIZED')
    }
    const currentUser = {
      id: current.id,
      username: current.username,
      display_name: current.role === 'owner' || current.role === 'admin' ? 'Admin' : current.display_name || current.branch || current.username,
      role: current.role,
      branch: current.branch || '',
    }
    if (roles && !roles.includes(currentUser.role)) throw new Error('FORBIDDEN')
    return currentUser
  } catch (error) {
    if (error instanceof Error && (error.message === 'FORBIDDEN' || error.message === 'UNAUTHORIZED')) throw error
    throw new Error('UNAUTHORIZED')
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS
