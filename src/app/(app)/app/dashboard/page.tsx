'use client'

import { useEffect, useState, useCallback } from 'react'
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
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCustomersWithStats } from '@/services/customerService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { CHANNELS, AGE_RANGES, GENDER_LABELS, MAX_FETCH_ALL } from '@/constants'
import { getAppSettings, syncSettingsFromSheets } from '@/services/settingsService'
import { fadeUp } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import { getSessionUser } from '@/utils/session'
import type { CustomerWithStats, BranchType } from '@/types'

const BRANCHES: { id: BranchType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Semua Cabang' },
  { id: 'CMH', label: 'Cimahi (CMH)' },
  { id: 'BDG', label: 'Bandung (BDG)' },
]

// Distribusi frekuensi repeat order: bucket 1x..9x, lalu 10x+ digabung jadi satu bucket terakhir
const FREQ_MAX = 10

// Warna kontras untuk donut chart channel order — tiap channel gampang dibedakan
const CHANNEL_COLORS = [
  '#022d4e', // navy gelap
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

// Warna donut chart jenis kelamin
const GENDER_COLORS: Record<string, string> = {
  L: '#022d4e',
  P: '#ec4899',
  unknown: '#94a3b8',
}

// Warna kontras untuk donut chart distribusi usia
const AGE_COLORS = [
  '#0ea5e9', // 0-17
  '#8b5cf6', // 18-25
  '#022d4e', // 26-35
  '#10b981', // 36-45
  '#f59e0b', // 46-55
  '#ef4444', // 56-65
  '#ec4899', // 66+
  '#14b8a6', // lainnya / custom
  '#94a3b8', // belum diisi
]

// Cache hasil agregasi di level client supaya pindah tab/halaman tidak refetch 10.000 baris setiap kali
const DASH_CACHE_TTL = 60_000
let dashCache: { data: CustomerWithStats[]; ts: number } | null = null

export default function DashboardPage() {
  const ready = useMounted()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branchFilter, setBranchFilter] = useState<BranchType | 'ALL'>('ALL')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [thresholds, setThresholds] = useState(getAppSettings)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [userRole, setUserRole] = useState('')
  const [userBranch, setUserBranch] = useState('')
  const canExport = userRole === 'admin' || userRole === 'owner'
  useEffect(() => {
    try {
      const user = getSessionUser()
      setUserRole(user?.role || '')
      setUserBranch(user?.branch || '')
      if (user?.role === 'kasir' && user.branch) {
        setBranchFilter(user.branch as BranchType)
      }
    } catch {}
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await syncSettingsFromSheets()
      setThresholds(settings)
      const now = Date.now()
      if (dashCache && now - dashCache.ts < DASH_CACHE_TTL) {
        setCustomers(dashCache.data)
      } else {
        const r = await getCustomersWithStats(0, MAX_FETCH_ALL)
        const data = r.data.map((c) => ({ ...c, retention_status: getRetentionStatus(c.last_order_date, settings) }))
        dashCache = { data, ts: now }
        setCustomers(data)
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose/10 text-rose">
            <WarningCircle size={28} weight="duotone" />
          </span>
          <div>
            <p className="text-base font-semibold text-ink">Gagal memuat data laporan</p>
            <p className="mt-1 text-sm text-ash">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#022D4E] px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          >
            <ArrowsClockwise size={16} weight="bold" />
            Coba Lagi
          </button>
        </div>
      </main>
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
    if (dateFrom && c.last_order_date < dateFrom) return false
    if (dateTo && c.last_order_date > dateTo) return false
    return true
  })

  const hasFilter = channelFilter !== 'ALL' || Boolean(dateFrom || dateTo)
  const getDaysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  const actionCustomers = filteredCustomers
    .filter((customer) => customer.retention_status !== 'active' && !customer.is_followed_up)
    .sort((a, b) => getDaysSince(b.last_order_date) - getDaysSince(a.last_order_date))
  const actionCount = actionCustomers.length

  const handleResetFilter = () => {
    setChannelFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

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

  const branchPerformance = [...new Set([
    ...Object.keys(branchCounts),
    ...filteredCustomers.flatMap((customer) => customer.orders?.map((order) => order.branch).filter((b): b is string => Boolean(b)) || []),
  ])].map((branch) => {
    const branchOrders = filteredCustomers.flatMap((customer) =>
      customer.orders?.filter((order) => order.branch === branch) || [],
    )
    const branchCustomers = filteredCustomers.filter((customer) =>
      customer.orders?.some((order) => order.branch === branch) || false,
    )
    const branchCustomerCount = branchOrders.length > 0
      ? branchCustomers.length
      : filteredCustomers.filter((customer) => customer.branch === branch).length
    const branchRepeatCount = branchCustomers.filter((customer) =>
      (customer.orders?.filter((order) => order.branch === branch).length || 0) > 1,
    ).length
    return {
      branch,
      orders: branchOrders.length,
      customers: branchCustomerCount,
      repeatRate: branchCustomerCount > 0 ? Math.round((branchRepeatCount / branchCustomerCount) * 100) : 0,
    }
  }).sort((a, b) => b.orders - a.orders)

  const monthlyTrend = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - offset))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const orders = filteredCustomers.flatMap((customer) =>
      customer.orders?.filter((order) => order.order_date.startsWith(key)) || [],
    )
    return {
      key,
      label: date.toLocaleDateString('id-ID', { month: 'short' }),
      orders: orders.length,
      newCustomers: filteredCustomers.filter((customer) => customer.first_order_date.startsWith(key)).length,
    }
  })
  const trendMax = Math.max(...monthlyTrend.map((month) => month.orders), 1)

  const total = filteredCustomers.length
  const newCustomers = filteredCustomers.filter((customer) => customer.order_count <= 1).length
  const returningCustomers = Math.max(total - newCustomers, 0)
  const qualityIssues = filteredCustomers.filter((customer) =>
    !customer.phone_normalized ||
    !customer.last_order_date ||
    (!customer.branch && !(customer.branch_memberships?.length)),
  ).length

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

  // Donut chart "Distribusi Channel Order"
  const DONUT_R = 58
  const DONUT_CIRC = 2 * Math.PI * DONUT_R
  let donutCursor = 0
  const donutSegments = channelList.map((ch, i) => {
    const frac = channelTotal > 0 ? ch.count / channelTotal : 0
    const segment = {
      id: ch.id,
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
      dash: Math.max(frac * DONUT_CIRC, 0.4),
      offset: donutCursor,
    }
    donutCursor -= frac * DONUT_CIRC
    return segment
  })

  const getChannelLabel = (id: string) => CHANNELS.find((ch) => ch.id === id)?.label || id

  // Distribusi jenis kelamin (gender || jenis_kelamin fallback lintas sumber data)
  const genderCounts = { L: 0, P: 0, unknown: 0 }
  filteredCustomers.forEach((c) => {
    const g = (c.gender || c.jenis_kelamin || '').trim().toUpperCase()
    if (g.startsWith('L')) genderCounts.L++
    else if (g.startsWith('P')) genderCounts.P++
    else genderCounts.unknown++
  })
  const genderTotal = filteredCustomers.length
  const genderList = [
    { key: 'L', label: GENDER_LABELS.L, count: genderCounts.L, color: GENDER_COLORS.L },
    { key: 'P', label: GENDER_LABELS.P, count: genderCounts.P, color: GENDER_COLORS.P },
    { key: 'unknown', label: 'Belum diisi', count: genderCounts.unknown, color: GENDER_COLORS.unknown },
  ].filter((g) => g.count > 0)

  const GENDER_R = 58
  const GENDER_CIRC = 2 * Math.PI * GENDER_R
  let genderCursor = 0
  const genderSegments = genderList.map((g) => {
    const frac = genderTotal > 0 ? g.count / genderTotal : 0
    const segment = {
      ...g,
      dash: Math.max(frac * GENDER_CIRC, 0.4),
      offset: genderCursor,
    }
    genderCursor -= frac * GENDER_CIRC
    return segment
  })

  // Distribusi usia (age_range || usia fallback) — urut sesuai AGE_RANGES, jadi donut
  const ageRaw: Record<string, number> = {}
  filteredCustomers.forEach((c) => {
    const age = (c.age_range || c.usia || '').trim() || 'Belum diisi'
    ageRaw[age] = (ageRaw[age] || 0) + 1
  })
  const ageTotal = filteredCustomers.length
  const ageList = [
    ...AGE_RANGES.filter((a) => ageRaw[a]).map((a, i) => ({
      key: a,
      label: a,
      count: ageRaw[a],
      color: AGE_COLORS[i % AGE_COLORS.length],
      isMissing: false,
    })),
    ...Object.entries(ageRaw)
      .filter(([k]) => !(AGE_RANGES as readonly string[]).includes(k) && k !== 'Belum diisi')
      .map(([k, count]) => ({
        key: k,
        label: k,
        count,
        color: AGE_COLORS[7 % AGE_COLORS.length],
        isMissing: false,
      })),
    ...(ageRaw['Belum diisi']
      ? [{
          key: 'Belum diisi',
          label: 'Belum diisi',
          count: ageRaw['Belum diisi'],
          color: AGE_COLORS[8 % AGE_COLORS.length],
          isMissing: true,
        }]
      : []),
  ]

  const AGE_R = 58
  const AGE_CIRC = 2 * Math.PI * AGE_R
  let ageCursor = 0
  const ageSegments = ageList.map((a) => {
    const frac = ageTotal > 0 ? a.count / ageTotal : 0
    const segment = {
      ...a,
      dash: Math.max(frac * AGE_CIRC, 0.4),
      offset: ageCursor,
    }
    ageCursor -= frac * AGE_CIRC
    return segment
  })

  const statsGrid = [
    {
      label: 'Total Customer',
      value: total,
      unit: 'orang',
      sub: `${counts.active} aktif · ${counts.at_risk} risk`,
      icon: UsersThree,
      hue: 'text-[#022D4E]',
      glow: ' bg-[#022D4E]/10',
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
      hue: 'text-[#022D4E]-deep',
      glow: 'bg-amber/10',
    },
  ]

  const segments = [
    { key: 'active' as const, label: 'Aktif', range: `0–${thresholds.activeDays} hari`, count: counts.active, color: 'bg-emerald', pct: total > 0 ? Math.round((counts.active / total) * 100) : 0 },
    { key: 'at_risk' as const, label: 'At Risk', range: `${thresholds.activeDays + 1}–${thresholds.atRiskDays} hari`, count: counts.at_risk, color: 'bg-amber', pct: total > 0 ? Math.round((counts.at_risk / total) * 100) : 0 },
    { key: 'churned' as const, label: 'Churned', range: `${thresholds.atRiskDays + 1}+ hari`, count: counts.churned, color: 'bg-rose', pct: total > 0 ? Math.round((counts.churned / total) * 100) : 0 },
  ]

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
      gender: (c.gender || c.jenis_kelamin) === 'L' ? 'Laki-laki' : (c.gender || c.jenis_kelamin) === 'P' ? 'Perempuan' : '',
      usia: c.age_range || c.usia || '',
      cabang: c.branch || [...new Set(c.orders?.map(o => o.branch).filter(Boolean) || [])].join('+'),
      jumlah_order: c.order_count || 0,
      order_terakhir: c.last_order_date,
      lama_tidak_order_hari: getDaysSince(c.last_order_date),
      status_retensi: getRetentionLabel(c.retention_status),
    }))
    const tag = [
      branchFilter === 'ALL' ? 'SemuaCabang' : branchFilter,
      channelFilter === 'ALL' ? 'SemuaChannel' : getChannelLabel(channelFilter).replace(/\s+/g, ''),
      ...(dateFrom || dateTo ? [`${dateFrom || 'awal'}-${dateTo || 'akhir'}`] : []),
    ].join('-')
    downloadCsv(rows, `Dashboard_Retensi_${tag}.csv`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-10 pb-28 md:pb-20">
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#022D4E]">Laporan Retensi & Analitik</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Dashboard Retensi</h1>
            <p className="mt-1.5 text-xs text-ash sm:text-sm">Analisis detail kesehatan basis pelanggan dan performa transaksi F&B</p>
          </div>
          {canExport && <button
            type="button"
            onClick={handleDownload}
            disabled={filteredCustomers.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 min-h-[44px] text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:bg-ink/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          >
            <DownloadSimple size={18} weight="duotone" className="text-[#022D4E]" />
            Download Laporan
          </button>}
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
                className={`flex items-center gap-2 rounded-full px-4 min-h-[44px] text-xs font-semibold transition-all whitespace-nowrap ${
                  branchFilter === b.id
                    ? 'bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(28,43,66,0.5)]'
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
                <FunnelSimple size={16} weight="duotone" className="text-[#022D4E]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ash">Filter Laporan</span>
              </div>
              {hasFilter && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink rounded-full px-4 min-h-[44px] ring-1 ring-ink/10 bg-white transition-all hover:bg-ink/5 active:scale-95"
                >
                  <Prohibit size={13} weight="duotone" className="text-[#022D4E]" />
                  Reset Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">Channel Order</span>
                <Select value={channelFilter} onValueChange={(v) => v && setChannelFilter(v)}>
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Channel</SelectItem>
                    {CHANNELS.map((ch) => <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">Dari Tanggal</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-11 text-xs rounded-2xl"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">Sampai Tanggal</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-11 text-xs rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6">
        {statsGrid.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            custom={i + 2}
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
          >
            <div className="doppel-outer h-full">
              <Link
                href={s.label === 'Total Customer' ? '/app/customers' : s.label === 'Repeat Rate' ? '/app/customers?order_count_min=2' : s.label === 'Churn Rate' ? '/app/customers?status=churned' : '/app/customers'}
                className="doppel-inner flex h-full flex-col justify-between p-4 sm:p-5 transition-colors hover:bg-sunken/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
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
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} custom={5.5} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="doppel-outer">
          <div className="doppel-inner p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber/10">
                    <WarningCircle size={18} weight="duotone" className="text-amber" />
                  </span>
                  <h2 className="text-base font-semibold text-ink">Perlu Ditindak Hari Ini</h2>
                </div>
                <p className="mt-1 text-xs text-ash">
                  {actionCount > 0
                    ? `${actionCount} customer At Risk/Churned belum ditandai sudah dihubungi.`
                    : 'Tidak ada customer tertunda pada scope dan filter aktif.'}
                </p>
              </div>
              <Link
                href="/app/follow-up"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#022D4E] px-5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Buka Follow-up
              </Link>
            </div>
            {actionCustomers.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {actionCustomers.slice(0, 3).map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/app/customers/${customer.id}`}
                    className="rounded-2xl border border-hairline bg-white p-3 transition-colors hover:bg-sunken/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="truncate text-sm font-semibold text-ink">{customer.name}</div>
                    <div className="mt-1 text-xs text-ash">{getDaysSince(customer.last_order_date)} hari sejak order terakhir</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ash" aria-live="polite">
        <span>Scope: {branchFilter === 'ALL' ? 'Semua cabang' : branchFilter}{channelFilter !== 'ALL' ? ` · ${getChannelLabel(channelFilter)}` : ''}</span>
        <span>{lastUpdated ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Memuat data terbaru...'}</span>
      </div>

      {/* Segmentation & Channel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 mb-8">
        <motion.div variants={fadeUp} custom={6} initial="hidden" animate={ready ? 'show' : 'hidden'} className="lg:col-span-7">
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-ink">Segmentasi Status Retensi</h2>
                  <Link href="/app/customers" className="text-xs font-semibold text-[#022D4E] hover:underline">Lihat semua →</Link>
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
                          <span className="font-semibold text-ink group-hover:text-[#022D4E] transition-colors">{s.label}</span>
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
                  <TrendUp size={16} className="text-[#022D4E]" />
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
                  <ChartPie size={18} weight="duotone" className="text-[#022D4E]" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-5">
                {channelList.length > 0 ? (
                  <>
                    <div className="relative h-40 w-40">
                      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                        <circle cx="80" cy="80" r={DONUT_R} fill="none" stroke="var(--color-sunken)" strokeWidth="18" />
                        {donutSegments.map((s) => (
                          <circle
                            key={s.id}
                            cx="80"
                            cy="80"
                            r={DONUT_R}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="18"
                            strokeLinecap="round"
                            strokeDasharray={`${s.dash} ${DONUT_CIRC - s.dash}`}
                            strokeDashoffset={s.offset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold tabular-nums text-ink">{channelTotal.toLocaleString('id-ID')}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">order</span>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      {channelList.map((ch, i) => {
                        const pct = channelTotal > 0 ? Math.round((ch.count / channelTotal) * 100) : 0
                        const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length]
                        return (
                          <div key={ch.id} className="flex items-center justify-between gap-3 rounded-xl bg-sunken/40 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                              <span className="truncate text-xs font-medium text-ink">{ch.label}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                              <span className="text-ink">{ch.count.toLocaleString('id-ID')}</span>
                              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ash">{pct}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
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
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl  bg-[#022D4E]-wash">
                  <ChartBar size={18} weight="duotone" className="text-[#022D4E]" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">Distribusi Frekuensi Order</h2>
                  <p className="text-[11px] text-ash">Jumlah customer per total order klik bar untuk melihat daftarnya</p>
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
                      <span className="text-[10px] font-semibold tabular-nums text-ash group-hover:text-[#022D4E]">{b.count}</span>
                      <div
                        className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                          b.count > 0
                            ? 'bg-blue-500 group-hover: bg-[#022D4E] group-hover:shadow-[0_-4px_14px_-4px_rgba(28,43,66,0.6)]'
                            : 'bg-sunken'
                        }`}
                        style={{ height: `${barPx}px` }}
                      />
                      <span className="text-[10px] tabular-nums text-mist group-hover:text-[#022D4E] group-hover:font-semibold">{b.label}</span>
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

      {/* Distribusi Jenis Kelamin & Usia */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-8">
        <motion.div variants={fadeUp} custom={7.7} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#022D4E]-wash">
                    <UsersThree size={18} weight="duotone" className="text-[#022D4E]" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Distribusi Jenis Kelamin</h2>
                    <p className="text-[11px] text-ash">Proporsi customer pada filter aktif</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-ash">{genderTotal} orang</span>
              </div>

              {genderList.length > 0 && genderTotal > 0 ? (
                <div className="flex flex-col items-center gap-5">
                  <div className="relative h-40 w-40 shrink-0">
                    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r={GENDER_R} fill="none" stroke="var(--color-sunken)" strokeWidth="18" />
                      {genderSegments.map((s) => (
                        <circle
                          key={s.key}
                          cx="80"
                          cy="80"
                          r={GENDER_R}
                          fill="none"
                          stroke={s.color}
                          strokeWidth="18"
                          strokeLinecap="round"
                          strokeDasharray={`${s.dash} ${GENDER_CIRC - s.dash}`}
                          strokeDashoffset={s.offset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold tabular-nums text-ink">{genderTotal.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">customer</span>
                    </div>
                  </div>

                  {/* Legend di bawah donut: jumlah + persentase */}
                  <div className="w-full space-y-2">
                    {genderList.map((g) => {
                      const pct = genderTotal > 0 ? Math.round((g.count / genderTotal) * 100) : 0
                      return (
                        <div key={g.key} className="flex items-center justify-between gap-3 rounded-xl bg-sunken/40 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                            <span className="truncate text-xs font-medium text-ink">{g.label}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                            <span className="text-ink">{g.count.toLocaleString('id-ID')} orang</span>
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ash">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-ash">Tidak ada data jenis kelamin pada filter ini.</div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={7.75} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer h-full">
            <div className="doppel-inner h-full p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#022D4E]-wash">
                    <ChartBar size={18} weight="duotone" className="text-[#022D4E]" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Distribusi Usia</h2>
                    <p className="text-[11px] text-ash">Jumlah customer per rentang usia</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-ash">{filteredCustomers.length} customer</span>
              </div>

              {ageList.length > 0 && ageTotal > 0 ? (
                <div className="flex flex-col items-center gap-5">
                  <div className="relative h-40 w-40 shrink-0">
                    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                      <circle cx="80" cy="80" r={AGE_R} fill="none" stroke="var(--color-sunken)" strokeWidth="18" />
                      {ageSegments.map((s) => (
                        <circle
                          key={s.key}
                          cx="80"
                          cy="80"
                          r={AGE_R}
                          fill="none"
                          stroke={s.color}
                          strokeWidth="18"
                          strokeLinecap="round"
                          strokeDasharray={`${s.dash} ${AGE_CIRC - s.dash}`}
                          strokeDashoffset={s.offset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold tabular-nums text-ink">{ageTotal.toLocaleString('id-ID')}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ash">customer</span>
                    </div>
                  </div>

                  {/* Legend di bawah donut: jumlah + persentase */}
                  <div className="w-full space-y-2">
                    {ageList.map((a) => {
                      const pct = ageTotal > 0 ? Math.round((a.count / ageTotal) * 100) : 0
                      return (
                        <div key={a.key} className="flex items-center justify-between gap-3 rounded-xl bg-sunken/40 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                            <span className={`truncate text-xs font-medium ${a.isMissing ? 'text-mist' : 'text-ink'}`}>{a.label}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                            <span className="text-ink">{a.count.toLocaleString('id-ID')} orang</span>
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ash">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-ash">Tidak ada data usia pada filter ini.</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-8">
        <motion.div variants={fadeUp} custom={7.8} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-ink">Trend 6 Bulan</h2>
                  <p className="mt-1 text-xs text-ash">Order dan customer baru pada scope aktif</p>
                </div>
                <TrendUp size={18} weight="duotone" className="text-[#022D4E]" />
              </div>
              <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="Trend order enam bulan">
                {monthlyTrend.map((month) => (
                  <div key={month.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-semibold tabular-nums text-ash">{month.orders}</span>
                    <div
                      className="w-full max-w-10 rounded-t-xl bg-blue-500 hover: bg-[#022D4E] transition-all cursor-pointer"
                      style={{ height: `${Math.max((month.orders / trendMax) * 120, month.orders > 0 ? 8 : 2)}px` }}
                      title={`${month.label}: ${month.orders} order`}
                    />
                    <span className="text-[10px] text-mist">{month.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-sunken/50 p-3">
                  <div className="text-xs text-ash">Customer baru</div>
                  <div className="mt-1 text-lg font-semibold text-ink">{newCustomers}</div>
                </div>
                <div className="rounded-xl bg-sunken/50 p-3">
                  <div className="text-xs text-ash">Returning</div>
                  <div className="mt-1 text-lg font-semibold text-ink">{returningCustomers}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={7.9} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer h-full">
            <div className="doppel-inner p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-ink">Perbandingan Cabang</h2>
                  <p className="mt-1 text-xs text-ash">Ranking berdasarkan order pada scope aktif</p>
                </div>
                <Storefront size={18} weight="duotone" className="text-[#022D4E]" />
              </div>
              {branchPerformance.length > 0 ? (
                <div className="space-y-3">
                  {branchPerformance.map((item) => {
                    const pct = totalOrdersAll > 0 ? Math.round((item.orders / totalOrdersAll) * 100) : 0
                    return (
                      <Link
                        key={item.branch}
                        href={`/app/dashboard?branch=${encodeURIComponent(item.branch)}`}
                        className="block rounded-2xl border border-hairline bg-white p-3 transition-colors hover:bg-sunken/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-ink">{item.branch}</span>
                          <span className="text-xs text-ash">{item.orders} order · {item.repeatRate}% repeat</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full  bg-[#022D4E]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-ash">{item.customers} customer · {pct}% kontribusi order</div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-sunken/50 p-8 text-center text-sm text-ash">Belum ada data cabang pada scope ini.</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} custom={8.1} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-8">
        <div className="doppel-outer">
          <div className="doppel-inner flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-ink">Kualitas Data</h2>
              <p className="mt-1 text-xs text-ash">Pemeriksaan ringan pada data yang sedang ditampilkan.</p>
            </div>
            <div className={`rounded-full px-4 py-2 text-xs font-semibold ${qualityIssues > 0 ? 'bg-amber/10 text-[#022D4E]-deep' : 'bg-emerald/10 text-emerald'}`}>
              {qualityIssues > 0 ? `${qualityIssues} customer perlu diperiksa` : 'Data terlihat sehat'}
            </div>
          </div>
        </div>
      </motion.div>

      </main>
  )
}
