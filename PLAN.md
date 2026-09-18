# PLAN: Retain-ly Fitur Baru + Migrasi UI ke shadcn/ui

> **Status:** Planning | **Last Updated:** 2026-09-13

---

## 0. Prinsip

- **Fitur dulu, arsitektur besar belakangan** (keputusan eksplisit) perbaikan fondasi (localStorage, auth, dsb) dikerjakan *sambil* menambah fitur, bukan proyek rombak terpisah.
- **Fokus utama: kecepatan input di sisi petugas.** Setiap fitur baru yang menyentuh flow input order wajib diuji dengan pertanyaan: "apakah ini menambah langkah/friction buat kasir?" Kalau ya, field itu dipindah ke luar flow utama (halaman detail, diisi belakangan).
- **Migrasi UI dilakukan halaman-per-halaman**, bukan big-bang rewrite supaya app tetap bisa dipakai di antara proses migrasi.
- Semua keputusan desain di bawah sudah dikonfirmasi lewat diskusi sebelumnya poin yang masih terbuka ditandai eksplisit.

---

## 1. Migrasi UI ke shadcn/ui

### 1.1 Alasan (ringkas)
- Berbasis Tailwind (sudah dipakai) + Radix UI (accessibility gratis) bukan design system "all-in-one" yang gayanya bentrok dengan token custom (`--color-accent`, `--color-ink`, dst di `globals.css`) yang sudah dibangun.
- Komponen di-copy ke project (`components/ui/`), bukan npm black-box bisa di-restyle total pakai token existing.
- Punya `Command` (cmdk) pas persis untuk fitur suggestion/autocomplete nomor HP yang jadi andalan app ini.

### 1.2 Setup awal
- [ ] Install shadcn/ui CLI, inisialisasi dengan Tailwind v4 config yang sudah ada
- [ ] Map token warna existing (`--color-accent`, `--color-ink-soft`, `--color-rose`, dst) ke variable shadcn (`--primary`, `--foreground`, `--destructive`, dst) di `globals.css` supaya komponen shadcn otomatis ikut palet "Light Soft Structuralism" yang sudah ada, tidak perlu restyle manual satu-satu
- [ ] Pertahankan `geist` font & `framer-motion` shadcn tidak menggantikan animasi/font, cuma menyuplai struktur komponen (Button, Input, Dialog, dll)

### 1.3 Komponen prioritas (dipasang duluan, dipakai berulang di banyak halaman)
| Komponen shadcn | Dipakai untuk |
|---|---|
| `Command` | Auto-lookup/suggestion nomor HP (fitur andalan) |
| `Input`, `Label` | Semua form (ganti input mentah HTML yang sekarang) |
| `Select` | Filter repeat order, filter channel, rentang usia |
| `Badge` | Label "Order ke-N", status retensi (Active/At Risk/Churned), tag customer |
| `Dialog` / `Sheet` | Form tambah detail customer (usia, gender, alias) modal terpisah dari flow utama |
| `Tabs` | Halaman customer detail (info dasar / riwayat order / catatan) |
| `Table` | List customers, riwayat order |
| `Toast` (sonner, direkomendasikan shadcn) | Feedback submit order/simpan data ganti alert/console sekarang |

### 1.4 Urutan migrasi halaman (per halaman, bukan sekaligus)
1. **`(app)/app/page.tsx`** (Input Order) prioritas tertinggi, karena di sinilah fitur suggestion dan fitur baru (order_count, alias) dipasang. Migrasi UI dan fitur baru dikerjakan bersamaan di halaman ini (lihat Section 2).
2. **`(app)/app/customers/page.tsx`** + **`[id]/page.tsx`** tempat field detail baru (usia, gender, deskripsi, alias, tag) ditampilkan & diisi.
3. **`(app)/app/dashboard/page.tsx`** tempat filter repeat order & breakdown usia/gender ditampilkan.
4. **`(app)/app/follow-up/page.tsx`**, **`settings/page.tsx`**, **`export/page.tsx`** migrasi UI mengikuti pola yang sudah settle dari 3 halaman di atas, tanpa fitur baru di tahap ini.

### 1.5 Yang TIDAK berubah
- `framer-motion` animasi entrance (fadeUp, dst) tetap dipakai, cuma dibungkus komponen shadcn di dalamnya
- Struktur routing App Router tidak berubah
- Palet warna & identitas visual "Light Soft Structuralism" dipertahankan shadcn cuma ganti *implementasi* komponen, bukan *bahasa desain*

---

## 2. Fitur Flow Input Order (Petugas)

Ini prioritas nomor satu sesuai arahan: **kecepatan di sisi petugas**.

### 2.1 Auto-lookup instant saat ketik nomor HP
- [ ] Ganti input pencarian nomor HP dengan `Command` (shadcn) style command-palette, saran muncul begitu mulai ketik (misal `0894`), tanpa perlu Enter/tombol
- [ ] **Preload seluruh data customer** begitu halaman Input Order dibuka (bukan nunggu ketikan pertama) supaya ketikan pertama pun instant, tidak nunggu network round-trip
- [ ] Debounce tetap dipakai (pola existing sudah benar), tapi karena data sudah preloaded, debounce ini jadi soal filtering, bukan fetch ulang
- [ ] Setiap hasil suggestion tampilkan: **nama, badge "Order ke-N", channel & tanggal order terakhir** bukan cuma nama seperti sekarang

### 2.2 Match by nomor HP, bukan nama (kasus ganti nama saat repeat)
- [ ] Matching tetap berbasis `phone_normalized` (pola existing sudah benar, dipertahankan)
- [ ] Begitu nomor cocok, tampilkan **nama utama tersimpan di sistem** (bukan minta petugas ketik ulang)
- [ ] Tambah tombol kecil non-blocking: **"❓ Nama beda? tambah keterangan"** submit order tetap bisa jalan tanpa isi ini. Kalau diklik, buka `Dialog` kecil: field bebas "keterangan alias" (contoh: "kadang dipesan oleh adiknya, nama: Sinta") TIDAK jadi field structured/array alias terpisah (sesuai keputusan: cukup "tambahan keterangan aja")

### 2.3 Form pelanggan baru minimal
- [ ] Hanya 3 field wajib: **nomor HP, nama, channel** sesuai keputusan eksplisit ("yang penting tercatat nama no telp dan channelnya dulu")
- [ ] Field detail lain (usia, gender, deskripsi) **tidak muncul sama sekali** di form ini dipindah total ke halaman customer detail
- [ ] Setelah submit, tampilkan badge kecil non-intrusive kalau profil customer belum lengkap (mis. ikon subtle di list customer) sekadar penanda untuk semua orang (petugas & manager), bukan reminder yang mengganggu

### 2.4 `order_count` sebagai counter tersimpan (bukan hitung ulang)
Ini prasyarat teknis untuk 2.1 dan Section 3 (filter repeat).

- [ ] Tambah kolom `order_count` di sheet `customers`
- [ ] Buat endpoint server baru (bukan proxy generic) `POST /api/orders` yang di dalamnya: (1) **cek session cookie ada & valid** (auth minimal endpoint baru, tidak ada resiko pecah fitur existing), (2) tulis baris baru ke `orders`, (3) baca `order_count` customer terkait, (4) tulis balik `order_count + 1` dalam satu operasi server-side untuk minimalkan race condition antar kasir yang input bersamaan. **Alasan auth di endpoint ini duluan:** ini endpoint tulis (create) paling kritis, dibuat dari nol (bukan ubah lama), dan session check tidak menambah friction karena petugas toh sudah login
- [ ] `customerService.searchCustomers()` baca langsung `order_count` dari kolom, **hapus hardcode `order_count: 0`**
- [ ] Tambah tombol "Recalculate" tersembunyi di Settings (admin only) sebagai jaring pengaman kalau counter pernah tidak sinkron dipakai jarang, bukan bagian dari flow rutin

---

## 3. Fitur Detail & Analisis Customer (Manager/Stakeholder)

Semua field di section ini **opsional, diisi belakangan**, di luar flow input order.

### 3.1 Kategori usia (rentang) & jenis gender
- [ ] Tambah kolom `age_range` (enum, bukan angka bebas) rentang final:

| Range | Label | Alasan |
|-------|-------|--------|
| `<17` | Anak-anak/Remaja awal | Biasanya bukan pengambil keputusan beli sendiri, tapi relevan buat F&B ramah keluarga |
| `17-25` | Gen Z / Pelajar-Mahasiswa | Sensitif harga, aktif di channel online (Gofood/Grab/Shopee) |
| `26-35` | Muda bekerja | Daya beli naik, sering takeaway/dine-in cepat |
| `36-45` | Keluarga muda | Order lebih besar (untuk keluarga), pola dine-in weekend |
| `46-55` | Dewasa mapan | Loyal ke tempat favorit, kurang sensitif harga |
| `56+` | Senior | Segmen kecil tapi biasanya loyal jangka panjang |
- [ ] Tambah kolom `gender`: `L` / `P` / (kosong jika tidak diisi)
- [ ] Kedua field ini muncul di halaman **Customer Detail**, via `Select` (shadcn), bukan di form input order

### 3.2 Deskripsi/keterangan customer
- [ ] Tambah kolom `description` (teks bebas) di `customers` dipakai untuk catatan umum ("suka pedas", "biasa dine-in weekend") dan juga menampung keterangan alias dari 2.2
- [ ] Muncul di halaman Customer Detail, textarea sederhana

### 3.3 Filter repeat order
- [ ] Di halaman `customers/page.tsx`, tambah `Select`/`ToggleGroup` filter: `Semua`, `1x`, `2-5x`, `6-10x`, `11-20x`, `21x+`
- [ ] Filter jalan di client, berdasar `order_count` yang sudah jadi counter tersimpan (Section 2.4) tidak perlu hitung ulang
- [ ] Bucket ini bisa disesuaikan belakangan tanpa ubah struktur data (murni logic filter di UI)

### 3.4 Label "Order ke-N" matang di semua tempat relevan
- [ ] List customer: badge `Order ke-{N}` (shadcn `Badge`)
- [ ] Customer detail: tampilkan riwayat lengkap + posisi order (mis. "Order ke-3 dari 7" di tiap baris riwayat)
- [ ] Suggestion saat input order (Section 2.1): sudah termasuk

---

## 4. Perbaikan Fondasi (Dikerjakan Sambil Jalan, Bukan Proyek Terpisah)

Sesuai arahan "fitur dulu" ini bukan pekerjaan besar terpisah, tapi ditempel di titik yang relevan saat fitur di atas dikerjakan.

### 4.1 Hilangkan ketergantungan localStorage
- [ ] `settingsService.ts`: hapus pola localStorage-first. Settings dibaca langsung dari Sheets tiap load halaman Settings, dan di-pass sebagai prop/context ke komponen yang butuh (`waLinkBuilder.ts`, `churnStatus.ts`) bukan tiap fungsi baca `localStorage` sendiri-sendiri
- [ ] Pertimbangkan React Context (`SettingsProvider`) di root `(app)/layout.tsx` fetch sekali saat app load, dipakai semua halaman turunan, hilangkan kebutuhan localStorage sebagai perantara
- [ ] Auth (`retainly_user` di localStorage) **di luar scope PLAN ini** sudah dibahas terpisah sebagai isu keamanan (lihat catatan Section 5)

### 4.2 Endpoint server dengan logic + auth minimal (bukan cuma proxy generic)
- [ ] `POST /api/orders` (Section 2.4) adalah endpoint pertama yang punya logic nyata di server **sekaligus endpoint pertama dengan auth minimal (session cookie check)** pola ini jadi contoh untuk endpoint berikutnya (`PATCH /api/customers/[id]` untuk update detail, dsb) alih-alih terus menambah pemakaian `/api/sheets/update` generic
- [ ] Auth di sini **hanya cek session cookie valid** bukan full RBAC, cukup untuk memastikan request datang dari user yang sudah login. Ini langkah kecil, bukan pengganti sistem auth lengkap (tetap di luar scope)

---

## 5. Di Luar Scope PLAN Ini (Catatan, Bukan Diabaikan)

- **Keamanan (auth server-side, PIN hashing, proteksi endpoint)** sudah diidentifikasi kritis di audit terpisah, sengaja tidak digabung ke PLAN fitur ini sesuai arahan "fitur dulu". **Perlu ditegaskan: risiko ini tetap ada selama development fitur berjalan** (data customer & PIN admin tetap exposed tanpa auth).
- **Nilai transaksi (order value/nominal)** diusulkan sebelumnya, belum dikonfirmasi masuk scope, tunggu keputusan
- **Riwayat perubahan nama otomatis ter-log, tag/label customer, cohort retention report, preferensi channel, export tersegmentasi** usulan tambahan, belum dikonfirmasi prioritas

---

## 6. Pertanyaan Terbuka (Konfirmasi Sebelum Eksekusi)

1. ~~Rentang usia final~~ **SUDAH DITETAPKAN**: `<17 / 17-25 / 26-35 / 36-45 / 46-55 / 56+`
2. ~~Badge "profil belum lengkap"~~ **SUDAH DITETAPKAN**: tampil ke semua orang (petugas & manager)
3. ~~Auth minimal di POST /api/orders~~ **SUDAH DITETAPKAN**: ya, sekalian. Cek session cookie ada & valid. Endpoint baru dari nol, tidak ada resiko pecah fitur existing. Cukup untuk lapisan pertama.
4. ~~Toast library~~ **SUDAH DITETAPKAN**: `sonner`

**Semua pertanyaan terbuka sudah dijawab. PLAN ini siap dieksekusi.**
