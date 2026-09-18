export interface SheetRow {
  [key: string]: string
}

export interface SyncResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

const cache = new Map<string, { data: SheetRow[]; lastFetch: number }>()
const CACHE_TTL = 30_000

let syncInProgress = false

export function clearSheetsCache(sheetName?: string): void {
  if (sheetName) {
    cache.delete(sheetName)
  } else {
    cache.clear()
  }
}

export async function syncStaging(): Promise<SyncResult> {
  if (syncInProgress) {
    return { success: true, imported: 0, skipped: 0, errors: ['Sync already in progress'] }
  }

  syncInProgress = true
  try {
    const response = await fetch('/api/sheets/sync-staging', { method: 'POST' })
    if (!response.ok) {
      throw new Error('Sync failed')
    }
    const result = await response.json()

    // Invalidate cache after sync
    if (result.imported > 0) {
      cache.delete('customers')
      cache.delete('orders')
    }

    return result
  } finally {
    syncInProgress = false
  }
}

export async function getSheetData(sheetName: string): Promise<SheetRow[]> {
  const cached = cache.get(sheetName)
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL) {
    return cached.data
  }

  const response = await fetch(`/api/sheets?sheet=${encodeURIComponent(sheetName)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheetName}`)
  }

  const { data } = await response.json()
  cache.set(sheetName, { data, lastFetch: Date.now() })
  return data
}

export async function appendRow(sheetName: string, row: SheetRow): Promise<void> {
  const response = await fetch('/api/sheets/append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: sheetName, row }),
  })

  if (!response.ok) {
    throw new Error(`Failed to append row to ${sheetName}`)
  }

  cache.delete(sheetName)
}

export async function updateRow(
  sheetName: string,
  rowIndex: number,
  row: SheetRow,
): Promise<void> {
  const response = await fetch('/api/sheets/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: sheetName, rowIndex, row }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update row in ${sheetName}`)
  }

  cache.delete(sheetName)
}

export async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const response = await fetch('/api/sheets/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: sheetName, rowIndex }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete row in ${sheetName}`)
  }

  cache.delete(sheetName)
}
