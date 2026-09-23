import { createHmac, timingSafeEqual } from 'node:crypto'

interface HandoffPayload {
  employeeId: string
  username: string
  employeeName: string
  roleId: string
  roleName: string
  permissions: string[]
  baseBranch: string
  audience: string
  expiresAt: number
}

function getSecret(): string {
  const secret = process.env.LAUNCHER_SSO_SHARED_SECRET
  if (!secret || secret.length < 32) throw new Error('LAUNCHER_SSO_SHARED_SECRET must be configured with at least 32 characters')
  return secret
}

export function verifyLauncherHandoff(token: string | null): HandoffPayload | null {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as HandoffPayload
    if (payload.audience !== 'MYCUSTOMER' || !payload.employeeId || !payload.username || !payload.expiresAt) return null
    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
