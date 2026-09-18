# Retain-ly plan.md (v2 Multi-Cabang)

> **Version:** 2.0 | **Last Updated:** 2026-09-07 | **Status:** Planning
> Perubahan dari v1: menambahkan dukungan multi-cabang via `branch_id` + Row Level Security (RLS), role Kasir vs Owner.
> File ini adalah single source of truth. Untuk v1 (single-branch), lihat `plan.md` versi sebelumnya di git history.

---

## 1. Project Overview

**Name:** Retain-ly
**Tagline:** PWA multi-cabang untuk mencatat customer F&B dan melacak repeat order/retensi berbasis nomor telepon, per cabang maupun gabungan.
**Purpose:** Sama seperti v1 menggantikan pencatatan manual customer dengan sistem terstruktur berbasis no telp, kini mendukung banyak cabang dalam satu sistem dengan isolasi data per cabang dan insight gabungan untuk Owner.
**Type:** Web App (PWA), multi-tenant sederhana (single database, row-level isolation)
**Stage:** Planning (PRD v2, UI prompt v2 selesai; belum ada kode)
**Owner:** Alex
**Repo:** local (belum diinisialisasi)

---

## 2. Assumptions & Open Questions

### Assumptions Made
(Semua asumsi v1 tetap berlaku, ditambah:)
- Multi-cabang menggunakan **Opsi A** (kolom `branch_id` + RLS dalam satu database Supabase) bukan Opsi B (project Supabase terpisah per cabang)
- No telp customer **unik per cabang**, bukan unik global customer dengan no telp sama di 2 cabang berbeda dianggap 2 data customer terpisah (karena base customer tiap cabang independen)
- Ada 2 role: **Kasir** (akses terbatas ke cabangnya) dan **Owner** (akses semua cabang + manajemen cabang)
- Row Level Security (RLS) Supabase dipakai untuk enforce isolasi data di level database, bukan hanya filter di frontend

### Open Questions
| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| 1 | Design system final belum dipilih | Alex | TBD |
| 2 | Berapa cabang yang direncanakan di awal (2? 5? 10+)? mempengaruhi apakah Opsi A tetap ideal jangka panjang | Alex | Sebelum M0 |
| 3 | Apakah butuh role tambahan selain Kasir/Owner (misal Area Manager)? | Alex | TBD |
| 4 | Template pesan WhatsApp apakah sama untuk semua cabang atau bisa beda per cabang? | Alex | Sebelum build fitur follow-up |

---

## 3. Tech Stack & Environment

Sama seperti v1, dengan tambahan:

### Core Stack (update)
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Authorization | Supabase RLS (Row Level Security) | | Wajib untuk isolasi data per `branch_id` bukan opsional |
| Role management | Tabel `users_branch_role` + Supabase Auth | | Menentukan role (kasir/owner) dan `branch_id` terkait per user |

Sisanya (Language, Framework, Database, Hosting, CI/CD) identik dengan v1.

---

## 4. Architecture & System Design

### Overview
Tetap SPA client-heavy tanpa backend custom. Perbedaan utama dari v1: setiap query ke `customers`/`orders` kini **otomatis difilter oleh RLS Supabase** berdasarkan `branch_id` milik user yang login frontend tidak perlu (dan tidak boleh) mengandalkan filter manual sebagai satu-satunya lapisan keamanan.

### Component Diagram (text)
```
[Kasir/Owner HP/PWA] → [React SPA (Vite)] → [Supabase Client SDK]
                                                    ↓
                                    [Supabase Auth: user + role + branch_id]
                                                    ↓
                                    [RLS Policy Check] → [Postgres: customers, orders, branches]
```

### Key Design Decisions
(Sama seperti v1, ditambah:)
- **Multi-tenancy approach:** Row-level isolation via `branch_id` column + RLS policy (Opsi A), bukan database terpisah per cabang (Opsi B)
- **Role check:** Dilakukan di level RLS policy Supabase (`auth.uid()` dicocokkan ke `users_branch_role`), bukan hanya di UI

### Constraints & Boundaries
(Sama seperti v1, ditambah:)
- SEMUA tabel yang menyimpan data cabang (`customers`, `orders`) WAJIB punya kolom `branch_id` dan RLS policy aktif sebelum fitur apapun yang menyentuhnya di-deploy ke production
- Frontend TIDAK BOLEH mengasumsikan filter `branch_id` di query client sudah cukup aman RLS adalah lapisan penegakan sebenarnya

---

## 5. Folder Structure & File Conventions

Sama seperti v1, ditambah:

```
retain-ly/
├── src/
│   ├── ...  (sama seperti v1)
│   ├── services/
│   │   ├── branchService.ts     # BARU CRUD cabang, hanya bisa diakses role Owner
│   │   └── roleService.ts        # BARU cek role & branch_id user yang login
│   ├── hooks/
│   │   └── useUserRole.ts        # BARU hook untuk cek role (kasir/owner) di komponen
├── supabase/
│   └── migrations/
│       └── 002_add_branch_id_and_rls.sql   # BARU migrasi skema v2
```

---

## 6. Code Conventions & Standards

Sama seperti v1. Tambahan khusus v2:
- Semua fungsi service (`customerService.ts`, `orderService.ts`) yang melakukan query WAJIB mengasumsikan RLS sudah aktif jangan menulis ulang logic filter `branch_id` secara manual di client sebagai pengganti RLS (boleh untuk UX/tampilan, tapi bukan pengganti keamanan)

---

## 7. AI Assistant Context

> Read this section when starting a new AI session on this project.

### What This Project Is
Retain-ly v2: PWA multi-cabang untuk mencatat data customer F&B dan melacak retensi berbasis no telp. Setiap cabang punya data customer terisolasi; Owner bisa melihat gabungan semua cabang, Kasir hanya melihat cabangnya sendiri.

### How to Navigate the Codebase
(Sama seperti v1, ditambah:)
- Logic role & branch: `src/services/roleService.ts`, `src/hooks/useUserRole.ts`
- Manajemen cabang: `src/services/branchService.ts`, halaman di `src/pages/BranchManagement.tsx`
- Migrasi skema v2: `supabase/migrations/002_add_branch_id_and_rls.sql`

### Critical Rules (Never Violate)
(Semua rules v1 tetap berlaku, ditambah:)
- JANGAN buat tabel/fitur baru yang menyimpan data spesifik cabang tanpa kolom `branch_id` dan RLS policy
- JANGAN andalkan filter `branch_id` di frontend sebagai satu-satunya lapisan keamanan RLS Supabase WAJIB aktif di setiap tabel terkait cabang
- JANGAN buat halaman Manajemen Cabang atau Dashboard Gabungan bisa diakses role Kasir role check wajib di level RLS, bukan cuma disembunyikan di UI

### Current Focus
PRD v2 dan UI prompt v2 sudah selesai (`docs/PRD-retain-ly-v2.md`, `docs/P-UI-retainly-v2.md`). Fokus berikutnya: desain migrasi skema (`branches`, `users_branch_role`, update `customers`/`orders` dengan `branch_id`), setup RLS policy, baru lanjut ke build fitur.

---

## 8. Scope & Feature List

### Must Have (MVP v2)
(Semua item MVP v1 tetap ada, ditambah:)
- [ ] Tabel `branches` + CRUD dasar (Owner only)
- [ ] Tabel `users_branch_role` + logic penentuan role saat login
- [ ] RLS policy aktif di `customers` dan `orders` berdasarkan `branch_id`
- [ ] Halaman Manajemen Cabang (Owner only)
- [ ] Dashboard Gabungan dengan toggle "Semua Cabang" vs "Per Cabang" (Owner only)
- [ ] Kasir hanya bisa akses data cabangnya sendiri (tervalidasi lewat RLS, bukan cuma UI)

### Should Have (v2.1)
- [ ] Perbandingan performa antar cabang (chart bar repeat rate per cabang)
- [ ] Nonaktifkan/arsipkan cabang tanpa menghapus data historis

### Could Have (future)
- [ ] Role tambahan (Area Manager akses beberapa cabang tertentu, bukan semua)
- [ ] Template pesan WhatsApp yang bisa dikustomisasi per cabang

### Will NOT Have (explicit out of scope)
(Sama seperti v1, ditambah:)
- Isolasi database fisik per cabang (Opsi B)
- Hierarki organisasi kompleks (regional/multi-level)

---

## 9. Milestones & Timeline

| Milestone | Description | Target Date | Status |
|-----------|-------------|-------------|--------|
| M0: Setup | Sama seperti v1 | TBD | [ ] Not started |
| M0.5: Multi-Branch Foundation | Skema `branches`, `users_branch_role`, RLS policy, migrasi dari skema v1 (jika sudah ada data) | TBD | [ ] Not started |
| M1: Core Input | Input Order + autocomplete, kini branch-aware | TBD | [ ] Not started |
| M2: Customer & Dashboard | Daftar/Detail Customer, Dashboard per cabang | TBD | [ ] Not started |
| M2.5: Owner Features | Manajemen Cabang, Dashboard Gabungan | TBD | [ ] Not started |
| M3: Follow-up | WA link, vCard, Settings (branch-aware) | TBD | [ ] Not started |
| M4: Polish & PWA | PWA, export CSV, QA multi-role | TBD | [ ] Not started |

**Status key:** [ ] Not started | [~] In progress | [x] Done | [!] Blocked

---

## 10. Task Breakdown

### M0.5: Multi-Branch Foundation [prioritas setelah M0]

- [ ] Buat tabel `branches` (id, name, address, is_active, created_at)
- [ ] Buat tabel `users_branch_role` (user_id, branch_id, role)
- [ ] Tambah kolom `branch_id` ke `customers` dan `orders`
- [ ] Update unique constraint `phone_normalized` jadi unique per `branch_id` (bukan unique global)
- [ ] Tulis RLS policy: Kasir hanya `SELECT`/`INSERT` baris dengan `branch_id` miliknya
- [ ] Tulis RLS policy: Owner bisa `SELECT` semua baris lintas `branch_id`
- [ ] Buat `roleService.ts` fungsi cek role & branch_id user yang login
- [ ] Buat `useUserRole.ts` hook dipakai di routing untuk proteksi halaman Owner-only
- [ ] Test RLS: pastikan Kasir cabang A tidak bisa akses data cabang B meski manipulasi query dari client

### Backlog (unprioritized)

(Sama seperti v1, ditambah:)
- [ ] Halaman Manajemen Cabang (list, tambah, edit, nonaktifkan cabang)
- [ ] Dashboard toggle "Semua Cabang" vs "Per Cabang"
- [ ] Chart perbandingan performa antar cabang

**Atomic task rule:** Jika satu task lebih dari setengah hari kerja, pecah lagi.

---

## 11. Decision Log

(Semua entri v1 tetap berlaku, ditambah:)

| # | Date | Decision | Rationale | Alternatives Considered |
|---|------|----------|-----------|--------------------------|
| 8 | 2026-09-07 | Multi-cabang pakai Opsi A (`branch_id` + RLS dalam satu database) | Lebih scalable untuk dashboard gabungan lintas cabang dibanding database terpisah; RLS Supabase menegakkan isolasi di level database tanpa nambah kompleksitas infra besar | Opsi B project Supabase terpisah per cabang (ditolak: sulit bikin dashboard gabungan/lintas cabang, butuh query cross-database) |
| 9 | 2026-09-07 | No telp unik per `branch_id`, bukan unik global | Base customer tiap cabang independen no telp yang sama di 2 cabang dianggap 2 customer berbeda secara bisnis | Unique global (ditolak: tidak masuk akal secara bisnis jika cabang beda kota/area) |

---

## 12. Risk Register

(Semua risiko v1 tetap berlaku, ditambah:)

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 7 | RLS policy salah konfigurasi, kasir bisa akses data cabang lain | Medium | High | Test eksplisit RLS sebelum deploy (lihat M0.5 task terakhir); review policy sebelum production |
| 8 | Skala cabang bertambah banyak (10+) membuat Opsi A kurang optimal | Low (di awal) | Medium | Re-evaluasi ke Opsi B jika jumlah cabang sudah besar dan performa/manajemen jadi masalah dicatat di PRD v2 Section 10 |

---

## 13. Dependencies & Integrations

### Draft Skema Database (v2)
```sql
-- branches (BARU)
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- users_branch_role (BARU)
create table users_branch_role (
  user_id uuid references auth.users(id) primary key,
  branch_id uuid references branches(id),  -- nullable jika role owner (akses semua)
  role text not null check (role in ('kasir', 'owner'))
);

-- customers (update dari v1 tambah branch_id, ubah unique constraint)
create table customers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  phone_normalized text not null,
  name text not null,
  first_order_date date not null,
  created_at timestamptz default now(),
  unique (branch_id, phone_normalized)  -- unique PER CABANG, bukan global
);
create index idx_customers_branch_phone on customers (branch_id, phone_normalized);

-- orders (update dari v1 tambah branch_id)
create table orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) not null,
  customer_id uuid references customers(id),
  order_date date not null,
  channel text not null,
  raw_phone_input text,
  created_at timestamptz default now()
);
create index idx_orders_branch_date on orders (branch_id, order_date);

-- RLS Policies (contoh)
alter table customers enable row level security;

create policy "Kasir sees own branch only"
  on customers for select
  using (
    branch_id = (select branch_id from users_branch_role where user_id = auth.uid())
    or (select role from users_branch_role where user_id = auth.uid()) = 'owner'
  );
```

### Environment Variables Required
Sama seperti v1 tidak ada tambahan env var untuk fitur multi-cabang (semua dikelola lewat data + RLS, bukan konfigurasi env).

---

## 14. Testing Strategy

Sama seperti v1, ditambah:
- **Wajib:** test RLS policy buat 2 user (kasir cabang A, kasir cabang B), pastikan tidak bisa saling akses data
- **Wajib:** test role Owner bisa lihat data gabungan semua cabang

---

## 15. Deployment & Operations

Sama seperti v1. Tambahan: migrasi skema v2 (`002_add_branch_id_and_rls.sql`) harus dijalankan di Supabase sebelum deploy fitur multi-cabang ke production, dan RLS policy harus di-review manual sebelum go-live.

---

## 16. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-07 | Initial plan.md (single-branch) |
| 2.0 | 2026-09-07 | Menambahkan dukungan multi-cabang: skema `branches`, `users_branch_role`, RLS policy, role Kasir/Owner, Dashboard Gabungan |

---

## How to Keep This File Updated

- Setelah tiap milestone: update status, pindahkan task ke Done, tambah entri changelog
- Setelah tiap keputusan arsitektur: tambahkan ke Decision Log dengan alasan
- Setelah menemukan risiko baru: tambahkan ke Risk Register
- Saat mulai sesi AI baru: paste plan.md sebagai context dengan pesan "Read this plan.md and use it as your project context"
