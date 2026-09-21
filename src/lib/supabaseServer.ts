import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type QueryValue = string | number | boolean | null | undefined

function getConfig() {
  const fileEnv: Record<string, string> = {}
  for (const file of [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '..', '.env')]) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !fileEnv[match[1]]) fileEnv[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  }
  const env = { ...fileEnv, ...process.env }
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase server env vars')
  return { url: url.replace(/\/$/, ''), key }
}

export async function supabaseRest<T = unknown>(
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    query?: Record<string, QueryValue>
    body?: unknown
    headers?: Record<string, string>
  } = {},
): Promise<T> {
  const { url, key } = getConfig()
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null) params.set(name, String(value))
  }
  const response = await fetch(`${url}/rest/v1/${table}${params.size ? `?${params}` : ''}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      'Content-Type': 'application/json',
      ...(options.method === 'POST' || options.method === 'PATCH' ? { Prefer: 'return=representation' } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase ${response.status}: ${detail}`)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function supabaseTable(table: string) {
  return {
    list: <T = Record<string, unknown>>(query: Record<string, QueryValue> = {}) =>
      supabaseRest<T[]>(table, { query: { select: '*', ...query } }),
    insert: <T = Record<string, unknown>>(body: unknown) =>
      supabaseRest<T[]>(table, { method: 'POST', body }),
    update: <T = Record<string, unknown>>(query: Record<string, QueryValue>, body: unknown) =>
      supabaseRest<T[]>(table, { method: 'PATCH', query: { ...query, select: '*' }, body }),
    remove: (query: Record<string, QueryValue>) =>
      supabaseRest(table, { method: 'DELETE', query }),
  }
}
