'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  CheckSquare,
  WhatsappLogo,
  DownloadSimple,
  CheckCircle,
  UserPlus,
  Calendar,
  ClockCounterClockwise,
  UserCheck,
  Funnel,
  Sparkle,
  Basket,
  ArrowRight,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getOrdersByDate } from '@/services/orderService'
import { getCustomersWithStats } from '@/services/customerService'
import { clearSheetsCache } from '@/services/sheetsService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { buildWaLink } from '@/utils/waLinkBuilder'
import { downloadVCard, downloadBulkVCard } from '@/utils/vcardGenerator'
import { CHANNELS, DEFAULT_THRESHOLDS } from '@/constants'
import { fadeUp } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import type { OrderWithCustomer, CustomerWithStats, RetentionStatus } from '@/types'

export default function FollowUpPage() {
  const ready = useMounted()
  const todayStr = new Date().toISOString().split('T')[0]

  // Mode: 'daily_transactions' (Follow-up transaksi per tanggal) vs 'churn_alert' (Customer perlu di-winback)
  const [mode, setMode] = useState<'daily_transactions' | 'churn_alert'>('daily_transactions')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [dailyOrders, setDailyOrders] = useState<OrderWithCustomer[]>([])

  // Churn alert state
  const [churnCustomers, setChurnCustomers] = useState<CustomerWithStats[]>([])

  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const loadDailyOrders = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const data = await getOrdersByDate(date)
      setDailyOrders(data)
    } catch {
      setDailyOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadChurnCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getCustomersWithStats(0, 10000)
      const filtered = r.data
        .map((c) => ({ ...c, retention_status: getRetentionStatus(c.last_order_date, DEFAULT_THRESHOLDS) }))
        .filter((c) => c.retention_status !== 'active')
        .sort((a, b) => new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime())
      setChurnCustomers(filtered)
    } catch {
      setChurnCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === 'daily_transactions') {
      loadDailyOrders(selectedDate)
    } else {
      loadChurnCustomers()
    }
  }, [mode, selectedDate, loadDailyOrders, loadChurnCustomers])

  const toggleFollowUp = async (id: string, currentStatus: boolean, mode: 'order' | 'customer') => {
    if (savingIds.has(id)) return
    const newStatus = !currentStatus
    const timestamp = newStatus ? new Date().toISOString() : ''

    setSavingIds((prev) => new Set(prev).add(id))

    // Optimistic update
    if (mode === 'order') {
      setDailyOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, is_followed_up: newStatus, followed_up_at: timestamp } : o)),
      )
    } else {
      setChurnCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_followed_up: newStatus, followed_up_at: timestamp } : c)),
      )
    }

    try {
      const res = await fetch(mode === 'order' ? '/api/orders/follow-up' : '/api/customers/follow-up', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [mode === 'order' ? 'order_id' : 'customer_id']: id,
          is_followed_up: newStatus,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan follow-up')

      clearSheetsCache(mode === 'order' ? 'orders' : 'customers')
      toast.success(newStatus ? 'Tandai sudah di-follow up' : 'Follow-up dibatalkan')
    } catch (err) {
      // Revert optimistic update
      if (mode === 'order') {
        setDailyOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, is_followed_up: currentStatus } : o)),
        )
      } else {
        setChurnCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_followed_up: currentStatus } : c)),
        )
      }
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan follow-up')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleBulkDownloadDaily = () => {
    const contacts = dailyOrders
      .filter((o) => o.customer)
      .map((o) => ({ name: o.customer!.name, phone: o.customer!.phone_normalized }))
    downloadBulkVCard(contacts)
  }

  const handleBulkDownloadChurn = () => {
    const contacts = churnCustomers.map((c) => ({ name: c.name, phone: c.phone_normalized }))
    downloadBulkVCard(contacts)
  }

  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Pusat Interaksi</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Follow-up Customer</h1>
          <p className="mt-1.5 text-xs text-ash sm:text-sm">
            Chat & simpan nomor customer setelah transaksi untuk mempererat retensi
          </p>
        </div>
      </motion.div>

      {/* Mode Switcher Tabs */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-2xl bg-sunken/70 p-1.5 border border-hairline w-full sm:w-auto">
          <button
            onClick={() => setMode('daily_transactions')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              mode === 'daily_transactions'
                ? 'bg-white text-accent shadow-sm'
                : 'text-ash hover:text-ink'
            }`}
          >
            <Basket size={16} weight="duotone" />
            <span>Transaksi Per Tanggal</span>
          </button>
          <button
            onClick={() => setMode('churn_alert')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              mode === 'churn_alert'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ash hover:text-ink'
            }`}
          >
            <ClockCounterClockwise size={16} weight="duotone" />
            <span>Alert Churn & Risk</span>
          </button>
        </div>

        {/* Bulk VCF Download */}
        {mode === 'daily_transactions' && dailyOrders.length > 0 && (
          <button
            onClick={handleBulkDownloadDaily}
            className="group flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-ink-soft transition-all duration-300 hover:bg-sunken hover:text-ink active:scale-[0.98]"
          >
            <DownloadSimple size={16} weight="duotone" className="text-accent" />
            <span>Download Semua .vcf ({dailyOrders.length})</span>
          </button>
        )}

        {mode === 'churn_alert' && churnCustomers.length > 0 && (
          <button
            onClick={handleBulkDownloadChurn}
            className="group flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-ink-soft transition-all duration-300 hover:bg-sunken hover:text-ink active:scale-[0.98]"
          >
            <DownloadSimple size={16} weight="duotone" className="text-accent" />
            <span>Download .vcf ({churnCustomers.length})</span>
          </button>
        )}
      </motion.div>

      {/* Mode 1: Daily Transactions Date Selector & List */}
      {mode === 'daily_transactions' && (
        <>
          {/* Date Picker Bar */}
          <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-6">
            <div className="doppel-outer">
              <div className="doppel-inner p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} weight="duotone" className="text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">Pilih Tanggal Order</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedDate(todayStr)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        selectedDate === todayStr
                          ? 'bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(28,43,66,0.5)]'
                          : 'border border-hairline bg-white text-ash hover:bg-sunken'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={() => setSelectedDate(yesterdayStr)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        selectedDate === yesterdayStr
                          ? 'bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(28,43,66,0.5)]'
                          : 'border border-hairline bg-white text-ash hover:bg-sunken'
                      }`}
                    >
                      Kemarin
                    </button>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 w-auto min-w-[140px] text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-xs text-ash">
                  <span>Customer yang order pada <strong className="text-ink">{selectedDate === todayStr ? 'Hari Ini' : selectedDate}</strong>:</span>
                  <span className="font-semibold text-accent">{dailyOrders.length} transaksi</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Orders List */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate={ready ? 'show' : 'hidden'} className="space-y-3">
            {loading && [1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="doppel-outer">
                  <div className="doppel-inner p-4">
                    <div className="h-10 rounded bg-sunken" />
                  </div>
                </div>
              </div>
            ))}

            {!loading && dailyOrders.map((order) => {
              const cust = order.customer
              if (!cust) return null

              const isChecked = !!order.is_followed_up
              const isSaving = savingIds.has(order.id)
              const isNewCustomer = cust.first_order_date === order.order_date
              const channelLabel = CHANNELS.find((ch) => ch.id === order.channel)?.label || order.channel

              return (
                <div key={order.id} className={`doppel-outer transition-all duration-300 ${isChecked ? 'opacity-40' : ''}`}>
                  <div className="doppel-inner p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: check & customer info */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <button
                          onClick={() => toggleFollowUp(order.id, isChecked, 'order')}
                          disabled={isSaving}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300 active:scale-90 disabled:opacity-50 ${
                            isChecked ? 'border-accent bg-white text-ink ring-1 ring-ink/10' : 'border-mist bg-white hover:border-accent'
                          }`}
                          title={isSaving ? 'Menyimpan...' : isChecked ? 'Batalkan tanda sudah di-chat' : 'Tandai Sudah Di-chat'}
                        >
                          {isSaving ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
                          ) : isChecked ? (
                            <CheckSquare size={14} weight="fill" />
                          ) : null}
                        </button>

                        <div className={isChecked ? 'line-through opacity-60 min-w-0' : 'min-w-0'}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-ink truncate">{cust.name}</span>
                            {isNewCustomer ? (
                              <Badge className="border-emerald/30 bg-emerald/10 text-emerald">
                                <Sparkle size={11} weight="fill" /> Pelanggan Baru
                              </Badge>
                            ) : (
                              <Badge className="border-accent/25 bg-accent-wash text-accent-deep">
                                Langganan
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash">
                            <span className="font-mono text-ink-soft">{cust.phone_normalized}</span>
                            <span>&middot;</span>
                            <span className="rounded bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-soft">Channel: {channelLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 border-hairline pt-2.5 sm:pt-0 shrink-0">
                        <a
                          href={buildWaLink(cust.phone_normalized, cust.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-[44px] h-10 items-center gap-2 rounded-full bg-emerald px-4 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                          style={{ boxShadow: '0 6px 16px -6px rgba(28, 43, 66, 0.5)' }}
                        >
                          <WhatsappLogo size={16} weight="fill" />
                          <span>Chat WA</span>
                        </a>

                        <button
                          onClick={() => downloadVCard(cust.name, cust.phone_normalized)}
                          className="flex min-h-[44px] h-10 items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 text-xs font-semibold text-ink-soft transition-all hover:bg-sunken hover:text-ink active:scale-95"
                          title="Simpan Kontak ke HP (.vcf)"
                        >
                          <UserPlus size={15} weight="duotone" className="text-accent" />
                          <span className="hidden sm:inline">vCard</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {!loading && dailyOrders.length === 0 && (
              <div className="py-16 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-mist">
                  <Basket size={28} weight="duotone" />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">Belum Ada Transaksi pada {selectedDate}</p>
                <p className="mt-1 text-xs text-ash">Silakan catat order di tab Input Order atau pilih tanggal lain</p>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Mode 2: Churn Alert List */}
      {mode === 'churn_alert' && (
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="space-y-3">
          {loading && [1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="doppel-outer">
                <div className="doppel-inner p-4">
                  <div className="h-10 rounded bg-sunken" />
                </div>
              </div>
            </div>
          ))}

          {!loading && churnCustomers.map((c) => {
            const isChecked = !!c.is_followed_up
            const isSaving = savingIds.has(c.id)
            const days = Math.floor((Date.now() - new Date(c.last_order_date).getTime()) / 86400000)
            const isRisk = c.retention_status === 'at_risk'
            const statusColor = isRisk ? 'border-amber/25 bg-amber/10 text-accent-deep' : 'border-rose/25 bg-rose/10 text-ink'

            return (
              <div key={c.id} className={`doppel-outer transition-opacity duration-500 ${isChecked ? 'opacity-40' : ''}`}>
                <div className="doppel-inner flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => toggleFollowUp(c.id, isChecked, 'customer')}
                      disabled={isSaving}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300 active:scale-90 disabled:opacity-50 ${
                        isChecked ? 'border-accent bg-white text-ink ring-1 ring-ink/10' : 'border-mist bg-white hover:border-accent'
                      }`}
                      title={isSaving ? 'Menyimpan...' : isChecked ? 'Batalkan tanda sudah di-follow up' : 'Tandai Sudah Di-follow up'}
                    >
                      {isSaving ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
                      ) : isChecked ? (
                        <CheckSquare size={13} weight="fill" />
                      ) : null}
                    </button>
                    <div className={isChecked ? 'line-through opacity-60 min-w-0' : 'min-w-0'}>
                      <div className="text-sm font-semibold text-ink truncate">{c.name}</div>
                      <div className="mt-0.5 font-mono text-xs text-ash">{c.phone_normalized} &middot; {days} hari lalu</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                      {getRetentionLabel(c.retention_status)}
                    </Badge>
                    <a
                      href={buildWaLink(c.phone_normalized, c.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink ring-1 ring-ink/10 transition-all hover:scale-105 active:scale-95"
                    >
                      <WhatsappLogo size={16} weight="fill" />
                    </a>
                    <button
                      onClick={() => downloadVCard(c.name, c.phone_normalized)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all hover:bg-sunken hover:text-ink active:scale-95"
                    >
                      <UserPlus size={15} weight="duotone" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {!loading && churnCustomers.length === 0 && (
            <div className="py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                <CheckCircle size={28} weight="duotone" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">Semua customer aktif!</p>
              <p className="mt-1 text-xs text-ash">Tidak ada customer yang perlu di-follow up untuk winback</p>
            </div>
          )}
        </motion.div>
      )}
    </main>
  )
}