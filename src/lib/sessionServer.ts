import { cookies } from 'next/headers'

const SESSION_COOKIE = 'mycustomer_session'
const LEGACY_SESSION_COOKIE = 'retainly_session'

// Baca cookie sesi (baru dulu, legacy sebagai fallback supaya user lama tidak terlogout).
export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? cookieStore.get(LEGACY_SESSION_COOKIE)?.value
}