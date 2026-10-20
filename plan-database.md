# Plan Database — MyCustomer

Dokumen: 19 Oktober 2026
Status: Plan (menunggu eksekusi)

Dokumen ini merangkum hasil analisis codebase dan keputusan arsitektur database (Google Sheets) beserta dua rencana kerja yang disepakati hari ini: **(A) Template spreadsheet `.xlsx`** dan **(B) Redis caching**.

---

## 1. Ringkasan eksekutif

- Datastore MyCustomer adalah **satu Google Spreadsheet dengan banyak tab** (bukan pola registry multi-spreadsheet). Cukup 1 ID dari env `GOOGLE_SPREADSHEET_ID` untuk mengakses semua "tabel".
- Ada **8 tab wajib** + **2 tab import** yang harus tersedia di spreadsheet produksi.
- Metode fetching saat ini: **full read** (`sheet!A:Z`) tanpa pagination server-side, dengan **cache 30 detik di client**; "pagination" hanya slicing array di memori. Aman untuk 1.000–10.000 customer, mulai berat di atasnya.
- Rencana peningkatan: **Redis (Upstash) sebagai cache server-side shared**, dengan TTL pendek + invalidasi di semua write route.

---

## 2. Arsitektur datastore saat ini

### 2.1 Bukan registry — single spreadsheet multi-tab

- `getSpreadsheetId()` membaca **satu** env var `GOOGLE_SPREADSHEET_ID` — `src/lib/sheetsServer.ts:36-42`.
- Semua akses memakai range `` `${sheet}!A:Z` `` — `src/app/api/sheets/route.ts:32-36`.
- Tidak ada ID spreadsheet lain yang didaftarkan di mana pun. Sebagai "registry" hanya ada allowlist nama tab:

```ts
// src/app/api/sheets/route.ts:5
const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users', 'customer_branches'])

// src/app/api/sheets/append/route.ts:4 (tanpa customer_branches)
const ALLOWED_SHEETS = new Set(['customers', 'orders', 'settings', 'branches', 'users'])

// src/app/api/sheets/sync-staging/route.ts:7
const STAGING_SHEETS = ['staging_cmh', 'staging_bdg']
```

### 2.2 Alur data

```
Client (sheetsService.ts, cache Map TTL 30s)
   │  fetch /api/sheets?sheet=<nama>
   ▼
API route (serverless, tanpa cache, tanpa pagination)
   │  values.get range '<nama>!A:Z'  → seluruh baris
   │  filter role/branch (kasir) setelah full read
   ▼
Google Sheets API → 1 file spreadsheet, N tab
```

## 3. Skema database (source of truth per tab)

> **Catatan posisi kolom penting:** beberapa kode membaca berdasarkan INDEX, bukan nama header.
> `sync-staging/route.ts` mengasumsikan `row[0]=id`, `row[1]=phone_normalized`, `row[2]=name` (customers) dan `row[1]=customer_id`, `row[2]=order_date`, `row[3]=channel` (orders). Urutan kolom di bawah wajib dipertahankan.

### 3.1 `customers` (17 kolom)

Sumber: `CLIENT_COLUMNS` di `src/app/api/sheets/route.ts:8`, `version` dari `src/app/api/customers/update/route.ts:84`, seed layout A:M dari `scripts/seed_5000_customers.js`.

| # | Kolom | Keterangan |
|---|-------|------------|
| A | `id` | UUID (kritis per-index) |
| B | `phone_normalized` | Normalisasi via `normalizePhone` (kritis per-index) |
| C | `name` | Nama customer (kritis per-index) |
| D | `first_order_date` | `YYYY-MM-DD` |
| E | `created_at` | ISO timestamp |
| F | `version` | Optimistic counter, default `1` |
| G | `branch` | Legacy single-branch (`CMH`/`BDG`) |
| H | `order_count` | Integer sebagai teks |
| I | `description` | Catatan bebas |
| J | `age_range` | Bucket usia (`AGE_RANGES`) |
| K | `usia` | Input eksplisit user saat order |
| L | `gender` | `L` / `P` |
| M | `jenis_kelamin` | Input eksplisit user saat order |
| N | `aliases` | JSON array `CustomerAlias` → `[]` |
| O | `branch_memberships` | JSON array string → `[]` |
| P | `is_followed_up` | `TRUE`/`FALSE` (auto-migrasi oleh follow-up route) |
| Q | `followed_up_at` | ISO timestamp |

### 3.2 `orders` (9 kolom)

Sumber: `CLIENT_COLUMNS` orders di route.ts:9, header historis `provision_admin.js:60`, auto-migrasi follow-up.

| # | Kolom | Keterangan |
|---|-------|------------|
| A | `id` | UUID |
| B | `customer_id` | FK → customers.id (kritis per-index) |
| C | `order_date` | `YYYY-MM-DD` (kritis per-index) |
| D | `channel` | Enum channel (kritis per-index) |
| E | `raw_phone_input` | Nomor apa adanya saat input |
| F | `created_at` | ISO timestamp |
| G | `branch` | `CMH` / `BDG` |
| H | `is_followed_up` | `TRUE`/`FALSE` |
| I | `followed_up_at` | ISO timestamp |

### 3.3 `settings` (2 kolom, key-value)

Sumber: `src/services/settingsService.ts`. Baris default wajib:

| key | value default |
|-----|---------------|
| `storeName` | *(kosong)* — nama toko mengikuti cabang aktif: `Cimahi (CMH)` / `Bandung (BDG)` |
| `activeDays` | `30` |
| `atRiskDays` | `60` |
| `waTemplate` | `Halo {nama}, terima kasih sudah order di {toko}! 😊 Ada yang bisa kami bantu?` |

### 3.4 `branches` (6 kolom + seed)

Sumber: `src/services/adminService.ts:60-67`, `DEFAULT_BRANCHES` (adminService.ts:6-9).

| # | Kolom | Keterangan |
|---|-------|------------|
| A | `id` | UUID tetap untuk default |
| B | `code` | `CMH` / `BDG` |
| C | `name` | Nama tampil |
| D | `created_at` | ISO timestamp |
| E | `address` | Alamat (opsional) |
| F | `is_active` | `TRUE`/`FALSE` |

Seed: `00000000-0000-0000-0000-000000000101` = `CMH` "Cimahi (CMH)", `00000000-0000-0000-0000-000000000102` = `BDG` "Bandung (BDG)".

### 3.5 `users` (9 kolom)

Sumber: `src/services/adminService.ts:107-115`, cek disable di `src/lib/sessionServer.ts:77`.

| # | Kolom | Keterangan |
|---|-------|------------|
| A | `id` | UUID |
| B | `username` | Login username |
| C | `display_name` | `Admin` untuk owner/admin |
| D | `pin` | 6 digit angka |
| E | `role` | `owner` / `admin` / `kasir` |
| F | `created_at` | ISO timestamp |
| G | `branch` | `CMH` / `BDG` (kosong untuk lintas cabang) |
| H | `active` | Opsional; `false` menonaktifkan sesi |
| I | `status` | Opsional; `disabled` menonaktifkan sesi |

Catatan: `createUser()` hanya mengisi A–G; H–I boleh kosong.

### 3.6 `customer_branches` (9 kolom)

Sumber: allowlist `src/app/api/sheets/route.ts:5`; desain skema dari dokumen plan arsitektur cross-branch (implementasi saat ini memakai kolom `branch_memberships` pada customers; sheet ini disiapkan untuk model relasi per-cabang).

| # | Kolom |
|---|-------|
| A | `id` |
| B | `customer_id` |
| C | `branch` |
| D | `first_order_date` |
| E | `last_order_date` |
| F | `order_count` |
| G | `local_name` |
| H | `notes` |
| I | `created_at` |

### 3.7 `staging_cmh` & `staging_bdg` (5 kolom, posisi-kritis)

Sumber: `src/app/api/sheets/sync-staging/route.ts:7,88,99-102,204`. Range dibaca `A:E`; status ditulis ke kolom **E** secara hardcode.

| # | Kolom | Keterangan |
|---|-------|------------|
| A | `tanggal` | `YYYY-MM-DD` |
| B | `nama` | Nama customer |
| C | `tipe_order` | Dipetakan ke channel (dine/take/gofood/grab/shopee/wa) |
| D | `no_telp` | Nomor mentah |
| E | `status` | Diisi `done` oleh sync |

### 3.8 Tab import (template untuk fitur import admin)

Sumber: `src/utils/csvImport.ts:30-57`.

- `import_customers`: `Nama`, `No WhatsApp`, `Cabang`, `Gender`, `Rentang Usia`, `Tanggal Order Pertama`, `Catatan`
- `import_orders`: `No WhatsApp`, `Nama`, `Tanggal Order`, `Channel`, `Cabang`

### 3.9 Enum & referensi

- Channel (`src/constants/index.ts`): `dine_in`, `takeaway`, `gofood`, `grab`, `shopee`, `whatsapp`, `custom`
- Role: `owner`, `admin`, `kasir`
- `AGE_RANGES`: `0-17`, `18-25`, `26-35`, `36-45`, `46-55`, `56-65`, `66+`
- `GENDER_LABELS`: `L` (Laki-laki), `P` (Perempuan)
- Format tanggal: `YYYY-MM-DD`; timestamp: ISO 8601

---

## 4. Plan A — Template spreadsheet `.xlsx` (`templates-database/`)

### 4.1 Artefak yang akan dibuat

| File | Isi |
|------|-----|
| `templates-database/generate_templates.py` | Generator openpyxl (re-runnable saat skema berubah) |
| `templates-database/mycustomer-database-template.xlsx` | 1 workbook: 10 tab (8 tab DB + 2 tab import) + 1 tab `_panduan` |
| `templates-database/README.md` | Instruksi pemakaian (upload ke Drive → buka sebagai Google Sheets → share Editor ke service account → set `GOOGLE_SPREADSHEET_ID`) |

### 4.2 Isi workbook

- Header tiap tab persis urutan kolom §3 (posisi-kritis dijaga).
- Baris default: `settings` (4 baris key-value), `branches` (2 baris seed CMH/BDG). Tab lain **hanya header** (tanpa data palsu).
- Tab `_panduan`: dokumentasi kolom, enum valid, catatan posisi-kritis. Nama tab ini di luar allowlist sehingga tidak mengganggu aplikasi; boleh dihapus setelah konversi.
- Formatting: freeze baris header, warna header, format kolom telepon/id sebagai **teks** (cegah `0812...` hilang leading-zero), data validation dropdown untuk `channel`/`branch`/`role`/`gender`/`is_active`.

### 4.3 Langkah eksekusi

1. `mkdir templates-database`
2. Tulis `generate_templates.py` (openpyxl 3.1.5 tersedia di lingkungan; **tidak** menambah dependency npm).
3. Jalankan generator → hasilkan `.xlsx`.
4. Verifikasi: baca ulang file dengan openpyxl, cocokkan header tiap tab terhadap `CLIENT_COLUMNS`/konstanta kode; jalankan `npm run typecheck` (tidak ada perubahan `src/`).

### 4.4 Asumsi & batasan

- Hanya menambah file di folder baru; tidak menyentuh `src/`, `.env`, atau spreadsheet produksi.
- Template adalah salinan kosong; data produksi tetap hidup di Google Sheets.
- Jika kelak ada opsi "export database" dari dalam app, file ini tetap jadi acuan format.

## 5. Analisis fetching saat ini (1000+ customer)

### 5.1 Perilaku

1. **Server: selalu full read.** Setiap request baca `` `${sheet}!A:Z` `` tanpa offset/limit; tidak ada cache di lapisan API.
2. **Client: cache in-memory 30 detik.** `Map` per tab browser (`src/services/sheetsService.ts:12-13`), dihapus saat append/update/delete dan setelah sync staging.
3. **Pagination hanya slice memori.** `paginate()` (`src/services/customerService.ts:65-75`) memotong array yang sudah diambil penuh. `getCustomersWithStats()` membaca **semua customers + semua orders** setiap dipanggil, lalu memotong 20 baris untuk dirender.
4. **Dashboard/export/follow-up** memakai `MAX_FETCH_ALL = 50000` → selalu ambil + proses semua baris.
5. **Filter kasir** (`src/app/api/sheets/route.ts:52-68`) dilakukan **setelah** full read.
6. Export orders memanggil `getOrdersByCustomer` per customer → paling mahal secara efektif saat cache miss.

### 5.2 Kapasitas

| Skenario | Dampak |
|----------|--------|
| 1.000–10.000 customers | Masih aman; respons < 1 detik; cache 30s menahan beban |
| 10.000+ customers / orders 50rb+ baris | Respons 1–3 detik per cache-miss, payload besar |
| Banyak tab / invalidasi sering | Quota Google read (~60/menit/project) jadi bottleneck (2 sheet per `getCustomersWithStats`) |
| Export orders per-customer loop | N cache-miss × N customer |

---

## 6. Plan B — Redis caching (Upstash)

### 6.1 Kenapa

- Deploy di **Vercel** (serverless, cold-start, instance tidak berbagi memori) → cache in-memory server-side tidak efektif; Redis shared adalah solusi yang benar.
- Pola read-heavy + write jarang cocok untuk read-through cache singkat.
- Menghemat quota Google API read secara drastis.

### 6.2 Arsitektur

```
GET /api/sheets?sheet=customers
   ├─ Redis GET sheet:customers:raw ── HIT → filter auth → return  (≈1–5 ms)
   └─ MISS → values.get 'customers!A:Z' → SET sheet:customers:raw EX 30 → filter auth → return

Semua write route → tulis ke Google (sukses) → DEL sheet:<nama>:raw
```

### 6.3 Aturan keamanan (wajib)

1. **TTL pendek 15–30 detik** sebagai jaring pengaman; invalidasi bukan satu-satunya mekanisme.
2. **Cache raw sheet sebelum filter role/branch.** Filter tetap dijalankan per-request. Key = `sheet:<nama>:raw` saja — dilarang menyimpan hasil post-filter (risiko bocor data antar cabang).
3. **`DEL` setelah write Google sukses** (bukan sebelum) untuk menghindari race yang menyimpan data basi.
4. **Sheet `users` tidak di-cache** (berisi PIN) atau TTL sangat pendek.
5. Nilai berisi PII (nomor WA, nama): TLS, region Upstash sama dengan region Vercel, jangan log isi value, kompres (gzip) sebelum `SET` karena value multi-MB bisa melewati limit request provider.

### 6.4 Titik sentuh kode (write route yang wajib invalidasi)

- `src/app/api/sheets/append|update|delete/route.ts`
- `src/app/api/sheets/import-customers|import-orders|sync-staging/route.ts`
- `src/app/api/customers/update|resolve|follow-up/route.ts`
- `src/app/api/orders/route.ts`, `orders/follow-up/route.ts`, `orders/recalculate/route.ts`
- `src/app/api/admin/backfill-branch-memberships/route.ts`

### 6.5 Implementasi yang direncanakan

- Dependensi: `@upstash/redis` (HTTP; `ioredis`/`redis` TCP kurang ideal di Vercel).
- Helper baru `src/lib/sheetCache.ts`: `getSheetCached(name, fetcher)` + `invalidateSheetCache(name?)`.
- Dipasang pada pembacaan server-side sheet + seluruh write route di §6.4.
- Session auth tetap JWT stateless — **tidak** dipindah ke Redis.

### 6.6 Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Lupa invalidasi 1 dari 13 route | TTL 15–30 s; tambah checklist/lint di review |
| Data bocor antar-role via cache | Hanya cache raw, filter per-request |
| Value > limit provider | gzip + pisahkan `orders`; monitor ukuran |
| Stale read setelah write user lain | Sama seperti perilaku sekarang (worst case 1× TTL) |

---

## 7. Roadmap

1. **[Plan A]** Buat `templates-database/` + `mycustomer-database-template.xlsx` (generator + README + verifikasi) — siap eksekusi.
2. **[Plan B]** Implementasi Redis cache: helper `sheetCache.ts` → pasang di read path → pasang invalidasi di 13 write route → uji manual (tulis → baca langsung dapat data baru).
3. **[Opsional, skala > 10rb rows]** Pagination beneran di API (range baris), agregat retention/dashboard dihitung server-side, evaluasi pindah dari Sheets ke DB beneran (Sheets tetap sebagai export/backup).



