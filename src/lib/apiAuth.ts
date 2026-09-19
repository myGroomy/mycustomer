import { NextResponse } from 'next/server'
import { requireSession, type AuthenticatedUser } from '@/lib/sessionServer'

export async function authenticatedUser(roles?: string[]): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  try {
    return { user: await requireSession(roles) }
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: error instanceof Error && error.message === 'FORBIDDEN' ? 'Forbidden' : 'Unauthorized' },
        { status: error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 401 },
      ),
    }
  }
}
