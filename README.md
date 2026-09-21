# MYCUSTOMER

CRM ringan untuk bisnis F&B untuk mencatat order, mengelola profil customer, memantau retensi, dan melakukan follow-up WhatsApp manual. Aplikasi ini menggunakan Next.js App Router, TypeScript, Tailwind CSS, dan Google Sheets sebagai datastore melalui Google API.

## Persyaratan

- Node.js 20 atau lebih baru
- npm 10 atau lebih baru
- Google Cloud project
- Google Spreadsheet untuk data aplikasi
- Service account Google dengan akses Editor ke spreadsheet

## Setup dari nol

### 1. Clone repository dan install dependency

```bash
git clone <URL_REPOSITORY>
cd mycustomer
npm install
```

### 2. Buat Google Cloud service account

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru atau pilih project yang sudah ada.
3. Aktifkan **Google Sheets API**.
4. Buka **IAM & Admin → Service Accounts** lalu buat service account.
5. Buat JSON key untuk service account dan simpan dengan aman.
6. Catat email service account dan private key dari file JSON.

Jangan commit file JSON, private key, atau kredensial lain ke repository.

### 3. Buat dan bagikan Google Spreadsheet

Buat spreadsheet baru, lalu bagikan spreadsheet tersebut ke email service account sebagai **Editor**. Salin spreadsheet ID dari URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Spreadsheet perlu memiliki sheet utama berikut:

- `users`
- `customers`
- `orders`
- `settings`
- `branches`
- `customer_branches`

Kolom/header harus mengikuti skema yang digunakan aplikasi. Untuk instalasi baru, gunakan proses inisialisasi atau template internal project jika tersedia. Jangan mengubah nama sheet tanpa memperbarui service backend.

### 4. Siapkan environment variables

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id

# Minimal 32 karakter. Buat dengan:
# openssl rand -hex 32
SESSION_SECRET=replace-with-a-long-random-secret

NEXT_PUBLIC_DEFAULT_CHURN_ACTIVE_DAYS=30
NEXT_PUBLIC_DEFAULT_CHURN_AT_RISK_DAYS=60
```

`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` harus menggunakan newline escaped (`\n`) jika disimpan sebagai satu baris di environment variable. Pastikan `.env.local` tidak pernah di-commit atau dibagikan.

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### 6. Verifikasi instalasi

```bash
npm run typecheck
npm run build
npm start
```

`npm run build` digunakan untuk memverifikasi production build. Untuk development cukup gunakan `npm run dev`.

### 7. Migrasi bertahap ke Supabase

Schema Supabase dan migrator Google Sheets tersedia di:

- `supabase/migrations/001_initial_schema.sql`
- `scripts/setup_supabase.js`
- `scripts/migrate_sheets_to_supabase.js`

Migrasi ini tidak menghapus atau mengubah Google Sheets. Jalankan dari workspace
yang memiliki akses jaringan ke PostgreSQL Supabase:

```bash
npm run db:setup
npm run db:migrate:dry
npm run db:migrate
```

`db:migrate:dry` hanya membaca spreadsheet dan menampilkan jumlah baris yang
akan dipindahkan. `db:migrate` menjalankan transaksi PostgreSQL dan melakukan
upsert berdasarkan ID. Kredensial Supabase dibaca dari
`/home/bradley/project/MOCHIKIN-APPS/.env`; `GOOGLE_SPREADSHEET_ID` dapat dibaca
dari `.env.local` project jika tidak tersedia di env workspace.

Jika koneksi PostgreSQL langsung (`SUPABASE_DATABASE_URL`) diblokir oleh
jaringan, buka Supabase Dashboard → **SQL Editor**, jalankan isi
`supabase/migrations/001_initial_schema.sql`, lalu jalankan migrator dari
komputer/server yang dapat mengakses database tersebut. Aplikasi belum berpindah
ke Supabase sebelum migrasi data diverifikasi, sehingga Google Sheets tetap
menjadi sumber data aktif selama tahap ini.

## Role dan akses

- **Admin**: mengelola cabang dan user, mengakses import/export data, serta melihat data lintas cabang.
- **Kasir**: menjalankan operasional cabang sendiri seperti input order, pencarian customer, dan follow-up yang diizinkan.

Export/import data massal berisi PII dan hanya boleh tersedia untuk admin. Jangan mengandalkan penyembunyian tombol UI saja; endpoint API juga harus memvalidasi session dan role.

## Perintah yang tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run typecheck` | Memeriksa tipe TypeScript |
| `npm run build` | Membuat production build |
| `npm start` | Menjalankan production server |
| `npm run format` | Memformat source dengan Prettier |

## Deploy ke Vercel

1. Import repository ke Vercel.
2. Gunakan framework preset **Next.js**.
3. Tambahkan environment variables yang sama dengan `.env.local` pada **Project Settings → Environment Variables**.
4. Pastikan private key disimpan sebagai secret Vercel, bukan di source code.
5. Deploy dan uji login, input order, pembatasan role, serta akses Google Sheets.

## Troubleshooting

### `Failed to read sheet`

Periksa bahwa:

- Google Sheets API sudah aktif.
- Spreadsheet sudah dibagikan ke service account sebagai Editor.
- `GOOGLE_SPREADSHEET_ID` benar.
- Nama sheet sesuai dengan yang digunakan aplikasi.

### Login selalu gagal

Periksa data user pada sheet `users`, nilai `username`, PIN, role, status aktif, serta `SESSION_SECRET`. Setelah mengubah environment variable, restart development server.

### Private key error

Pastikan nilai private key berisi header dan footer lengkap serta newline dipertahankan sebagai `\n` pada environment variable.

## Keamanan

- Jangan commit `.env`, `.env.local`, JSON service account, API key, atau private key.
- Gunakan `RAW` untuk penulisan data ke Google Sheets agar input tidak diperlakukan sebagai formula.
- Normalisasi nomor WhatsApp melalui utility aplikasi sebelum disimpan atau dicocokkan.
- Gunakan pagination/limit untuk query list.
- Review akses export/import sebelum deployment production.

Panduan web tersedia di [halaman dokumentasi](/docs).
