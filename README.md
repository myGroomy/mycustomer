# MYCUSTOMER

CRM ringan untuk bisnis F&B untuk mencatat order, mengelola customer,
memantau retensi, dan melakukan follow-up WhatsApp manual. Branch
`supabase-ver` menggunakan **Supabase PostgreSQL sebagai database utama**.
Google Sheets hanya dipakai sebagai sumber migrasi/backup lama.

## Persyaratan

- Node.js 20 atau lebih baru
- npm 10 atau lebih baru
- Project Supabase
- Akses ke Supabase SQL Editor
- (Opsional) Google Sheets dan service account jika ingin memigrasikan data lama

## Setup dari nol

### 1. Clone branch Supabase

```bash
git clone -b supabase-ver https://github.com/myGroomy/mycustomer.git
cd mycustomer
npm install
```

### 2. Buat project Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Buat project baru atau pilih project yang sudah ada.
3. Buka **Project Settings → API**.
4. Catat:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable/anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role key** → `SUPABASE_SERVICE_ROLE_KEY`
5. Buka **Project Settings → Database** dan salin connection string jika
   diperlukan sebagai `SUPABASE_DATABASE_URL`.

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh berada di server dan tidak boleh
diawali `NEXT_PUBLIC_`. Jangan commit atau membagikan key tersebut.

### 3. Buat schema database

1. Di Supabase Dashboard buka **SQL Editor**.
2. Buat query baru.
3. Salin seluruh isi file
   `supabase/migrations/001_initial_schema.sql`.
4. Klik **Run**.
5. Pastikan tabel berikut muncul di **Table Editor**:

   - `branches`
   - `app_users`
   - `customers`
   - `orders`
   - `app_settings`

Schema mengaktifkan Row Level Security. Operasi aplikasi berjalan melalui
server menggunakan service-role key dan tetap menerapkan pemeriksaan session
serta role pada API.

### 4. Buat environment lokal

```bash
cp .env.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Opsional untuk migrasi langsung melalui PostgreSQL.
SUPABASE_DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres

# Minimal 32 karakter.
# Buat dengan: openssl rand -hex 32
SESSION_SECRET=replace-with-a-long-random-secret

NEXT_PUBLIC_DEFAULT_CHURN_ACTIVE_DAYS=30
NEXT_PUBLIC_DEFAULT_CHURN_AT_RISK_DAYS=60
```

`src/lib/supabaseServer.ts` juga dapat membaca file `.env` workspace satu
tingkat di atas project, tetapi untuk development lokal gunakan `.env.local`.

### 5. Isi data awal

Untuk instalasi baru, masukkan minimal satu baris ke tabel `branches`,
`app_users`, dan `app_settings`. Contoh:

```sql
insert into public.branches (id, code, name)
values (gen_random_uuid(), 'CMH', 'Cimahi (CMH)')
on conflict (code) do nothing;

insert into public.app_users
  (id, username, display_name, pin, role, branch)
values
  (gen_random_uuid(), 'admin', 'Admin User', '123456', 'admin', 'CMH')
on conflict (username) do nothing;

insert into public.app_settings (key, value) values
  ('storeName', 'Nama Toko Anda'),
  ('activeDays', '30'),
  ('atRiskDays', '60'),
  ('waTemplate', 'Halo {nama}, terima kasih sudah order di {toko}! Ada yang bisa kami bantu?')
on conflict (key) do update set value = excluded.value;
```

Ganti username, PIN, cabang, dan nama toko sebelum digunakan. PIN saat ini
harus berupa 6 digit angka. Setelah login sebagai Admin, user dan cabang dapat
dikelola dari menu **Admin**.

### 6. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), lalu login dengan user
yang dibuat pada langkah sebelumnya.

### 7. Validasi instalasi

```bash
npm run typecheck
npm run build
npm start
```

## Migrasi data lama dari Google Sheets

Migrator tersedia jika data lama masih berada di Google Sheets:

- `scripts/setup_supabase.js` — setup schema melalui koneksi PostgreSQL.
- `scripts/migrate_sheets_to_supabase.js` — membaca sheet dan mengisi Supabase.

Siapkan tambahan environment berikut:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

Service account harus memiliki akses **Viewer** ke spreadsheet sumber. Jalankan:

```bash
npm run db:migrate:dry
npm run db:migrate
```

`db:migrate:dry` tidak menulis data dan hanya menampilkan jumlah baris yang
terbaca. `db:migrate` melakukan upsert data ke Supabase. Migrator:

- membaca `branches`, `users`, `customers`, `orders`, dan `settings`;
- menormalisasi nomor WhatsApp;
- menggabungkan customer yang memiliki nomor sama setelah normalisasi;
- memetakan order ke customer utama;
- melewati order yatim yang tidak memiliki customer;
- tidak menghapus atau mengubah Google Sheets.

Setelah migrasi, verifikasi jumlah data melalui Supabase Table Editor atau SQL:

```sql
select 'branches' as table_name, count(*) from public.branches
union all
select 'app_users', count(*) from public.app_users
union all
select 'customers', count(*) from public.customers
union all
select 'orders', count(*) from public.orders
union all
select 'app_settings', count(*) from public.app_settings;
```

## Role dan akses

- **Admin/Owner**: mengelola user dan cabang, import/export data, settings,
  dan melihat data lintas cabang.
- **Kasir**: input order, mencari customer, dan menjalankan operasional cabang
  yang ditetapkan.

Import/export dan endpoint API tetap memvalidasi session serta role di server;
menyembunyikan tombol di UI bukan satu-satunya proteksi.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run typecheck` | Memeriksa TypeScript |
| `npm run build` | Membuat production build |
| `npm start` | Menjalankan production server |
| `npm run format` | Memformat source dengan Prettier |
| `npm run db:migrate:dry` | Preview migrasi Google Sheets |
| `npm run db:migrate` | Migrasi data Google Sheets ke Supabase |

## Deploy ke Vercel

1. Import repository dan pilih branch `supabase-ver`.
2. Gunakan framework preset **Next.js**.
3. Tambahkan `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan
   `SESSION_SECRET` pada Environment Variables.
4. Jangan menambahkan Google Sheets credentials jika aplikasi tidak lagi
   melakukan migrasi/backup dari Sheets.
5. Deploy, lalu uji login, input order, pembatasan role, settings, import, dan
   export.

## Troubleshooting

### `Missing Supabase server env vars`

Pastikan `.env.local` berada di root project dan berisi
`NEXT_PUBLIC_SUPABASE_URL` serta `SUPABASE_SERVICE_ROLE_KEY`. Restart server
setelah mengubah environment.

### Login gagal

Periksa baris pada `app_users`: `username`, PIN 6 digit, `role`, dan
`active = true`.

### Migrasi gagal karena koneksi PostgreSQL

Jalankan schema dari SQL Editor terlebih dahulu. Jika `SUPABASE_DATABASE_URL`
tidak bisa dijangkau dari jaringan lokal, migrator akan mencoba REST API
Supabase menggunakan service-role key.

## Keamanan

- Jangan commit `.env`, `.env.local`, service-account JSON, atau key Supabase.
- Jangan pernah mengekspos `SUPABASE_SERVICE_ROLE_KEY` ke browser.
- Normalisasi nomor WhatsApp sebelum menyimpan atau mencocokkan.
- Gunakan role check server-side untuk endpoint sensitif.
- Buat backup sebelum menjalankan operasi data massal.

Panduan web tersedia di [halaman dokumentasi](/docs).
