# PRD: Retain-ly (v2 Multi-Cabang)

> **Perubahan dari v1:** Menambahkan dukungan multi-cabang menggunakan pendekatan `branch_id` (Opsi A) satu database, data tiap cabang dipisah lewat kolom `branch_id`, dengan opsi lihat data gabungan semua cabang untuk role tertentu.

## 1. Latar Belakang

(Sama seperti v1) Bisnis F&B menggunakan POS dengan fitur terbatas dan tanpa kendali penuh. No telp customer dicatat manual di kolom nama pada struk. Tidak ada cara melacak repeat order, retensi, atau churn.

**Tambahan konteks v2:** Bisnis berencana beroperasi di lebih dari satu cabang. Data customer per cabang perlu terpisah (karena base customer tiap cabang berbeda), tapi tetap dalam satu sistem yang bisa dipantau terpusat oleh pemilik.

## 2. Tujuan

(Sama seperti v1, ditambah:)
- Mendukung banyak cabang dalam satu sistem, dengan data customer per cabang terpisah
- Memungkinkan pemilik melihat insight gabungan (semua cabang) maupun per cabang

## 3. Non-Tujuan (Out of Scope)

(Sama seperti v1: tidak ada nominal transaksi, tidak ada ML/DL, tidak ada integrasi POS, tidak ada auto-WA, ditambah:)
- Tidak ada isolasi database fisik per cabang (bukan Opsi B) semua cabang berbagi satu database dengan pemisah `branch_id`
- Tidak ada manajemen struktur organisasi kompleks (misal cabang dalam cabang/regional hierarchy) flat list of branches saja

## 4. Target Pengguna

Dua peran:
1. **Kasir cabang** input & lihat data customer, hanya untuk cabangnya sendiri
2. **Pemilik/Owner** lihat dashboard gabungan semua cabang, kelola daftar cabang, akses semua data

## 5. Tech Stack

Sama seperti v1 (Vite + React SPA, Supabase, Vercel), dengan penyesuaian skema database untuk `branch_id` dan Row Level Security (RLS) di Supabase untuk memastikan kasir satu cabang tidak bisa akses data cabang lain.

## 6. Fitur

### 6.1 – 6.8 (Sama seperti v1)
Input Order, Manajemen Customer, Retention Dashboard, Churn Analytics, Follow-up WhatsApp, Contact Export, PWA, Data Integrity semua fitur ini tetap ada, namun kini **selalu terikat ke `branch_id`** dari akun yang sedang login.

### 6.9 Manajemen Cabang (BARU)
- Halaman khusus (akses Owner saja): daftar cabang, tambah cabang baru, edit nama/info cabang, nonaktifkan cabang
- Tiap cabang punya kredensial login sendiri (email/password terpisah, terhubung ke `branch_id` masing-masing)
- Kasir yang login hanya melihat data milik cabangnya (RLS Supabase menegakkan ini di level database, bukan cuma di UI)

### 6.10 Dashboard Gabungan (BARU Owner only)
- Toggle/filter "Semua Cabang" vs "Per Cabang" di Dashboard
- Summary card menampilkan total gabungan (semua cabang) atau bisa difilter ke satu cabang tertentu
- Perbandingan performa antar cabang (misal: repeat rate cabang A vs B) chart bar per cabang
- Churn segmentation bisa dilihat per cabang atau gabungan

### 6.11 Role & Akses
- **Role: Kasir** akses terbatas ke Input Order, Daftar Customer, Detail Customer, Dashboard (cabang sendiri saja), Follow-up, Export Data (cabang sendiri)
- **Role: Owner** akses semua fitur di atas plus Manajemen Cabang dan Dashboard Gabungan; bisa switch "lihat sebagai cabang X" atau lihat gabungan

## 7. Struktur Data (Update)

**branches** (BARU)
- id
- name
- address (opsional)
- is_active
- created_at

**customers** (update tambah `branch_id`)
- id
- branch_id (FK → branches, indexed)
- phone_normalized (unique **per branch_id**, bukan unique global customer yang sama secara nomor telp bisa jadi row berbeda di cabang berbeda)
- name
- first_order_date
- created_at

**orders** (update tambah `branch_id`)
- id
- branch_id (FK → branches, indexed)
- customer_id (FK → customers)
- order_date (indexed)
- channel
- raw_phone_input
- created_at

**users_branch_role** (BARU jika pakai Supabase Auth dengan role)
- user_id (FK → auth.users)
- branch_id (FK → branches, nullable jika role Owner dengan akses semua cabang)
- role (enum: 'kasir', 'owner')

## 8. Row Level Security (RLS) Wajib

- Kasir hanya bisa `SELECT`/`INSERT` pada baris dengan `branch_id` yang cocok dengan cabangnya
- Owner bisa `SELECT` semua baris lintas `branch_id`
- RLS ditegakkan di level Supabase Postgres, bukan hanya filter di frontend mencegah kasir mengakses data cabang lain meski mencoba manipulasi query dari client

## 9. Metrik Keberhasilan

(Sama seperti v1, ditambah:)
- Kasir satu cabang tidak pernah melihat data customer cabang lain (validasi RLS)
- Owner bisa membandingkan performa retensi antar cabang tanpa export manual

## 10. Pertimbangan Masa Depan

(Sama seperti v1, ditambah:)
- Jika skala cabang sangat besar (puluhan+), pertimbangkan ulang Opsi B (isolasi database) untuk performa dan kemudahan manajemen akses
- Role tambahan (misal "Area Manager" yang mengelola beberapa cabang tertentu, bukan semua)
