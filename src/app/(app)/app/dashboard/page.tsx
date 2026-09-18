'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  UsersThree,
  ArrowsClockwise,
  PersonSimpleWalk,
  ChartPie,
  ChartBar,
  ShoppingBag,
  Storefront,
  TrendUp,
  DownloadSimple,
  FunnelSimple,
  Prohibit,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCustomersWithStats } from '@/services/customerService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { CHANNELS, DEFAULT_THRESHOLDS } from '@/constants'
import { fadeUp } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import type { CustomerWithStats, BranchType } from '@/types'

const BRANCHES: { id: BranchType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Semua Cabang' },
  { id: 'CMH', label: 'Cimahi (CMH)' },
  { id: 'BDG', label: 'Bandung (BDG)' },
]

// Distribusi frekuensi repeat order: bucket 1x..9x, lalu 10x+ digabung jadi satu bucket terakhir
const FREQ_MAX = 10

// Cache hasil agregasi di level client supaya pindah tab/halaman tidak refetch 10.000 baris setiap kali
const DASH_CACHE_TTL = 60_000
let dashCache: { data: CustomerWithStats[]; ts: number } | null = null

export default function DashboardPage() {
  const ready = useMounted()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState<BranchType | 'ALL'>('ALL')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')

  const [userRole, setUserRole] = useState('')
  const [userBranch, setUserBranch] = useState('')
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('retainly_user') || '{}')
      setUserRole(user.role || '')
      setUserBranch(user.branch || '')
      if (user.role === 'kasir' && user.branch) {
        setBranchFilter(user.branch as BranchType)
      }
    } catch {}
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const now = Date.now()
        if (dashCache && now - dashCache.ts < DASH_CACHE_TTL) {
          setCustomers(dashCache.data)
        } else {
          const r = await getCustomersWithStats(0, 10000)
          const data = r.data.map((c) => ({ ...c, retention_status: getRetentionStatus(c.last_order_date, DEFAULT_THRESHOLDS) }))
          dashCache = { data, ts: now }
          setCustomers(data)
        }
      } catch { /* silent */ } finally { setLoading(false) }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      </div>
    )
  }

  const branchCustomers = branchFilter === 'ALL'
    ? customers
    : customers.filter(c => {
        const hasOrdersInBranch = c.orders?.some(o => o.branch === branchFilter)
        return hasOrdersInBranch || c.branch === branchFilter
      })

  const filteredCustomers = branchCustomers.filter(c => {
    if (channelFilter !== 'ALL' && !c.orders?.some(o => o.channel === channelFilter)) return false
    return true
  })

  const counts = { active: 0, at_risk: 0, churned: 0 }
  const channelCounts: Record<string, number> = {}
  const branchCounts: Record<string, number> = {}
  let totalOrdersAll = 0

  filteredCustomers.forEach((c) => {
    counts[c.retention_status as keyof typeof counts]++
    totalOrdersAll += c.order_count || 0

    if (c.orders && Array.isArray(c.orders)) {
      c.orders.forEach((o) => {
        channelCounts[o.channel] = (channelCounts[o.channel] || 0) + 1
        if (o.branch) {
          branchCounts[o.branch] = (branchCounts[o.branch] || 0) + 1
        }
      })
    }
  })

  const channelTotal = Object.values(channelCounts).reduce((a, b) => a + b, 0)

  const total = filteredCustomers.length
  const repeatCount = branchCustomers.filter((c) => (c.order_count || 0) > 1).length
  const repeatRate = total > 0 ? Math.round((repeatCount / total) * 100) : 0
  const churnRate = total > 0 ? Math.round((counts.churned / total) * 100) : 0
  const avgOrder = total > 0 ? (totalOrdersAll / total).toFixed(1) : '0'

  const topChannelEntry = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]
  const topChannelLabel = topChannelEntry ? (CHANNELS.find((ch) => ch.id === topChannelEntry[0])?.label || topChannelEntry[0]) : 'N/A'

  // Distribusi frekuensi repeat order: 1x, 2x, 3x, ... lalu 10x+ digabung jadi satu bucket terakhir
  const freqBuckets: { min: number; max: number; label: string; count: number }[] = []
  for (let i = 1; i < FREQ_MAX; i++) {
    const count = filteredCustomers.filter((c) => (c.order_count || 0) === i).length
    freqBuckets.push({ min: i, max: i, label: `${i}x`, count })
  }
  {
    const count = filteredCustomers.filter((c) => (c.order_count || 0) >= FREQ_MAX).length
    freqBuckets.push({ min: FREQ_MAX, max: Infinity, label: `${FREQ_MAX}x+`, count })
  }
  const freqMaxCount = Math.max(...freqBuckets.map((b) => b.count), 1)

  const buildOrderFilterHref = (b: { min: number; max: number }) =>
    b.max === Infinity
      ? `/app/customers?order_count_min=${b.min}`
      : `/app/customers?order_count_min=${b.min}&order_count_max=${b.max}`

  const channelList = CHANNELS.map((ch) => ({
    ...ch,
    count: channelCounts[ch.id] || 0,
  })).filter((ch) => ch.count > 0).sort((a, b) => b.count - a.count)

  const getChannelLabel = (id: string) => CHANNELS.find((ch) => ch.id === id)?.label || id

  const statsGrid = [
    {
      label: 'Total Customer',
      value: total,
      unit: 'orang',
      sub: `${counts.active} aktif · ${counts.at_risk} risk`,
      icon: UsersThree,
      hue: 'text-accent',
      glow: 'bg-accent/10',
    },
    {
      label: 'Repeat Rate',
      value: repeatRate,
      unit: '%',
      sub: `${repeatCount} customer repeat`,
      icon: ArrowsClockwise,
      hue: 'text-emerald',
      glow: 'bg-emerald/10',
    },
    {
      label: 'Churn Rate',
      value: churnRate,
      unit: '%',
      sub: `${counts.churned} customer churned`,
      icon: PersonSimpleWalk,
      hue: 'text-ink',
      glow: 'bg-rose/10',
    },
    {
      label: 'Rata-Rata Order',
      value: avgOrder,
      unit: 'x',
      sub: `Channel #1: ${topChannelLabel}`,
      icon: ShoppingBag,
      hue: 'text-accent-deep',
      glow: 'bg-amber/10',
    },
  ]

  const segments = [
    { key: 'active' as const, label: 'Aktif', range: '0–30 hari', count: counts.active, color: 'bg-emerald', pct: total > 0 ? Math.round((counts.active / total) * 100) : 0 },
    { key: 'at_risk' as const, label: 'At Risk', range: '31–60 hari', count: counts.at_risk, color: 'bg-amber', pct: total > 0 ? Math.round((counts.at_risk / total) * 100) : 0 },
    { key: 'churned' as const, label: 'Churned', range: '61+ hari', count: counts.churned, color: 'bg-rose', pct: total > 0 ? Math.round((counts.churned / total) * 100) : 0 },
  ]

  const getDaysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

  const downloadCsv = (rows: Record<string, string | number>[], filename: string) => {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const BOM = '\uFEFF'
    const csvContent = [
      headers.map((h) => `"${h.replace(/_/g, ' ').toUpperCase()}"`).join(','),
      ...rows.map((row) => headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')),
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

  const handleDownload = () => {
    const rows = filteredCustomers.map((c, idx) => ({
      no: idx + 1,
      nama_customer: c.name,
      no_whatsapp: c.phone_normalized,
      gender: c.gender === 'L' ? 'Laki-laki' : c.gender === 'P' ? 'Perempuan' : '',
      usia: c.age_range || '',
      cabang: c.branch || [...new Set(c.orders?.map(o => o.branch).filter(Boolean) || [])].join('+'),
      jumlah_order: c.order_count || 0,
      order_terakhir: c.last_order_date,
      lama_tidak_order_hari: getDaysSince(c.last_order_date),
      status_retensi: getRetentionLabel(c.retention_status),
    }))
    const tag = [
      branchFilter === 'ALL' ? 'SemuaCabang' : branchFilter,
      channelFilter === 'ALL' ? 'SemuaChannel' : getChannelLabel(channelFilter).replace(/\s+/g, ''),
    ].join('-')
    downloadCsv(rows, `Dashboard_Retensi_${tag}.csv`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Laporan Retensi & Analitik</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Dashboard Retensi</h1>
            <p className="mt-1.5 text-xs text-ash sm:text-sm">Analisis detail kesehatan basis pelanggan dan performa transaksi F&B</p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={filteredCustomers.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:bg-ink/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          >
            <DownloadSimple size={18} weight="duotone" className="text-accent" />
            Download Laporan
          </button>
        </div>
      </motion.div>

      {/* Branch Filter */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {BRANCHES.map((b) => {
            const isDisabled = (userRole === 'kasir' && b.id === 'ALL') ||
                               (userRole === 'kasir' && b.id !== userBranch)
            return (
              <button
                key={b.id}
                onClick={() => {
                  if (!isDisabled) {
                    setBranchFilter(b.id)
                  }
                }}
                disabled={isDisabled}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                  branchFilter === b.id
                    ? 'bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(27,44,193,0.5)]'
                    : isDisabled
                      ? 'border border-hairline bg-sunken text-ash cursor-not-allowed opacity-60'
                      : 'border border-hairline bg-white text-ash hover:bg-sunken hover:text-ink'
                }`}
              >
                <Storefront size={14} weight="duotone" />
                {b.label}
              </button>
            )
          })}
        </div>
        {userRole === 'kasir' && (
          <p className="mt-2 text-xs text-ash">Kasir hanya bisa melihat data cabang sendiri ({userBranch})</p>
        )}
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="doppel-outer">
          <div className="doppel-inner p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FunnelSimple size={16} weight="duotone" className="text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ash">Filter Laporan</span>
              </div>
              {(channelFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setChannelFilter('ALL') }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink rounded-full px-3 py-1.5 ring-1 ring-ink/10 bg-white transition-all hover:bg-ink/5 active:scale-95"
                >
                  <Prohibit size={13} weight="duotone" className="text-accent" />
                  Reset Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="sm:max-w-xs">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">Channel Order</span>
                <Select value={channelFilter} onValueChange={(v) => v && setChannelFilter(v)}>
                  <SelectTrigger className="h-10 w-full rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Channel</SelectItem>
                    {CHANNELS.map((ch) => <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 mb-6">
        {statsGrid.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            custom={i + 2}
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
          >
            <div className="doppel-outer h-full">
              <div className="doppel-inner flex h-full flex-col justify-between p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ash">{s.label}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${s.glow}`}>
                    <s.icon size={18} weight="duotone" className={s.hue} />
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    {s.value}
                    {s.unit && <span className="text-lg font-normal text-mist ml-1">{s.unit}</span>}
                  </div>
                  <div className="mt-1 text-xs text-ash">{s.sub}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Segmentation & Channel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 mb-8">
        <motion.div variants={fadeUp} custom={6} initial="hidden" animate={ready ? 'show' : 'hidden'} className="lg:col-span-7">
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-ink">Segmentasi Status Retensi</h2>
                  <Link href="/app/customers" className="text-xs font-semibold text-accent hover:underline">Lihat semua →</Link>
                </div>
                <div className="space-y-4">
                  {segments.map((s) => (
                    <Link
                      key={s.key}
                      href={`/app/customers?status=${s.key}`}
                      className="group block"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                          <span className="font-semibold text-ink group-hover:text-accent transition-colors">{s.label}</span>
                          <span className="text-mist">({s.range})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{s.count} orang</span>
                          <span className="text-ash">({s.pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sunken">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-sunken/60 p-3 text-xs text-ash">
                <div className="flex items-center gap-1.5">
                  <TrendUp size={16} className="text-accent" />
                  <span>Strategi Retensi:</span>
                </div>
                <span className="font-medium text-ink">Segera hubungi customer At Risk & Churned</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={7} initial="hidden" animate={ready ? 'show' : 'hidden'} className="lg:col-span-5">
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-ink">Distribusi Channel Order</h2>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ash">{channelTotal} order</span>
                  <ChartPie size={18} weight="duotone" className="text-accent" />
                </div>
              </div>

              <div className="space-y-3">
                {channelList.length > 0 ? channelList.map((ch) => {
                  const pct = channelTotal > 0 ? Math.round((ch.count / channelTotal) * 100) : 0
                  return (
                    <div key={ch.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span className="font-medium text-ink">{ch.label}</span>
                      </div>
                      <div className="flex flex-1 items-center gap-2 mx-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="font-mono text-ash shrink-0">
                        {ch.count} <span className="text-[10px] text-mist">({pct}%)</span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="py-8 text-center text-xs text-ash">
                    Tidak ada data channel pada filter ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Distribusi Frekuensi Repeat Order */}
      <motion.div variants={fadeUp} custom={7.6} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-8">
        <div className="doppel-outer">
          <div className="doppel-inner p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-wash">
                  <ChartBar size={18} weight="duotone" className="text-accent" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">Distribusi Frekuensi Order</h2>
                  <p className="text-[11px] text-ash">Jumlah customer per total order — klik bar untuk melihat daftarnya</p>
                </div>
              </div>
              <span className="text-xs font-mono text-ash">{filteredCustomers.length} customer</span>
            </div>

            {filteredCustomers.length > 0 ? (
              <div className="flex items-end gap-1.5 sm:gap-3 h-48" role="img" aria-label="Distribusi frekuensi order">
                {freqBuckets.map((b) => {
                  const barPx = b.count > 0 ? Math.max(Math.round((b.count / freqMaxCount) * 120), 6) : 2
                  return (
                    <Link
                      key={b.label}
                      href={buildOrderFilterHref(b)}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5 rounded-xl px-1 pt-2 transition-colors hover:bg-sunken/50"
                      title={`Lihat customer dengan ${b.label} order`}
                    >
                      <span className="text-[10px] font-semibold tabular-nums text-ash group-hover:text-accent">{b.count}</span>
                      <div
                        className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                          b.count > 0
                            ? 'bg-accent/25 group-hover:bg-accent group-hover:shadow-[0_-4px_14px_-4px_rgba(27,44,193,0.5)]'
                            : 'bg-ink/5'
                        }`}
                        style={{ height: `${barPx}px` }}
                      />
                      <span className="text-[10px] tabular-nums text-mist group-hover:text-accent group-hover:font-semibold">{b.label}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-ash">Tidak ada data pada filter ini.</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Branch Breakdown (owner only) */}
      {userRole === 'owner' && Object.keys(branchCounts).length > 0 && (
        <motion.div variants={fadeUp} custom={8} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-8">
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-ink">Order per Cabang</h2>
                <Storefront size={18} weight="duotone" className="text-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).map(([branch, count]) => {
                  const pct = totalOrdersAll > 0 ? Math.round((count / totalOrdersAll) * 100) : 0
                  return (
                    <div key={branch} className="rounded-2xl border border-hairline bg-white p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Storefront size={14} weight="duotone" className="text-accent" />
                        <span className="text-sm font-semibold text-ink">{branch}</span>
                      </div>
                      <div className="text-2xl font-bold text-ink">{count}</div>
                      <div className="text-xs text-ash">{pct}% dari total order</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </main>
  )
}
