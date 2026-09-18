'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  Storefront,
  Package,
  Motorcycle,
  WhatsappLogo,
  ChartLineUp,
  UsersThree,
  Receipt,
  Lightning,
} from '@phosphor-icons/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const CTA_STYLE =
  'bg-white text-ink ring-1 ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_32px_-24px_rgba(16,18,20,0.45)]'

const NAV_LINKS = [
  ['Fitur', '#features'],
  ['Cara Kerja', '#how-it-works'],
  ['Review', '#testimonials'],
  ['Harga', '#pricing'],
]

const CHANNELS = [
  { icon: Storefront, name: 'Dine-in', note: 'Tamu meja', desc: 'Catat nomor meja, nama, dan nomor HP saat bayar. Data langsung tersimpan.' },
  { icon: Package, name: 'Takeaway', note: 'Bawa pulang', desc: 'Order bawa pulang ikut tercatat otomatis. Yang penting ID-nya sama, bukan alurnya.' },
  { icon: Motorcycle, name: 'Ojek Online', note: 'GoFood · Grab · ShopeeFood', desc: 'Nomor HP dari aplikasi ojek dinormalisasi otomatis jadi profil customer.' },
]

const SCRUB_COPY =
  'Setiap kali kasir mengetik satu nomor HP, MYCUSTOMER membangun profil retensi di belakang layar: siapa yang masih aktif, siapa yang mulai jarang, dan siapa yang sudah seminggu menghilang. Ujungnya cuma satu pekerjaan kirim satu pesan WhatsApp yang hangat.'

const SCRUB_TITLE = 'Data duduk diam. Kamu yang bergerak lebih cerdas.'

const STACK_CARDS = [
  { tag: 'Catat', icon: Receipt, title: 'Buka terminal, ketik nomor HP, pilih channel.', desc: 'Kasir cukup mengetik nama atau nomor HP sekali. Selesai. Tidak ada aplikasi baru yang harus di-install.' },
  { tag: 'Pantau', icon: ChartLineUp, title: 'Dashboard mengelompokkan pelanggan untuk kamu.', desc: 'Active, At Risk, dan Churned tersegmentasi otomatis dari riwayat order. Tidak perlu menyusun Excel.' },
  { tag: 'Sentuh', icon: WhatsappLogo, title: 'Satu ketikan WhatsApp untuk pelanggan yang melambat.', desc: 'Pesan personal yang tinggal kirim. Pelanggan kembali, repeat order naik, angka di dashboard ikut bergerak.' },
]

const REVIEWS = [
  {
    quote:
      'Dulu pelanggan yang jarang datang hilang begitu saja. Sekarang tinggal lihat daftar follow-up dan kirim satu pesan. Repeat order naik dalam dua bulan.',
    name: 'Rina',
    role: 'Pemilik Kafe, Malang',
  },
  {
    quote:
      'Semua di satu layar, datanya langsung jelas. Anak kasir pun bisa pakai tanpa training itu yang paling penting buat kami.',
    name: 'Andra',
    role: 'Owner Gerai Warteg, Jakarta',
  },
  {
    quote:
      'Kami pindah dari catatan buku ke MYCUSTOMER. Sekarang hampir separuh pelanggan aktif balik lagi tiap minggu.',
    name: 'Dewi',
    role: 'Chained Bakmi, Bandung',
  },
]

const METRIC_CHIPS = [
  { icon: Receipt, value: 'Rekam order', hue: 'bg-accent-wash text-accent-deep' },
  { icon: UsersThree, value: 'Profil otomatis', hue: 'bg-accent/10 text-accent' },
  { icon: ChartLineUp, value: 'Retensi real-time', hue: 'bg-accent-soft/20 text-accent-deep' },
  { icon: WhatsappLogo, value: 'Follow-up 1 ketik', hue: 'bg-ink/5 text-ink' },
]

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)
  const bentoRef = useRef<HTMLDivElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)

  const [accordion, setAccordion] = useState<number | null>(null)
  const [activeReview, setActiveReview] = useState(0)

  useGSAP(
    () => {
      const sTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      sTl
        .from(heroRef.current?.querySelector('[data-hero-mask] span') ?? null, {
          yPercent: 115,
          duration: 1.1,
        })
        .from(heroRef.current?.querySelector('[data-fade]') ?? null, { opacity: 0, y: 28, duration: 0.9 }, '-=0.55')
        .from(heroRef.current?.querySelector('[data-cta]') ?? null, { opacity: 0, y: 20, stagger: 0.1, duration: 0.7 }, '-=0.5')
        .from(mockupRef.current, { opacity: 0, y: 60, scale: 0.96, duration: 1.1 }, '-=0.5')

      if (mockupRef.current) {
        gsap.to(mockupRef.current, {
          yPercent: 10,
          ease: 'none',
          scrollTrigger: {
            trigger: mockupRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      }

      if (bentoRef.current) {
        const cards = bentoRef.current.querySelectorAll('[data-soar]')
        gsap.fromTo(
          cards,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: bentoRef.current, start: 'top 78%' },
          },
        )
      }

      if (scrubRef.current) {
        const words = scrubRef.current.querySelectorAll<HTMLElement>('[data-word]')
        gsap.fromTo(
          words,
          { opacity: 0.12 },
          {
            opacity: 1,
            duration: 1.2,
            ease: 'power2.inOut',
            stagger: 0.06,
            scrollTrigger: {
              trigger: scrubRef.current,
              start: 'top 72%',
              end: 'bottom 45%',
              scrub: true,
            },
          },
        )
      }

      const steps = document.querySelectorAll('[data-stack-card]')
      steps.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 88%' },
          },
        )
      })

      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill())
      }
    },
    { scope: heroRef },
  )

  const goReview = (dir: 1 | -1) => {
    setActiveReview((i) => (i + dir + REVIEWS.length) % REVIEWS.length)
  }

  return (
    <main className="w-full max-w-full overflow-x-hidden bg-canvas">
      {/* Navigation - floating glass pill */}
      <nav className="fixed left-1/2 top-5 z-50 w-[min(100%-2rem,46rem)] -translate-x-1/2">
        <div className="flex items-center justify-between gap-3 rounded-full border border-hairline bg-white/80 py-2 pl-4 pr-2 shadow-[0_12px_40px_-16px_rgba(16,18,20,0.18)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand-assets/mycustomer-logo.png" alt="MYCUSTOMER Logo" width={150} height={40} className="h-9 w-auto object-contain" priority />
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} className="text-sm font-medium text-ash transition-colors duration-300 hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3 text-sm font-semibold text-ink-soft transition-colors duration-300 hover:text-ink sm:inline-flex">
              Masuk
            </Link>
            <Button
              render={<Link href="/login" />}
              className={`group h-auto gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-ink transition-all duration-700 hover:-translate-y-px active:scale-[0.98] ${CTA_STYLE}`}
            >
              Daftar
              <ArrowRight size={14} weight="bold" className="transition-transform duration-500 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Attention - Cinematic Hero */}
      <section ref={heroRef} className="sky-hero relative px-4 pb-28 pt-44 sm:px-6 sm:pb-36 sm:pt-52 lg:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-[-12%] h-[34rem] w-[34rem] rounded-full bg-accent/15 blur-[130px]" />
          <div className="absolute left-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent-soft/25 blur-[120px]" />
          <div className="absolute bottom-[-20%] left-1/3 h-[26rem] w-[26rem] rounded-full bg-accent-wash/50 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl text-center">
          <h1 className="mx-auto text-[clamp(2.75rem,5.3vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink">
<span className="block overflow-hidden">
                <span data-hero-mask className="block overflow-hidden">
                Jangan sampai pelanggan{' '}
                <span
                  aria-hidden
                  className="mx-1 inline-block h-10 w-16 align-middle bg-cover bg-center sm:h-14 sm:w-24"
                  style={{
                    backgroundImage:
                      "url('https://picsum.photos/seed/espresso/480/240')",
                    WebkitMaskImage: 'radial-gradient(circle, black 62%, rgba(0,0,0,0.85) 78%, transparent 100%)',
                    maskImage: 'radial-gradient(circle, black 62%, rgba(0,0,0,0.85) 78%, transparent 100%)',
                    borderRadius: '9999px',
                  }}
                />
                <span className="text-accent">lupa</span> balik lagi.
              </span>
            </span>
          </h1>

          <p data-fade className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ash sm:text-xl">
            MYCUSTOMER mencatat setiap repeat order bisnis F&B dan menandai pelanggan yang mulai
            jarang datang supaya kamu bisa mengirim satu pesan WhatsApp sebelum mereka pindah ke tempat lain.
          </p>

          <div data-fade className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              data-cta
              render={<Link href="/login" />}
              className={`group h-auto gap-2 rounded-full px-8 py-4 text-base font-semibold text-ink transition-all duration-700 hover:-translate-y-[2px] active:scale-[0.98] ${CTA_STYLE}`}
            >
              Mulai Sekarang
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0.5">
                <ArrowRight size={14} weight="bold" />
              </span>
            </Button>
            <Button
              data-cta
              render={<a href="#features" />}
              className="group h-auto gap-2 rounded-full border border-hairline bg-white px-7 py-4 text-base font-semibold text-ink-soft transition-all duration-700 hover:bg-sunken active:scale-[0.98]"
            >
              Lihat Cara Kerjanya
              <ArrowUpRight size={16} weight="bold" className="transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>

          {/* Product Preview */}
          <div ref={mockupRef} className="mt-16 sm:mt-20">
            <div className="doppel-outer mx-auto max-w-5xl rounded-[2.5rem] p-2.5">
              <div className="overflow-hidden rounded-[calc(2.5rem-0.75rem)] border border-hairline bg-white">
                <div className="flex items-center gap-2 border-b border-hairline bg-white px-5 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/35" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink/50" />
                  <div className="ml-4 flex-1 rounded-lg bg-sunken px-3 py-1.5 text-left font-mono text-xs text-ash">mycustomer.app/app</div>
                </div>
                <div className="grid grid-cols-12 gap-5 bg-canvas p-5 sm:p-7">
                  <div className="col-span-3 hidden border-r border-hairline pr-5 sm:block">
                    <div className="space-y-2">
                      {[
                        ['Input Order', false],
                        ['Customer Database', false],
                        ['Dashboard Retensi', true],
                        ['Follow-up', false],
                        ['Export', false],
                      ].map(([item, active]) => (
                        <div
                          key={item as string}
                          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-300 ${
                            active ? 'bg-white font-semibold text-ink shadow-[0_6px_16px_-6px_rgba(28,43,66,0.25)] ring-1 ring-ink/15' : 'text-ash'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white/60' : 'bg-mist/50'}`} />
                          {item as string}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-9">
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Total Customer', '1,247', 'text-ink'],
                        ['Repeat Rate', '73%', 'text-accent'],
                        ['At Risk', '89', 'text-accent-deep'],
                        ['Churned', '34', 'text-ink'],
                      ].map(([label, value, hue]) => (
                        <div key={label as string} className="rounded-2xl border border-hairline bg-white p-3 sm:p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-ash sm:text-xs">{label as string}</div>
                          <div className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${hue as string}`}>{value as string}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-hairline bg-white p-4">
                      <div className="mb-3 text-sm font-semibold text-ink">Segmentasi Customer</div>
                      <div className="space-y-3">
                        {[
                          { label: 'Active', color: 'bg-emerald', width: '65%' },
                          { label: 'At Risk', color: 'bg-amber', width: '25%' },
                          { label: 'Churned', color: 'bg-rose', width: '10%' },
                        ].map((seg) => (
                          <div key={seg.label}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-ash">{seg.label}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                              <div className={`h-full rounded-full ${seg.color}`} style={{ width: seg.width }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interest - Gapless Bento (3x3, dense) */}
      <section id="features" ref={bentoRef} className="px-4 py-28 sm:px-6 sm:py-40 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
            Satu layar yang merangkum seluruh pelanggan kamu keluar-masuk, tanpa satu pun
            yang jatuh lewat sela.
          </p>

          <div className="mt-14 grid grid-flow-dense grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {/* A : 2x2 */}
            <div data-soar className="doppel-outer col-span-1 sm:col-span-2 md:col-span-2 md:row-span-2">
              <div className="doppel-inner flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                    <Receipt size={22} weight="duotone" />
                  </div>
                  <h3 className="max-w-sm text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem] sm:leading-tight">
                    Catat order sekali ketuk, semua channel.
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ash">
                    Dine-in, takeaway, GoFood, Grab, Shopee masuk lewat satu layar yang sama.
                    Nomor WhatsApp otomatis dinormalisasi jadi profil pelanggan.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Total Customer', '1,247'],
                    ['Repeat Rate', '73%'],
                    ['At Risk', '89'],
                    ['Churned', '34'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-hairline bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-ash">{label}</div>
                      <div className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* B : 1x1 */}
            <div data-soar className="group col-span-1 overflow-hidden rounded-3xl border border-hairline bg-white p-6 transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(16,18,20,0.25)]">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <WhatsappLogo size={22} weight="duotone" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Follow-up satu ketikan</h3>
              <p className="mt-2 text-sm leading-relaxed text-ash">
                Kirim pesan WhatsApp personal ke pelanggan yang mulai jarang datang. Tanpa copy-paste.
              </p>
            </div>

            {/* C : 1x1 */}
            <div data-soar className="group col-span-1 overflow-hidden rounded-3xl border border-hairline bg-white p-6 transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(16,18,20,0.25)]">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft/20 text-accent-deep">
                <ChartLineUp size={22} weight="duotone" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Retensi real-time</h3>
              <p className="mt-2 text-sm leading-relaxed text-ash">
                Segmentasi Active, At Risk, dan Churned terbentuk otomatis dari riwayat order.
              </p>
            </div>

            {/* D : 2x1 */}
            <div data-soar className="col-span-1 rounded-3xl border border-hairline bg-white p-6 sm:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink">Terhubung dengan semua saluran penjualan</h3>
                  <p className="mt-1 text-sm text-ash">Semua order dari mana pun asalnya jatuh ke profil pelanggan yang sama.</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {CHANNELS.map((c) => {
                    const Icon = c.icon
                    return (
                      <span key={c.name} className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-ash transition-colors duration-500 hover:border-accent/30 hover:text-accent">
                        <Icon size={18} weight="duotone" />
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {METRIC_CHIPS.map((m) => {
                  const Icon = m.icon
                  return (
                    <span key={m.value} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${m.hue}`}>
                      <Icon size={15} weight="bold" />
                      {m.value}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* E : 1x1 */}
            <div data-soar className="col-span-1 flex flex-col justify-between gap-6 bg-ink p-6 text-white sm:col-span-2 md:col-span-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Lightning size={22} weight="duotone" />
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight">2 menit</div>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  dari browser tidak perlu install aplikasi atau training panjang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desire - Scrubbing Text Reveal */}
      <section className="bg-white px-4 py-28 sm:px-6 sm:py-40 lg:px-8">
        <div ref={scrubRef} className="mx-auto max-w-5xl">
          <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
            {SCRUB_TITLE.split(' ').map((w, i) => (
              <span key={i} data-word className="mr-[0.24em] inline-block">
                {w}
              </span>
            ))}
          </h2>
          <p className="mt-10 text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed">
            {SCRUB_COPY.split(' ').map((w, i) => (
              <span key={i} data-word className="mr-[0.22em] inline-block text-ash">
                {w}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Desire - Card Stack (Cara Kerja) */}
      <section id="how-it-works" className="bg-canvas px-4 py-28 sm:px-6 sm:py-40 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
                Cara kerja. Alur yang sama tiap hari, hasil yang terus tumbuh.
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-ash">
                Kasir tidak perlu mempelajari flow baru. Cukup catat order seperti biasa 
                MYCUSTOMER mengubahnya menjadi profil, segmentasi, dan pengingat follow-up.
              </p>
              <div className="mt-10 hidden items-center gap-2 lg:flex">
                {STACK_CARDS.map((c) => {
                  const Icon = c.icon
                  return (
                    <span
                      key={c.tag}
                      className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft"
                    >
                      <Icon size={14} weight="bold" className="text-accent" />
                      {c.tag}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5 sm:space-y-6 lg:col-span-7">
            {STACK_CARDS.map((c, i) => {
              const Icon = c.icon
              return (
                <div
                  key={c.tag}
                  data-stack-card
                  className="lg:sticky lg:top-24"
                  style={{ zIndex: 30 - i * 10 }}
                >
                  <div className="doppel-outer">
                    <div className="doppel-inner p-6 sm:p-8">
                      <div className="flex gap-5">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-wash text-accent-deep">
                          <Icon size={24} weight="duotone" />
                        </span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{c.tag}</span>
                          <h3 className="mt-1.5 text-xl font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[1.45rem]">
                            {c.title}
                          </h3>
                          <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-ash">{c.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Desire - Horizontal Accordions (channels) */}
      <section className="bg-white px-4 py-28 sm:px-6 sm:py-40 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
            Jalur order sebanyak apa pun, tetap satu profil.
          </h2>
          <div className="mt-14 flex flex-col gap-4 lg:h-[30rem] lg:flex-row lg:items-stretch">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon
              const active = accordion === i
              return (
                <button
                  key={c.name}
                  onClick={() => setAccordion(active ? null : i)}
                  onMouseEnter={() => setAccordion(i)}
                  onMouseLeave={() => setAccordion(null)}
                  aria-expanded={active}
                  className={`group relative flex-1 overflow-hidden rounded-3xl border border-hairline text-left transition-[flex,background-color] duration-700 ease-out lg:flex-[0.72] lg:hover:flex-[2.6] lg:focus-visible:flex-[2.6] ${
                    active ? 'lg:flex-[2.6] bg-ink' : 'bg-white'
                  }`}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center opacity-0 transition-opacity duration-700 contrast-125 lg:group-hover:opacity-40"
                    style={{
                      backgroundImage: `url('https://picsum.photos/seed/${c.name.toLowerCase()}/960/640')`,
                      filter: 'grayscale(1) brightness(0.6)',
                    }}
                  />
                  <div className="relative flex h-full flex-col justify-between p-7 sm:p-8">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 ${active ? 'bg-white/15 text-white' : 'bg-accent-wash text-accent'}`}>
                      <Icon size={24} weight="duotone" />
                    </span>
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-500 ${active ? 'text-white/60' : 'text-mist'}`}>{c.note}</span>
                      <h3 className={`mt-2 text-xl font-semibold tracking-tight transition-colors duration-500 sm:text-2xl ${active ? 'text-white' : 'text-ink'}`}>{c.name}</h3>
                      <p className={`mt-2 text-sm leading-relaxed transition-opacity duration-500 lg:max-w-xs ${active ? 'text-white/75 opacity-100' : 'opacity-0'}`}>{c.desc}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Desire - Testimonial Carousel */}
      <section id="testimonials" className="bg-canvas px-4 py-28 sm:px-6 sm:py-40 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                Dipakai tim yang melayani pelanggan tiap hari.
              </h2>
              <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ash">
                Dari kafe kecil sampai jaringan bakmi alurnya sama, dan hasilnya mirip-mirip: pelanggan balik lagi.
              </p>
              <div className="mt-8 flex -space-x-3">
                {REVIEWS.map((r, i) => (
                  <span
                    key={r.name}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-canvas text-sm font-semibold"
                    style={{ background: '#cfe1fd', color: '#0d1622' }}
                  >
                    {r.name[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-8 rounded-[2rem] border border-hairline bg-white p-8 sm:p-12 lg:col-span-8">
              <blockquote key={activeReview} className="review-fade text-xl font-medium leading-relaxed tracking-[-0.01em] text-ink sm:text-2xl">
                &ldquo;{REVIEWS[activeReview].quote}&rdquo;
              </blockquote>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">{REVIEWS[activeReview].name}</div>
                  <div className="text-sm text-ash">{REVIEWS[activeReview].role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goReview(-1)}
                    aria-label="Review sebelumnya"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all duration-300 hover:border-accent/30 hover:text-accent active:scale-95"
                  >
                    <CaretLeft size={17} weight="bold" />
                  </button>
                  <button
                    onClick={() => goReview(1)}
                    aria-label="Review berikutnya"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all duration-300 hover:border-accent/30 hover:text-accent active:scale-95"
                  >
                    <CaretRight size={17} weight="bold" />
                  </button>
                </div>
              </div>
              <div className="absolute bottom-14 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 md:flex">
                {REVIEWS.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => setActiveReview(i)}
                    aria-label={`Lihat review ${r.name}`}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === activeReview ? 'w-6 bg-accent' : 'w-1.5 bg-mist/40 hover:bg-mist'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action - Massive CTA */}
      <section id="pricing" className="px-4 pb-28 pt-8 sm:px-6 sm:pb-36 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-ink px-6 py-20 text-center sm:px-12 sm:py-28">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-accent/30 blur-[110px]" />
            <div className="absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-accent-soft/25 blur-[110px]" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
              Siap mempertahankan pelanggan yang sudah susah payah kamu jaga?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              Mulai gratis, tanpa kartu kredit. Setup dari browser selesai dalam 2 menit.
            </p>
            <Button
              render={<Link href="/login" />}
              className="group mt-10 h-auto gap-2 rounded-full bg-white px-9 py-4 text-base font-semibold text-ink shadow-[0_20px_60px_-20px_rgba(255,255,255,0.4)] transition-all duration-700 hover:-translate-y-[2px] active:scale-[0.98]"
            >
              Mulai Sekarang
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white transition-transform duration-500 group-hover:translate-x-0.5">
                <ArrowRight size={14} weight="bold" />
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-canvas px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-sm text-ash sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/brand-assets/mycustomer-icon.png" alt="MYCUSTOMER Icon" width={26} height={26} className="h-6 w-6 object-contain" />
            <span className="font-semibold text-ink-soft">MYCUSTOMER</span>
          </div>
          <div className="flex items-center gap-7">
            <a href="#features" className="transition-colors duration-300 hover:text-ink">
              Fitur
            </a>
            <a href="#how-it-works" className="transition-colors duration-300 hover:text-ink">
              Cara Kerja
            </a>
            <a href="/login" className="transition-colors duration-300 hover:text-ink">
              Masuk
            </a>
          </div>
          <div>&copy; {new Date().getFullYear()} MYCUSTOMER. Semua hak dilindungi.</div>
        </div>
      </footer>
      <style>{`
        .review-fade {
          animation: reviewIn 0.55s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes reviewIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}