export interface ImportCustomerRow {
  name: string
  phone: string
  branch?: string
  gender?: string
  age_range?: string
  first_order_date?: string
  description?: string
}

export interface MappedCsv {
  data: ImportCustomerRow[]
  errors: string[]
}

export const IMPORT_TEMPLATE_HEADERS = [
  'Nama',
  'No WhatsApp',
  'Cabang',
  'Gender',
  'Rentang Usia',
  'Tanggal Order Pertama',
  'Catatan',
]

const IMPORT_COLUMN_KEYS: Record<keyof ImportCustomerRow, string[]> = {
  name: ['nama', 'name', 'namacustomer', 'namapelanggan'],
  phone: ['nowhatsapp', 'nowa', 'nowapp', 'notelp', 'nohp', 'telepon', 'phone', 'phon', 'nomor'],
  branch: ['cabang', 'branch'],
  gender: ['gender', 'jeniskelamin', 'jk'],
  age_range: ['usia', 'umur', 'age', 'agerange', 'rentangusia', 'rentangumur'],
  first_order_date: ['tanggalorderpertama', 'firstorderdate', 'tanggalpertama', 'tglorderpertama', 'orderpertama'],
  description: ['catatan', 'keterangan', 'description', 'deskripsi', 'notes'],
}

export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cur); cur = ''
    } else if (ch === '\n') {
      row.push(cur); rows.push(row); row = []; cur = ''
    } else if (ch !== '\r') {
      cur += ch
    }
  }
  if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')
const firstIdx = (headers: string[], keys: string[]) => headers.findIndex((h) => keys.includes(h))

export function mapCsvToRows(rows: string[][]): MappedCsv {
  if (rows.length === 0) return { data: [], errors: ['File CSV kosong.'] }
  const headers = (rows[0] || []).map(normHeader)
  const idx = {
    name: firstIdx(headers, IMPORT_COLUMN_KEYS.name),
    phone: firstIdx(headers, IMPORT_COLUMN_KEYS.phone),
    branch: firstIdx(headers, IMPORT_COLUMN_KEYS.branch),
    gender: firstIdx(headers, IMPORT_COLUMN_KEYS.gender),
    age_range: firstIdx(headers, IMPORT_COLUMN_KEYS.age_range),
    first_order_date: firstIdx(headers, IMPORT_COLUMN_KEYS.first_order_date),
    description: firstIdx(headers, IMPORT_COLUMN_KEYS.description),
  }

  if (idx.name === -1 || idx.phone === -1) {
    return { data: [], errors: ['Header tidak valid: kolom "Nama" dan "No WhatsApp" wajib ada. Gunakan template yang disediakan.'] }
  }

  const data: ImportCustomerRow[] = []
  const missing: number[] = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (!cells || cells.every((c) => !c.trim())) continue
    const get = (i: number) => (i >= 0 ? (cells[i] || '').trim() : '')
    const name = get(idx.name)
    const phone = get(idx.phone)
    if (!name || !phone) { missing.push(r + 1); continue }
    const gender = get(idx.gender)
    data.push({
      name,
      phone,
      branch: get(idx.branch),
      gender: gender.startsWith('L') || gender.startsWith('l') ? 'L' : gender.startsWith('P') || gender.startsWith('p') ? 'P' : gender,
      age_range: get(idx.age_range),
      first_order_date: get(idx.first_order_date),
      description: get(idx.description),
    })
  }

  const errors: string[] = []
  if (missing.length > 0) {
    const shown = missing.slice(0, 5).join(', ')
    errors.push(`${missing.length} baris dilewati (nama/WA kosong): baris ${shown}${missing.length > 5 ? ', ...' : ''}`)
  }
  return { data, errors }
}

export function downloadImportTemplate() {
  const BOM = '\uFEFF'
  const sample = ['Budi Santoso', '081234567890', 'CMH', 'L', '26-35', '2026-09-01', 'Customer reguler']
  const csv = [IMPORT_TEMPLATE_HEADERS.join(','), sample.join(',')].join('\n')
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Template_Import_Customer.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}