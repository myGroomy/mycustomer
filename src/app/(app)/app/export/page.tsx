'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DownloadSimple,
  UsersThree,
  Receipt,
  ArrowDown,
  Calendar,
  FileCsv,
  CheckCircle,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getCustomersWithStats } from '@/services/customerService'
import { getOrdersByCustomer } from '@/services/orderService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { CHANNELS } from '@/constants'
import { fadeUp, FLUID_EASE } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import { getSessionUser } from '@/utils/session'

export default function ExportPage() {
  const ready = useMounted()
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportType, setExportType] = useState<'orders' | 'customers'>('orders')
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [canExport, setCanExport] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    const user = getSessionUser()
    setCanExport(user?.role === 'admin')
    setAccessChecked(true)
  }, [])

  const handleExport = async () => {
    if (!canExport) return
    setLoading(true)
    setDownloadSuccess(false)
    try {
      if (exportType === 'orders') {
        // Fetch all customers & orders within date range
        const result = await getCustomersWithStats(0, 1000)
        const rows: Array<{
          no: number
          tanggal_order: string
          nama_customer: string
          no_whatsapp: string
          tipe_order_channel: string
          total_order_customer: number
          status_retensi: string
        }> = []

        let counter = 1
        for (const c of result.data) {
          const orders = await getOrdersByCustomer(c.id, 0, 1000)
          for (const o of orders.data) {
            if (dateFrom && o.order_date < dateFrom) continue
            if (dateTo && o.order_date > dateTo) continue

            const channelLabel = CHANNELS.find((ch) => ch.id === o.channel)?.label || o.channel
            const statusLabel = getRetentionLabel(getRetentionStatus(c.last_order_date))

            rows.push({
              no: counter++,
              tanggal_order: o.order_date,
              nama_customer: c.name,
              no_whatsapp: c.phone_normalized,
              tipe_order_channel: channelLabel,
              total_order_customer: c.order_count,
              status_retensi: statusLabel,
            })
          }

          if (accessChecked && !canExport) {
            return (
              <main className="mx-auto flex min-h-[60dvh] max-w-2xl items-center justify-center px-4 text-center">
                <div>
                  <h1 className="text-xl font-semibold text-ink">Akses export dibatasi</h1>
                  <p className="mt-2 text-sm text-ash">Export data hanya tersedia untuk Admin.</p>
                </div>
              </main>
            )
          }
        }

        // Sort by order_date descending
        rows.sort((a, b) => (a.tanggal_order > b.tanggal_order ? -1 : 1))
        // Re-number
        rows.forEach((r, idx) => { r.no = idx + 1 })

        const filename = dateFrom || dateTo
          ? `Laporan_Transaksi_${dateFrom || 'A'}_sd_${dateTo || 'B'}.csv`
          : `Laporan_Semua_Transaksi.csv`

        downloadCsv(rows, filename)
      } else {
        // Customer Database Export
        const result = await getCustomersWithStats(0, 1000)
        const rows = result.data.map((c, idx) => ({
          no: idx + 1,
          nama_customer: c.name,
          no_whatsapp: c.phone_normalized,
          order_pertama: c.first_order_date,
          order_terakhir: c.last_order_date,
          total_order_customer: c.order_count,
          status_retensi: getRetentionLabel(getRetentionStatus(c.last_order_date)),
        }))

        downloadCsv(rows, `Database_Customer.csv`)
      }

      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 3000)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadCsv = (rows: Record<string, string | number>[], filename: string) => {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    
    // Add UTF-8 BOM so Excel opens it with correct encoding & column separation
    const BOM = '\uFEFF'
    const escapeCell = (value: string | number) => {
      const text = String(value)
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safeText.replace(/"/g, '""')}"`
    }
    const csvContent = [
      headers.map((h) => `"${h.replace(/_/g, ' ').toUpperCase()}"`).join(','),
      ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
    ].join('\n')

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const options = [
    { key: 'orders' as const, label: 'Laporan Transaksi (CSV)', desc: 'Format: Tanggal, Nama, No. HP, Tipe Order, Total Order, Status', icon: Receipt },
    { key: 'customers' as const, label: 'Database Customer (CSV)', desc: 'Format: Nama, No. HP, Order Pertama, Order Terakhir, Total Order', icon: UsersThree },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Heading */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-8">
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#022D4E]">Export Laporan</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Export Data (CSV / Excel)</h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">Unduh data transaksi & customer dalam format file CSV yang siap dibuka di Excel</p>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'}>
        <div className="doppel-outer">
          <div className="doppel-inner p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-ink">Pilih Jenis Data Export</h2>
              <FileCsv size={24} weight="duotone" className="text-[#022D4E]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setExportType(opt.key)}
                  className={`group rounded-3xl p-4 text-left transition-all duration-300 ${
                    exportType === opt.key
                      ? 'border-2 border-accent  bg-[#022D4E]-wash/50 shadow-sm'
                      : 'border border-hairline bg-white hover:bg-sunken/60'
                  }`}
                >
                  <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    exportType === opt.key ? 'bg-white text-ink ring-1 ring-ink/10 shadow-sm' : ' bg-[#022D4E]-wash text-[#022D4E]'
                  }`}>
                    <opt.icon size={20} weight="duotone" />
                  </span>
                  <div className="text-sm font-semibold text-ink">{opt.label}</div>
                  <div className="mt-1 text-xs text-ash leading-relaxed">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Date Range Selector for Orders */}
            {exportType === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-2xl border border-hairline bg-sunken/40 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} weight="duotone" className="text-[#022D4E]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink">Filter Periode Transaksi (Opsional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-ash">Dari Tanggal (Periode A)</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11 text-xs" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-ash">Sampai Tanggal (Periode B)</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11 text-xs" />
                  </div>
                </div>
              </motion.div>
            )}

            {downloadSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald/10 border border-emerald/20 p-3 text-xs font-medium text-emerald">
                <CheckCircle size={16} weight="fill" /> File CSV berhasil diunduh! Silakan buka di Microsoft Excel atau Google Sheets.
              </div>
            )}

            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              // Saya mengganti  bg-[#022D4E] menjadi  bg-[#022D4E] agar tombol berwarna biru gelap dan teks putihnya terlihat jelas
              className="mt-6 group flex min-h-[48px] h-13 w-full items-center justify-center gap-3 rounded-full bg-[#022D4E] text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-px active:scale-[0.98] hover:bg-blue-700 disabled:opacity-50"
              style={{ boxShadow: '0 8px 24px -8px rgba(28, 43, 66, 0.5)' }}
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <DownloadSimple size={18} weight="bold" />
                  <span>Download File CSV (Excel)</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-y-0.5">
                    <ArrowDown size={14} weight="bold" />
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  )
}