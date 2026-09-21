import 'server-only'
import { getSheets, getSpreadsheetId } from '@/lib/sheetsServer'
import { supabaseTable } from '@/lib/supabaseServer'

export type AppDataBackend = 'supabase' | 'sheets'

const TABLE_NAMES: Record<string, string> = { users: 'app_users', settings: 'app_settings' }
const JSON_COLUMNS = new Set(['aliases', 'branch_memberships'])
const BOOLEAN_COLUMNS = new Set(['active', 'is_active', 'is_followed_up'])

export function getAppDataBackend(): AppDataBackend {
  const value = process.env.APP_DATA_BACKEND?.trim().toLowerCase()
  if (!value) return 'supabase'
  if (value === 'supabase' || value === 'sheets') return value
  throw new Error('APP_DATA_BACKEND must be either supabase or sheets')
}

const sheetName = (table: string) =>
  Object.entries(TABLE_NAMES).find(([, value]) => value === table)?.[0] || table

function parseValue(key: string, value: string): unknown {
  if (JSON_COLUMNS.has(key)) {
    try { return value ? JSON.parse(value) : [] } catch { return value }
  }
  if (BOOLEAN_COLUMNS.has(key)) return value.toLowerCase() === 'true'
  return value
}

const stringifyValue = (value: unknown) =>
  value === null || value === undefined ? '' :
    typeof value === 'boolean' ? String(value).toUpperCase() :
      typeof value === 'object' ? JSON.stringify(value) : String(value)

async function sheetsRows(table: string) {
  const response = await getSheets().spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(), range: `${sheetName(table)}!A:ZZ`,
  })
  const values = response.data.values || []
  const headers = (values[0] || []).map(String)
  const rows = values.slice(1).map(valuesRow => Object.fromEntries(
    headers.map((header, index) => [header, parseValue(header, String(valuesRow[index] ?? ''))]),
  ))
  return { headers, rows }
}

function matches(row: Record<string, unknown>, query: Record<string, string | number | boolean | null | undefined>) {
  return Object.entries(query).every(([key, expected]) => {
    if (expected === undefined || expected === null || ['select', 'limit', 'order'].includes(key)) return true
    const raw = String(expected)
    const [operator, operand] = raw.includes('.') ? raw.split('.', 2) : ['', raw]
    const actual = String(row[key] ?? '')
    return operator === 'eq' ? actual === operand : operator === 'neq' ? actual !== operand : actual === raw
  })
}

function sortRows(rows: Record<string, unknown>[], order: unknown) {
  if (!order) return rows
  const [field, direction] = String(order).split('.')
  return rows.sort((a, b) => (direction === 'desc' ? -1 : 1) * String(a[field] ?? '').localeCompare(String(b[field] ?? '')))
}

function sheetsTable(table: string) {
  return {
    list: async <T = Record<string, unknown>>(query: Record<string, string | number | boolean | null | undefined> = {}) => {
      const { rows } = await sheetsRows(table)
      let result = sortRows(rows.filter(row => matches(row, query)), query.order)
      const limit = Number(query.limit)
      if (Number.isFinite(limit) && limit > 0) result = result.slice(0, limit)
      if (query.select && query.select !== '*') {
        const columns = String(query.select).split(',')
        result = result.map(row => Object.fromEntries(columns.map(column => [column, row[column]])))
      }
      return result as T[]
    },
    insert: async <T = Record<string, unknown>>(body: unknown) => {
      const { headers } = await sheetsRows(table)
      const rows = Array.isArray(body) ? body as Record<string, unknown>[] : [body as Record<string, unknown>]
      await getSheets().spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(), range: `${sheetName(table)}!A:${String.fromCharCode(64 + Math.max(headers.length, 1))}`,
        valueInputOption: 'RAW', requestBody: { values: rows.map(row => headers.map(header => stringifyValue(row[header]))) },
      })
      return rows as T[]
    },
    update: async <T = Record<string, unknown>>(query: Record<string, string | number | boolean | null | undefined>, body: Record<string, unknown>) => {
      const { headers, rows } = await sheetsRows(table)
      const indexes = rows.map((row, index) => matches(row, query) ? index : -1).filter(index => index >= 0)
      const data = indexes.map(index => ({
        range: `${sheetName(table)}!A${index + 2}:${String.fromCharCode(64 + Math.max(headers.length, 1))}${index + 2}`,
        values: [headers.map(header => stringifyValue(body[header] === undefined ? rows[index][header] : body[header]))],
      }))
      if (data.length) await getSheets().spreadsheets.values.batchUpdate({ spreadsheetId: getSpreadsheetId(), requestBody: { valueInputOption: 'RAW', data } })
      return indexes.map(index => ({ ...rows[index], ...body })) as T[]
    },
    remove: async (query: Record<string, string | number | boolean | null | undefined>) => {
      const { rows } = await sheetsRows(table)
      const indexes = rows.map((row, index) => matches(row, query) ? index : -1).filter(index => index >= 0)
      if (!indexes.length) return
      const metadata = await getSheets().spreadsheets.get({ spreadsheetId: getSpreadsheetId() })
      const sheet = metadata.data.sheets?.find(item => item.properties?.title === sheetName(table))
      const sheetId = sheet?.properties?.sheetId
      if (sheetId === undefined) throw new Error(`Sheet ${sheetName(table)} not found`)
      await getSheets().spreadsheets.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: { requests: indexes.sort((a, b) => b - a).map(index => ({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: index + 1, endIndex: index + 2 } } })) },
      })
    },
  }
}

export function dataTable(table: string) {
  return getAppDataBackend() === 'sheets' ? sheetsTable(table) : supabaseTable(table)
}
