import type { Channel, RetentionThresholds } from '@/types'

export const CHANNELS: Channel[] = [
  { id: 'dine_in', label: 'Dine-in' },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'gofood', label: 'Gofood' },
  { id: 'grab', label: 'Grab' },
  { id: 'shopee', label: 'Shopee' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'custom', label: 'Lainnya' },
]

export const DEFAULT_THRESHOLDS: RetentionThresholds = {
  activeDays: Number(process.env.NEXT_PUBLIC_DEFAULT_CHURN_ACTIVE_DAYS) || 30,
  atRiskDays: Number(process.env.NEXT_PUBLIC_DEFAULT_CHURN_AT_RISK_DAYS) || 60,
}

export const PAGE_SIZE = 20

// Batas ambil semua data (dashboard/export/follow-up) — cukup besar untuk dataset produksi
export const MAX_FETCH_ALL = 50000

// Bucket usia standar (sesuai pilihan di form edit profil customer)
export const AGE_RANGES = ['0-17', '18-25', '26-35', '36-45', '46-55', '56-65', '66+'] as const

export const GENDER_LABELS: Record<string, string> = {
  L: 'Laki-laki',
  P: 'Perempuan',
}
