'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MagnifyingGlass,
  UsersThree,
  Calendar,
  Funnel,
  X,
  Phone,
  ShoppingBag,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCustomersWithStats, searchCustomers } from '@/services/customerService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { CHANNELS, DEFAULT_THRESHOLDS, PAGE_SIZE } from '@/constants'
import { fadeUp } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import type { CustomerWithStats, RetentionStatus } from '@/types'

type RepeatFilter = 'all' | '1x' | '2-5x' | '6-10x' | '11-20x' | '21x+'

const REPEAT_FILTERS: { key: RepeatFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: '1x', label: '1x' },
  { key: '2-5x', label: '2-5x' },
  { key: '6-10x', label: '6-10x' },
  { key: '11-20x', label: '11-20x' },
  { key: '21x+', label: '21x+' },
]

function matchesRepeatFilter(count: number, filter: RepeatFilter): boolean {
  if (filter === 'all') return true
  if (filter === '1x') return count === 1
  if (filter === '2-5x') return count >= 2 && count <= 5
  if (filter === '6-10x') return count >= 6 && count <= 10
  if (filter === '11-20x') return count >= 11 && count <= 20
  if (filter === '21x+') return count >= 21
  return true
}

function CustomerListView() {
  const ready = useMounted()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<RetentionStatus | 'all'>('all')
  const [repeatFilter, setRepeatFilter] = useState<RepeatFilter>('all')
  const [countRange, setCountRange] = useState<{ min: number; max: number } | null>(null)

  // Date Filter State
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      if (searchQuery) {
        const result = await searchCustomers(searchQuery, page, PAGE_SIZE)
        const withStats: CustomerWithStats[] = result.data.map((c) => ({
          ...c,
          retention_status: getRetentionStatus(c.last_order_date, DEFAULT_THRESHOLDS),
        }))
        setCustomers(withStats)
        setTotalPages(result.totalPages)
        setTotal(result.count)
      } else {
        const result = await getCustomersWithStats(page, PAGE_SIZE)
        const withStatus = result.data.map((c) => ({
          ...c,
          retention_status: getRetentionStatus(c.last_order_date, DEFAULT_THRESHOLDS),
        }))
        setCustomers(withStatus)
        setTotalPages(result.totalPages)
        setTotal(result.count)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  // Support drill-down query params from Dashboard: ?status=... dan ?order_count_min&order_count_max
  useEffect(() => {
    if (!searchParams) return
    const status = searchParams.get('status')
    if (status === 'active' || status === 'at_risk' || status === 'churned') {
      setFilter(status)
    }
    const minStr = searchParams.get('order_count_min')
    const maxStr = searchParams.get('order_count_max')
    const min = minStr ? parseInt(minStr, 10) : null
    const max = maxStr ? parseInt(maxStr, 10) : null
    if (min !== null || max !== null) {
      setCountRange({ min: min ?? 0, max: max ?? Number.MAX_SAFE_INTEGER })
    }
  }, [searchParams])

  const filtered = customers.filter((c) => {
    if (filter !== 'all' && c.retention_status !== filter) return false
    if (!matchesRepeatFilter(c.order_count || 0, repeatFilter)) return false
    if (countRange) {
      const oc = c.order_count || 0
      if (oc < countRange.min || oc > countRange.max) return false
    }
    if (dateFrom && c.last_order_date < dateFrom) return false
    if (dateTo && c.last_order_date > dateTo) return false
    return true
  })

  const countRangeLabel = countRange
    ? countRange.max === Number.MAX_SAFE_INTEGER
      ? `${countRange.min}x+`
      : countRange.min === countRange.max
        ? `${countRange.min}x`
        : `${countRange.min}x–${countRange.max}x`
    : ''

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2)
  const getDaysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

  const getStatusBadge = (status: RetentionStatus, days: number) => {
    if (status === 'active') return <Badge className="bg-emerald/10 text-emerald border-emerald/20">Active</Badge>
    if (status === 'at_risk') return <Badge className="bg-amber/10 text-accent-deep border-amber/20">{days}d Risk</Badge>
    return <Badge className="bg-rose/10 text-ink border-rose/20">{days}d Churned</Badge>
  }

  const getAvatarStyle = (status: RetentionStatus) => {
    if (status === 'active') return 'bg-accent-wash text-accent-deep'
    if (status === 'at_risk') return 'bg-amber/10 text-accent-deep'
    return 'bg-rose/10 text-ink'
  }

  const getFavChannel = (c: CustomerWithStats) => {
    if (!c.orders || !Array.isArray(c.orders) || c.orders.length === 0) return null
    const freq: Record<string, number> = {}
    for (const o of c.orders) { freq[o.channel] = (freq[o.channel] || 0) + 1 }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    return CHANNELS.find((ch) => ch.id === top[0])?.label || top[0]
  }

  const counts = { active: 0, at_risk: 0, churned: 0 }
  customers.forEach((c) => counts[c.retention_status as keyof typeof counts]++)

  const statusFilters = [
    { key: 'all' as const, label: 'Semua', count: total },
    { key: 'active' as const, label: 'Active', count: counts.active },
    { key: 'at_risk' as const, label: 'At Risk', count: counts.at_risk },
    { key: 'churned' as const, label: 'Churned', count: counts.churned },
  ]

  const hasDateFilter = Boolean(dateFrom || dateTo)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Heading */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Database</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Daftar Customer</h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">{total} customer terdaftar dalam database</p>
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-mist" size={20} weight="light" />
            <Input
              type="text"
              placeholder="Cari nama atau no. telepon..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
              className="h-12 pl-11 text-sm rounded-2xl"
            />
          </div>
          <button
            onClick={() => setShowDateFilter((prev) => !prev)}
            className={`flex min-h-[48px] items-center gap-2 rounded-2xl border px-4 text-xs font-semibold transition-all ${
              hasDateFilter || showDateFilter
                ? 'border-accent bg-accent-wash text-accent-deep'
                : 'border-hairline bg-white text-ash hover:bg-sunken hover:text-ink'
            }`}
          >
            <Funnel size={16} weight="bold" />
            <span>Filter Tanggal</span>
            {hasDateFilter && (
              <span className="flex h-2 w-2 rounded-full bg-accent" />
            )}
          </button>
        </div>

        {/* Date Range Selector */}
        {showDateFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="doppel-outer"
          >
            <div className="doppel-inner p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink">Filter Berdasarkan Order Terakhir</span>
                {hasDateFilter && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    className="flex items-center gap-1 text-xs text-ink hover:underline"
                  >
                    <X size={13} weight="bold" /> Reset Tanggal
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ash">Dari Tanggal</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ash">Sampai Tanggal</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 text-xs rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Status Filter Chips */}
      <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(0) }}
            className={`group flex min-h-[38px] flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 active:scale-[0.98] ${
              filter === f.key
                ? 'bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(27,44,193,0.5)]'
                : 'border border-hairline bg-white text-ash hover:bg-sunken hover:text-ink'
            }`}
          >
            <span>{f.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filter === f.key ? 'bg-white/20' : 'bg-sunken text-ash'
            }`}>{f.count}</span>
          </button>
        ))}
      </motion.div>

      {/* Repeat Order Filter */}
      <motion.div variants={fadeUp} custom={2.5} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ash">Repeat:</span>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {REPEAT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setRepeatFilter(f.key); setPage(0) }}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  repeatFilter === f.key
                    ? 'bg-accent-wash text-accent-deep border border-accent/20'
                    : 'border border-hairline bg-white text-ash hover:bg-sunken'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {countRange && (
            <button
              onClick={() => setCountRange(null)}
              className="flex items-center gap-1.5 rounded-full border border-accent bg-accent px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:opacity-90"
              title="Reset filter order count"
            >
              Order: {countRangeLabel}
              <X size={12} weight="bold" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Customer Grid/List */}
      <div className="space-y-3">
        {loading && [1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="doppel-outer">
              <div className="doppel-inner p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-sunken" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-sunken" />
                    <div className="h-2.5 w-1/4 rounded bg-sunken" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <motion.div variants={fadeUp} custom={3} initial="hidden" animate={ready ? 'show' : 'hidden'} className="grid grid-cols-1 gap-3">
          {!loading && filtered.map((customer) => {
            const status = customer.retention_status
            const days = getDaysSince(customer.last_order_date)
            const favCh = getFavChannel(customer)
            return (
              <Link key={customer.id} href={`/app/customers/${customer.id}`} className="group block">
                <div className="doppel-outer transition-all duration-300 group-hover:-translate-y-0.5">
                  <div className="doppel-inner p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold ${getAvatarStyle(status)}`}>
                          {getInitials(customer.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-ink truncate">{customer.name}</span>
                            {getStatusBadge(status, days)}
                            <Badge variant="outline" className="border-accent/20 text-accent">
                              Order ke-{(customer.order_count || 0) + 1}
                            </Badge>
                            {(!customer.age_range || !customer.gender) && (
                              <Badge variant="outline" className="border-accent-soft/40 text-accent-deep">
                                profil belum lengkap
                              </Badge>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash">
                            <span className="font-mono text-ink-soft">{customer.phone_normalized}</span>
                            <span>&middot;</span>
                            <span className="font-semibold text-accent">{customer.order_count}x order</span>
                            {favCh && <><span>&middot;</span><span className="rounded bg-sunken px-1.5 py-0.5 text-[10px] text-ink-soft">{favCh}</span></>}
                          </div>
                        </div>
                      </div>

                      {/* Right info (Dates) */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-hairline pt-2.5 sm:pt-0 text-xs text-ash gap-1 shrink-0">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar size={13} className="text-accent" />
                          <span>Order Terakhir: <strong className="text-ink">{customer.last_order_date}</strong></span>
                        </div>
                        <div className="text-[10px] text-mist">
                          Pertama: {customer.first_order_date}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </motion.div>

        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-mist">
              <UsersThree size={28} weight="duotone" className="text-mist" />
            </span>
            <p className="mt-3 text-sm text-ash">Tidak ada customer ditemukan</p>
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
          <p className="text-xs text-ash">
            Halaman <strong className="text-ink">{page + 1}</strong> dari <strong className="text-ink">{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-full border border-hairline bg-white px-4 py-2 text-xs font-semibold text-ash transition-all duration-300 hover:bg-sunken hover:text-ink active:scale-[0.98] disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-full border border-hairline bg-white px-4 py-2 text-xs font-semibold text-ink transition-all duration-300 hover:bg-sunken active:scale-[0.98] disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function CustomerListPage() {
  return (
    <Suspense fallback={null}>
      <CustomerListView />
    </Suspense>
  )
}
