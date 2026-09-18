import { getSheetData, appendRow, updateRow } from './sheetsService'

const SETTINGS_SHEET = 'settings'

export interface AppSettings {
  storeName: string
  activeDays: number
  atRiskDays: number
  waTemplate: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  storeName: 'Cabang Senopati',
  activeDays: 30,
  atRiskDays: 60,
  waTemplate: 'Halo {nama}, terima kasih sudah order di {toko}! 😊 Ada yang bisa kami bantu?',
}

// Convert rows to key-value object
function rowsToSettings(rows: Record<string, string>[]): AppSettings {
  const map = new Map(rows.map(r => [r.key, r.value]))

  return {
    storeName: map.get('storeName') || DEFAULT_APP_SETTINGS.storeName,
    activeDays: parseInt(map.get('activeDays') || '') || DEFAULT_APP_SETTINGS.activeDays,
    atRiskDays: parseInt(map.get('atRiskDays') || '') || DEFAULT_APP_SETTINGS.atRiskDays,
    waTemplate: map.get('waTemplate') || DEFAULT_APP_SETTINGS.waTemplate,
  }
}

// In-memory cache — sumber utama settings adalah Google Sheets, bukan localStorage.
// Di-set lewat syncSettingsFromSheets(); dipakai sebagai sumber sinkron untuk
// komponen yang butuh nilai seketika (churnStatus, waLinkBuilder, layout, provider).
let _cache: AppSettings | null = null

function broadcastChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mycustomer_settings_changed'))
  }
}

// Get settings (synchronous, dari cache yang di-sync dari Sheets)
export function getAppSettings(): AppSettings {
  return _cache ?? DEFAULT_APP_SETTINGS
}

// Baca langsung dari Sheets lalu simpan ke cache in-memory
export async function syncSettingsFromSheets(): Promise<AppSettings> {
  try {
    const rows = await getSheetData(SETTINGS_SHEET)
    if (rows.length > 0) {
      _cache = rowsToSettings(rows)
      broadcastChange()
      return _cache
    }
  } catch {
    // Fallback ke cache / default
  }
  return getAppSettings()
}

// Simpan ke cache + Sheets (Google Sheets adalah source of truth)
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  _cache = settings
  broadcastChange()

  try {
    const rows = await getSheetData(SETTINGS_SHEET)
    const map = new Map(rows.map((r, idx) => [r.key, idx]))

    const updates = [
      { key: 'storeName', value: settings.storeName },
      { key: 'activeDays', value: String(settings.activeDays) },
      { key: 'atRiskDays', value: String(settings.atRiskDays) },
      { key: 'waTemplate', value: settings.waTemplate },
    ]

    for (const item of updates) {
      const existingIndex = map.get(item.key)
      if (existingIndex !== undefined) {
        await updateRow(SETTINGS_SHEET, existingIndex, { key: item.key, value: item.value })
      } else {
        await appendRow(SETTINGS_SHEET, { key: item.key, value: item.value })
      }
    }
  } catch {
    // Cache sudah ter-update; Sheets sync bisa retry belakangan
  }
}