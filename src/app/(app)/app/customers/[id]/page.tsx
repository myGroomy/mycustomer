'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUUpLeft,
  Phone,
  CheckCircle,
  ShoppingBag,
  ForkKnife,
  ClockCounterClockwise,
  Calendar,
  WhatsappLogo,
  UserPlus,
  Lightbulb,
  PencilSimple,
  Check,
  X,
  FloppyDisk,
  Plus,
} from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getCustomerById, updateCustomer } from '@/services/customerService'
import { getOrdersByCustomer } from '@/services/orderService'
import { getRetentionStatus, getRetentionLabel } from '@/utils/churnStatus'
import { buildWaLink } from '@/utils/waLinkBuilder'
import { downloadVCard } from '@/utils/vcardGenerator'
import { CHANNELS, DEFAULT_THRESHOLDS, PAGE_SIZE } from '@/constants'
import { fadeUp, FLUID_EASE } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import type { CustomerWithStats, Order } from '@/types'

const AGE_RANGES = [
  { value: '<17', label: '<17 Anak-anak/Remaja awal' },
  { value: '17-25', label: '17-25 Gen Z / Pelajar-Mahasiswa' },
  { value: '26-35', label: '26-35 Muda bekerja' },
  { value: '36-45', label: '36-45 Keluarga muda' },
  { value: '46-55', label: '46-55 Dewasa mapan' },
  { value: '56+', label: '56+ Senior' },
]

const GENDERS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
]

export default function CustomerDetailPage() {
  const ready = useMounted()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [customer, setCustomer] = useState<CustomerWithStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Detail fields
  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [description, setDescription] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  useEffect(() => { if (id) loadData() }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    try {
      const [c, o] = await Promise.all([getCustomerById(id), getOrdersByCustomer(id, 0, PAGE_SIZE)])
      if (c) {
        const status = getRetentionStatus(c.last_order_date, DEFAULT_THRESHOLDS)
        setCustomer({ ...c, retention_status: status })
        setEditName(c.name)
        setEditPhone(c.phone_normalized)
        setAgeRange(c.age_range || '')
        setGender(c.gender || '')
        setDescription(c.description || '')
      }
      setOrders(o.data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data customer')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomer = async () => {
    if (!customer) return
    if (!editName.trim()) { setSaveError('Nama tidak boleh kosong'); return }
    if (!editPhone.trim()) { setSaveError('Nomor HP tidak boleh kosong'); return }

    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateCustomer(customer.id, {
        name: editName,
        phone_normalized: editPhone,
      })
      setCustomer((prev) => prev ? { ...prev, name: updated.name, phone_normalized: updated.phone_normalized } : null)
      setIsEditing(false)
      toast.success('Profil customer diperbarui')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal mengubah data customer')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDetails = async () => {
    if (!customer) return
    setSavingDetails(true)
    try {
      await updateCustomer(customer.id, {
        age_range: ageRange,
        gender: gender,
        description: description,
      })
      setCustomer((prev) => prev ? { ...prev, age_range: ageRange, gender, description } : null)
      toast.success('Detail customer diperbarui')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan detail')
    } finally {
      setSavingDetails(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60dvh]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      </div>
    )
  }
  if (loadError) {
    return (
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base font-semibold text-ink">Data customer gagal dimuat</p>
        <p className="max-w-md text-sm text-ash">{loadError}</p>
        <button
          type="button"
          onClick={loadData}
          className="min-h-[44px] rounded-full bg-accent px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Coba Lagi
        </button>
      </main>
    )
  }
  if (!customer) {
    return (
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base font-semibold text-ink">Customer tidak ditemukan</p>
        <p className="text-sm text-ash">Data mungkin sudah dihapus atau tautannya tidak valid.</p>
        <Link href="/app/customers" className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-5 text-sm font-semibold text-white">
          Kembali ke daftar customer
        </Link>
      </main>
    )
  }

  const status = customer.retention_status
  const days = Math.floor((Date.now() - new Date(customer.last_order_date).getTime()) / 86400000)
  const initials = customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)

  const getFavChannel = () => {
    if (!orders.length) return null
    const freq: Record<string, number> = {}
    orders.forEach((o) => { freq[o.channel] = (freq[o.channel] || 0) + 1 })
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    const ch = CHANNELS.find((c) => c.id === top[0])
    return { label: ch?.label || top[0], count: top[1] }
  }

  const fav = getFavChannel()

  const getStatusBadge = () => {
    if (status === 'active') return <Badge className="bg-emerald/10 text-emerald border-emerald/20">Active</Badge>
    if (status === 'at_risk') return <Badge className="bg-amber/10 text-accent-deep border-amber/20">At Risk</Badge>
    return <Badge className="bg-rose/10 text-ink border-rose/20">Churned</Badge>
  }

  const stats = [
    { label: 'Total Order', value: `${customer.order_count}x`, icon: ShoppingBag, hue: 'text-ink' },
    { label: 'Channel Favorit', value: fav?.label || 'N/A', icon: ForkKnife, hue: 'text-ink' },
    { label: 'Order Terakhir', value: customer.last_order_date, sub: days === 0 ? 'Hari ini' : `${days} hari lalu`, icon: ClockCounterClockwise, hue: 'text-ink' },
    { label: 'Order Pertama', value: customer.first_order_date, icon: Calendar, hue: 'text-ink' },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10 pb-36 md:pb-32">
      {/* Top Header & Actions */}
      <motion.div
        variants={fadeUp}
        custom={0}
        initial="hidden"
        animate={ready ? 'show' : 'hidden'}
        className="mb-6 flex items-center justify-between gap-3"
      >
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm font-medium text-ash transition-colors duration-300 hover:text-ink min-h-[44px]"
        >
          <ArrowUUpLeft size={18} weight="bold" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          Kembali
        </button>

        <Link
          href="/app"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:bg-ink/5 active:scale-[0.98]"
          style={{ boxShadow: '0 6px 16px -6px rgba(28, 43, 66, 0.5)' }}
        >
          <Plus size={16} weight="bold" />
          <span>+ Catat Order Baru</span>
        </Link>
      </motion.div>

      {/* Profile Card */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'}>
        <div className="doppel-outer">
          <div className="doppel-inner p-5 sm:p-7">
            {!isEditing ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-3xl">{customer.name}</h1>
                    <a href={`tel:${customer.phone_normalized}`} className="mt-1.5 inline-flex items-center gap-2 text-sm font-mono text-ash transition-colors duration-300 hover:text-accent">
                      <Phone size={16} weight="bold" className="text-accent shrink-0" />
                      {customer.phone_normalized}
                    </a>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {getStatusBadge()}
                      <Badge variant="outline" className="border-accent/20 text-accent">
                        {customer.order_count}x Order
                      </Badge>
                      {ageRange && <Badge variant="secondary">{ageRange}</Badge>}
                      {gender && <Badge variant="secondary">{gender === 'L' ? 'Laki-laki' : 'Perempuan'}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-3xl bg-accent-wash text-lg sm:text-xl font-semibold text-accent-deep">
                      {initials}
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="group flex min-h-[36px] items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ash transition-all duration-300 hover:bg-sunken hover:text-ink active:scale-[0.96]"
                    >
                      <PencilSimple size={14} weight="bold" className="text-accent" />
                      Edit Profil
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 rounded-2xl border border-emerald/25 bg-emerald/10 px-3 py-2 text-xs font-medium text-emerald">
                  <CheckCircle size={14} weight="fill" />
                  WA Verified
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Edit Profil Customer</span>
                  <button
                    onClick={() => { setIsEditing(false); setSaveError(null) }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-mist transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                {saveError && (
                  <div className="rounded-2xl border border-rose/20 bg-rose/10 p-3 text-xs text-ink">
                    {saveError}
                  </div>
                )}

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Nama Lengkap</Label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">No. WhatsApp</Label>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-11 rounded-2xl font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveCustomer}
                    disabled={saving}
                    className="group flex min-h-[44px] h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-xs sm:text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-px active:scale-[0.98] disabled:opacity-40"
                  >
                    {saving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <FloppyDisk size={16} weight="bold" />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setSaveError(null) }}
                    className="flex min-h-[44px] h-11 items-center justify-center rounded-full border border-hairline bg-white px-5 text-xs font-semibold text-ash transition-all hover:bg-sunken"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="doppel-outer">
            <div className="doppel-inner p-4 sm:p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ash">{s.label}</span>
                <s.icon size={16} weight="light" className="text-mist" />
              </div>
              <div className="truncate text-sm font-semibold text-ink sm:text-base">{s.value}</div>
              {s.sub && <div className="mt-0.5 text-xs text-ash">{s.sub}</div>}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tabs: Riwayat / Detail */}
      <motion.div variants={fadeUp} custom={3} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mt-8 sm:mt-10">
        <Tabs defaultValue="history">
          <TabsList className="mb-4">
            <TabsTrigger value="history">Riwayat Order</TabsTrigger>
            <TabsTrigger value="details">Detail Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <div className="space-y-3">
              {orders.map((order, idx) => {
                const ch = CHANNELS.find((c) => c.id === order.channel)
                return (
                  <div key={order.id} className="doppel-outer">
                    <div className="doppel-inner flex items-center justify-between p-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                          <ShoppingBag size={18} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink">{order.order_date}</span>
                            <Badge variant="outline" className="text-[10px]">
                              Order ke-{idx + 1} dari {orders.length}
                            </Badge>
                          </div>
                          <div className="text-xs text-ash">Cabang {order.branch || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full border border-hairline bg-white px-3 py-1 text-[11px] font-semibold text-ink-soft">
                          {ch?.label || order.channel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-emerald">
                          <CheckCircle size={13} weight="fill" /> Selesai
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {orders.length === 0 && (
                <div className="py-10 text-center text-sm text-ash">Belum ada riwayat order</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details">
            <div className="doppel-outer">
              <div className="doppel-inner p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Kategori Usia</Label>
                    <Select value={ageRange} onValueChange={(v) => setAgeRange(v || '')}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Pilih rentang usia" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map((ar) => (
                          <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Gender</Label>
                    <Select value={gender} onValueChange={(v) => setGender(v || '')}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Pilih gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Deskripsi / Catatan</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: suka pedas, biasa dine-in weekend, kadang dipesan oleh adiknya..."
                    className="min-h-[100px] rounded-2xl"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="rounded-full"
                  >
                    {savingDetails ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <FloppyDisk size={16} weight="bold" className="mr-2" />
                        Simpan Detail
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Recommendation */}
      <motion.div variants={fadeUp} custom={4} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mt-4">
        <div className="rounded-3xl border border-hairline bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber/10 text-accent-deep">
              <Lightbulb size={18} weight="duotone" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Rekomendasi Retensi</div>
              <p className="mt-1 text-sm leading-relaxed text-ash">
                {status === 'churned'
                  ? `Customer ini sudah ${days} hari tidak order. Kirim pesan WhatsApp personal untuk menawarkan promo kembali.`
                  : status === 'at_risk'
                    ? `Customer ini sudah ${days} hari tidak order. Pertimbangkan untuk follow-up sebelum churned.`
                    : `Customer aktif dengan ${customer.order_count} order. Pertahankan hubungan baik!`
                }
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fixed bottom CTA */}
      <div className="fixed inset-x-0 bottom-20 md:bottom-0 z-30 md:left-64">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="doppel-outer rounded-[1.75rem]">
            <div className="doppel-inner flex items-center gap-2.5 rounded-[calc(1.75rem-0.375rem)] p-2.5 sm:p-3">
              <a
                href={buildWaLink(customer.phone_normalized, customer.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[48px] h-12 sm:h-13 flex-1 items-center justify-center gap-2.5 rounded-full bg-emerald text-xs sm:text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-px active:scale-[0.98]"
                style={{ boxShadow: '0 8px 24px -8px rgba(28, 43, 66, 0.5)' }}
              >
                <WhatsappLogo size={20} weight="fill" />
                <span>Kirim WhatsApp</span>
              </a>
              <button
                onClick={() => downloadVCard(customer.name, customer.phone_normalized)}
                className="flex min-h-[48px] h-12 sm:h-13 items-center gap-2 rounded-full border border-hairline bg-white px-4 sm:px-5 text-xs sm:text-sm font-semibold text-ink-soft transition-all duration-500 hover:bg-sunken hover:text-ink active:scale-[0.96]"
              >
                <UserPlus size={18} weight="duotone" className="text-accent" />
                <span className="hidden sm:inline">vCard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
