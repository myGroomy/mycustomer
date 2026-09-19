'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { setSessionUser } from '@/utils/session'
import { fadeUp, FLUID_EASE } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'

export default function LoginPage() {
  const ready = useMounted()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    if (value && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus()
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const pinCode = pin.join('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin: pinCode }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Username atau PIN salah')
      } else {
        const user = result.user
        setSessionUser({
          id: user.id,
          username: user.username,
          role: user.role,
          branch: user.branch || '',
        })
        window.location.href = '/app'
      }
    } catch {
      setError('Terjadi kesalahan saat login')
    }

    setLoading(false)
  }

  return (
    <div className="sky-hero grain relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[40rem] w-[40rem] rounded-full bg-accent/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-8%] h-[32rem] w-[32rem] rounded-full bg-emerald/10 blur-[120px]" />

      <header className="relative z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: FLUID_EASE }}
            >
              <Image
                src="/brand-assets/mycustomer-logo.png"
                alt="MYCUSTOMER Logo"
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </motion.div>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 32, scale: 0.98 }}
          transition={{ duration: 1, ease: FLUID_EASE }}
          className="w-full max-w-[26rem]"
        >
          <div className="mb-10 text-center">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-5 flex justify-center">
              <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Terminal Kasir</Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate={ready ? 'show' : 'hidden'}
              className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Selamat datang kembali
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mt-3 text-sm text-ash">
              Login untuk merekam order & follow-up pelanggan
            </motion.p>
          </div>

          <div className="doppel-outer">
            <div className="doppel-inner p-6 sm:p-8">
              <form className="space-y-6" onSubmit={handleLogin}>
                <motion.div variants={fadeUp} custom={3} initial="hidden" animate={ready ? 'show' : 'hidden'}>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash" htmlFor="username">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username kasir"
                    autoComplete="username"
                    className="h-12 rounded-2xl bg-white px-4 placeholder:text-mist"
                    required
                  />
                </motion.div>

                <motion.div variants={fadeUp} custom={4} initial="hidden" animate={ready ? 'show' : 'hidden'}>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash">PIN (6 Digit)</label>
                  <div className="flex items-center justify-between gap-2">
                    {pin.map((digit, i) => (
                      <input
                        key={i}
                        id={`pin-${i}`}
                        type="password"
                        maxLength={1}
                        inputMode="numeric"
                        pattern="[0-9]"
                        value={digit}
                        onChange={(e) => handlePinChange(i, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(i, e)}
                        className="h-14 w-12 rounded-2xl border border-hairline bg-white text-center text-xl font-semibold text-ink transition-all duration-300 focus:border-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/10"
                      />
                    ))}
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-rose/20 bg-rose/10 p-3.5 text-sm text-ink"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.div variants={fadeUp} custom={5} initial="hidden" animate={ready ? 'show' : 'hidden'}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="group h-auto w-full gap-3 rounded-full bg-white px-8 py-4 text-sm font-semibold text-ink shadow-[0_8px_24px_-12px_rgba(16,18,20,0.4)] ring-1 ring-ink/10 transition-all duration-700 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <span>Masuk ke Kasir</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                          <ArrowRight size={16} weight="bold" className="text-ink" />
                        </span>
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
          </div>

          <motion.div
            variants={fadeUp}
            custom={6}
            initial="hidden"
            animate={ready ? 'show' : 'hidden'}
            className="mt-8 text-center"
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-sm text-ash transition-colors duration-300 hover:text-accent"
            >
              <ArrowLeft size={15} weight="bold" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
              Kembali ke beranda
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}