const USER_KEY = 'mycustomer_user'
const LEGACY_USER_KEY = 'retainly_user'

export interface SessionUser {
  id: string
  username: string
  role: string
  branch?: string
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function setSessionUser(user: SessionUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.removeItem(LEGACY_USER_KEY)
}

export function clearSessionUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(LEGACY_USER_KEY)
}