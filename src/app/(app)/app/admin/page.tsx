'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Storefront,
  UsersThree,
  Plus,
  Trash,
  PencilSimple,
  Check,
  X,
  ShieldCheck,
  Info,
  ArrowLeft,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getBranches, getUsers, createBranch, updateBranch, deleteBranch, createUser, updateUser, deleteUser, isManagerRole, ROLE_OPTIONS, type Branch, type ManagedUser } from '@/services/adminService'
import { fadeUp } from '@/lib/motion'
import { useMounted } from '@/lib/useMounted'
import { getSessionUser } from '@/utils/session'

interface SessionUser {
  id: string
  username: string
  role: string
  branch?: string
}

const PIN_BLANK = '******'

export default function AdminPage() {
  const ready = useMounted()
  const [me, setMe] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])

  // Branch add form
  const [newCode, setNewCode] = useState('')
  const [newBranchName, setNewBranchName] = useState('')
  // User add form
  const [newUsername, setNewUsername] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newRole, setNewRole] = useState('kasir')
  const [newUserBranch, setNewUserBranch] = useState('')

  // Inline edit state: 'branch' | 'user' | null, editing an index per section
  const [editing, setEditing] = useState<{ kind: 'branch' | 'user'; index: number } | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    const stored = getSessionUser()
    if (!stored) {
      window.location.href = '/login'
      return
    }
    setMe(stored)
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [b, u] = await Promise.all([getBranches(), getUsers()])
      setBranches(b)
      setUsers(u)
    } catch {
      setNotice({ type: 'err', msg: 'Gagal memuat data. Periksa koneksi ke Google Sheets.' })
    } finally {
      setLoading(false)
    }
  }

  const flash = (type: 'ok' | 'err', msg: string) => {
    setNotice({ type, msg })
    setTimeout(() => setNotice(null), 3500)
  }

  const lastOwnerCount = (uid: string | null): number => {
    const target = users.filter((u) => u.role === 'owner')
    if (!uid) return target.length
    const self = target.find((u) => u.id === uid)
    return self ? target.length - 1 : target.length
  }

  // ── Branch actions ────────────────────────────────────────────────────
  const handleAddBranch = async () => {
    const code = newCode.trim().toUpperCase()
    const name = newBranchName.trim()
    if (!code || !name) return flash('err', 'Kode dan nama cabang wajib diisi')
    if (branches.some((b) => b.code === code)) return flash('err', `Kode ${code} sudah dipakai`)
    setBusy(true)
    try {
      await createBranch(code, name)
      await loadAll()
      setNewCode('')
      setNewBranchName('')
      flash('ok', `Cabang ${code} berhasil ditambahkan`)
    } catch (e) {
      flash('err', `Gagal menambah cabang: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveBranch = async (index: number, original: Branch) => {
    const code = (editDraft.code || '').trim().toUpperCase()
    const name = (editDraft.name || '').trim()
    if (!code || !name) return flash('err', 'Kode dan nama cabang wajib diisi')
    if (branches.some((b, i) => i !== index && b.code === code)) {
      return flash('err', `Kode ${code} sudah dipakai`)
    }
    setBusy(true)
    try {
      await updateBranch(index, { ...original, code, name })
      await loadAll()
      setEditing(null)
      flash('ok', 'Cabang diperbarui')
    } catch (e) {
      flash('err', `Gagal memperbarui: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteBranch = async (index: number, branch: Branch) => {
    const used = users.some((u) => u.branch === branch.code)
    if (used) return flash('err', `Cabang ${branch.code} masih dipakai user pindahkan dulu user-nya`)
    if (!confirm(`Hapus cabang ${branch.code} ${branch.name}?`)) return
    setBusy(true)
    try {
      await deleteBranch(index)
      await loadAll()
      flash('ok', `Cabang ${branch.code} dihapus`)
    } catch (e) {
      flash('err', `Gagal menghapus: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  // ── User actions ───────────────────────────────────────────────────────
  const handleAddUser = async () => {
    const username = newUsername.trim()
    if (!username) return flash('err', 'Username wajib diisi')
    if (!/^\d{6}$/.test(newPin)) return flash('err', 'PIN harus 6 digit angka')
    if (!newUserBranch) return flash('err', 'Pilih cabang untuk user ini')
    if (users.some((u) => u.username === username)) return flash('err', `Username ${username} sudah dipakai`)
    setBusy(true)
    try {
      await createUser(username, newPin, newRole, newUserBranch)
      await loadAll()
      setNewUsername('')
      setNewPin('')
      setNewRole('kasir')
      setNewUserBranch('')
      flash('ok', `User ${username} berhasil ditambahkan`)
    } catch (e) {
      flash('err', `Gagal menambah user: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveUser = async (index: number, original: ManagedUser) => {
    const username = (editDraft.username || '').trim()
    if (!username) return flash('err', 'Username wajib diisi')
    if (!/^\d{6}$/.test(editDraft.pin || '')) return flash('err', 'PIN harus 6 digit angka')
    if (!editDraft.branch) return flash('err', 'Pilih cabang')
    if (users.some((u, i) => i !== index && u.username === username)) {
      return flash('err', `Username ${username} sudah dipakai`)
    }
    const isSelf = original.id === me?.id
    if (isSelf && editDraft.role !== original.role) {
      const target = users.filter((u) => u.role === 'owner')
      if (original.role === 'owner' && target.length <= 1) {
        return flash('err', 'Tidak bisa mengubah role sendiri Anda owner terakhir')
      }
    }
    setBusy(true)
    try {
      await updateUser(index, { ...original, username, pin: editDraft.pin, role: editDraft.role, branch: editDraft.branch })
      await loadAll()
      setEditing(null)
      flash('ok', 'User diperbarui')
    } catch (e) {
      flash('err', `Gagal memperbarui: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteUser = async (index: number, u: ManagedUser) => {
    if (u.id === me?.id) return flash('err', 'Tidak bisa menghapus akun yang sedang dipakai')
    if (u.role === 'owner' && lastOwnerCount(null) <= 0) {
      return flash('err', 'Minimal harus ada satu Owner / Admin')
    }
    if (!confirm(`Hapus user ${u.username}?`)) return
    setBusy(true)
    try {
      await deleteUser(index)
      await loadAll()
      flash('ok', `User ${u.username} dihapus`)
    } catch (e) {
      flash('err', `Gagal menghapus: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const userCountByBranch = (code: string) => users.filter((u) => u.branch === code).length

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      </div>
    )
  }

  if (me && !isManagerRole(me.role)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer">
            <div className="doppel-inner p-8 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-wash text-accent-deep">
                <ShieldCheck size={30} weight="duotone" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Khusus Owner / Admin</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ash">
                Halaman manajemen cabang &amp; user hanya bisa diakses akun dengan role Owner/Admin. Hubungi owner untuk upgrade akses.
              </p>
              <Link href="/app" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:-translate-y-px active:scale-[0.98]">
                <ArrowLeft size={16} weight="bold" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                Kembali ke Aplikasi
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Notice toast */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-xl ${notice.type === 'ok' ? 'bg-emerald text-white shadow-emerald/30' : 'bg-rose text-white shadow-rose/30'}`}
          >
            <Check size={18} weight="bold" /> {notice.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heading */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate={ready ? 'show' : 'hidden'} className="mb-8">
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Admin</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">Manajemen Cabang &amp; User</h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">Kelola daftar cabang, kasir, dan owner aplikasi (tersimpan di cloud Google Sheets)</p>
      </motion.div>

      <div className="space-y-5">
        {/* ── MANAJEMEN CABANG ── */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                  <Storefront size={20} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">Manajemen Cabang</h2>
                  <p className="mt-0.5 text-xs text-ash">Kode cabang dipakai di data customer &amp; order</p>
                </div>
                <Badge className="ml-auto rounded-full bg-accent-wash text-accent-deep">{branches.length} cabang</Badge>
              </div>

              {/* Add branch form */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Kode</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="CMH"
                    maxLength={4}
                    className="h-11 font-semibold uppercase tracking-wider"
                  />
                </div>
                <div className="flex-[2]">
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Nama Cabang</Label>
                  <Input
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Cimahi (CMH)"
                    className="h-11"
                  />
                </div>
                <button
                  onClick={handleAddBranch}
                  disabled={busy}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
                >
                  <Plus size={16} weight="bold" /> Tambah
                </button>
              </div>

              {/* Branch list */}
              <div className="mt-4 space-y-2.5">
                {branches.map((b, i) => {
                  const isEditing = editing?.kind === 'branch' && editing.index === i
                  return (
                    <div key={b.id + i} className="flex items-center gap-3 rounded-2xl border border-hairline bg-sunken/30 px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                          <Input
                            value={editDraft.code || ''}
                            onChange={(e) => setEditDraft({ ...editDraft, code: e.target.value.toUpperCase() })}
                            className="h-10 sm:w-24"
                          />
                          <Input
                            value={editDraft.name || ''}
                            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                            className="h-10 flex-1"
                          />
                        </div>
                      ) : (
                        <>
                          <Badge className="h-auto rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">{b.code}</Badge>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink">{b.name}</div>
                            <div className="text-[11px] text-ash">{userCountByBranch(b.code)} user terdaftar</div>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveBranch(i, b)}
                              disabled={busy}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald text-white transition-all active:scale-95 disabled:opacity-50"
                              title="Simpan"
                            >
                              <Check size={15} weight="bold" />
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ash transition-colors hover:bg-sunken hover:text-ink"
                              title="Batal"
                            >
                              <X size={15} weight="bold" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditing({ kind: 'branch', index: i }); setEditDraft({ code: b.code, name: b.name }) }}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ash transition-colors hover:bg-sunken hover:text-ink"
                              title="Edit"
                            >
                              <PencilSimple size={15} weight="bold" />
                            </button>
                            <button
                              onClick={() => handleDeleteBranch(i, b)}
                              disabled={busy}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-rose/20 text-ink transition-colors hover:bg-rose/10 disabled:opacity-50"
                              title="Hapus"
                            >
                              <Trash size={15} weight="bold" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── MANAJEMEN USER ── */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-wash text-accent">
                  <UsersThree size={20} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">Manajemen User</h2>
                  <p className="mt-0.5 text-xs text-ash">Kasir terbatas ke cabangnya sendiri; Owner dapat mengakses semua</p>
                </div>
                <Badge className="ml-auto rounded-full bg-accent-wash text-accent-deep">{users.length} user</Badge>
              </div>

              {/* Add user form */}
              <div className="rounded-2xl border border-hairline bg-white p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">Tambah User Baru</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Username</Label>
                    <Input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="kasir_cmh3"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">PIN (6 digit)</Label>
                    <Input
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      inputMode="numeric"
                      type="password"
                      className="h-11 tracking-[0.3em]"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Role</Label>
                    <Select value={newRole} onValueChange={(v) => v && setNewRole(v)}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">Cabang</Label>
                    <Select value={newUserBranch} onValueChange={(v) => v && setNewUserBranch(v)}>
                      <SelectTrigger className="h-11 rounded-2xl">
                        <SelectValue placeholder="Pilih cabang" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <button
                  onClick={handleAddUser}
                  disabled={busy}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-ink/10 transition-all hover:-translate-y-px active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:px-8"
                >
                  <Plus size={16} weight="bold" /> Tambah User
                </button>
              </div>

              {/* User list */}
              <div className="mt-4 space-y-2.5">
                {users.map((u, i) => {
                  const isEditing = editing?.kind === 'user' && editing.index === i
                  const isSelf = u.id === me?.id
                  return (
                    <div key={u.id + i} className="flex items-center gap-3 rounded-2xl border border-hairline bg-sunken/30 px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Input
                            value={editDraft.username || ''}
                            onChange={(e) => setEditDraft({ ...editDraft, username: e.target.value })}
                            className="h-10 flex-1 sm:min-w-[10rem]"
                          />
                          <Input
                            value={editDraft.pin || ''}
                            onChange={(e) => setEditDraft({ ...editDraft, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                            className="h-10 w-28 tracking-[0.3em]"
                          />
                          <div className="flex gap-2">
                            <Select value={editDraft.role || 'kasir'} onValueChange={(v) => v && setEditDraft({ ...editDraft, role: v })}>
                              <SelectTrigger className="h-10 rounded-2xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={editDraft.branch || ''} onValueChange={(v) => v && setEditDraft({ ...editDraft, branch: v })}>
                              <SelectTrigger className="h-10 rounded-2xl">
                                <SelectValue placeholder="Cabang" />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((b) => (
                                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-semibold text-accent-deep">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-ink">{u.username}</span>
                              {isSelf && <Badge className="h-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Anda</Badge>}
                              <Badge className={`hidden h-auto rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${u.role === 'owner' ? 'bg-ink/5 text-ink' : 'bg-accent-soft/20 text-accent-deep'}`}>
                                {u.role === 'owner' ? 'Owner / Admin' : 'Kasir'}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-ash">
                              {u.branch || 'Tanpa cabang'} • PIN {isEditing ? '' : PIN_BLANK}
                            </div>
                          </div>
                          <Badge className={`h-auto rounded-full px-2.5 py-1 text-[10px] font-semibold sm:hidden ${u.role === 'owner' ? 'bg-ink/5 text-ink' : 'bg-accent-soft/20 text-accent-deep'}`}>
                            {u.role === 'owner' ? 'Owner' : 'Kasir'}
                          </Badge>
                        </>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveUser(i, u)}
                              disabled={busy}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald text-white transition-all active:scale-95 disabled:opacity-50"
                              title="Simpan"
                            >
                              <Check size={15} weight="bold" />
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ash transition-colors hover:bg-sunken hover:text-ink"
                              title="Batal"
                            >
                              <X size={15} weight="bold" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditing({ kind: 'user', index: i }); setEditDraft({ username: u.username, pin: u.pin || '', role: u.role, branch: u.branch || '' }) }}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ash transition-colors hover:bg-sunken hover:text-ink"
                              title="Edit"
                            >
                              <PencilSimple size={15} weight="bold" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(i, u)}
                              disabled={busy}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-rose/20 text-ink transition-colors hover:bg-rose/10 disabled:opacity-50"
                              title="Hapus"
                            >
                              <Trash size={15} weight="bold" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div variants={fadeUp} custom={3} initial="hidden" animate={ready ? 'show' : 'hidden'}>
          <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <Info size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-ash">
              <strong className="text-accent">☁️ Tersimpan di Cloud</strong> Perubahan cabang &amp; user langsung tersimpan di Google Sheets dan efektif untuk semua perangkat. Owner tidak bisa menghapus akun sendiri atau mengubah role-nya jika menjadi owner terakhir.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  )
}