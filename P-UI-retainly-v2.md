# P-UI: Retain-ly (v2 Multi-Cabang)

> Tambahan dari v1 (`P-UI-retainly.md`). Semua screen v1 (Login, Input Order, Daftar Customer, Detail Customer, Dashboard, Follow-up Harian, Settings, Export Data) **tetap dipakai**, dengan penyesuaian kecil: semua data yang ditampilkan otomatis terikat ke cabang milik user yang login. Dokumen ini berisi prompt untuk 3 screen BARU khusus role Owner, plus penyesuaian pada screen Login dan Dashboard v1.

---

## Penyesuaian Screen v1

### Login (update)
**Tambahan konteks:** setelah login, sistem mendeteksi role user (Kasir atau Owner) dan mengarahkan ke halaman yang sesuai Kasir langsung ke Input Order, Owner ke Dashboard (dengan opsi lihat gabungan).

```
Update UI Login Retain-ly: tidak ada perubahan visual dari v1, namun tambahkan catatan behavior setelah submit login berhasil, sistem redirect berdasarkan role: Kasir ke halaman Input Order, Owner ke halaman Dashboard. Tidak perlu tampilan pilihan role di layar login (role otomatis terdeteksi dari akun).
```

### Dashboard (update lihat prompt baru "Dashboard Gabungan" di bawah untuk versi Owner)
Dashboard v1 tetap dipakai apa adanya untuk role Kasir (hanya menampilkan data cabangnya). Untuk Owner, dashboard ini menjadi dasar dari "Dashboard Gabungan" yang punya tambahan toggle cabang (lihat Section baru di bawah).

---

## 9. Manajemen Cabang (BARU Owner Only)

**Fungsi:** Owner menambah, mengedit, atau menonaktifkan cabang.

**Prompt:**
```
Buatkan UI "Manajemen Cabang" untuk aplikasi Retain-ly, hanya bisa diakses role Owner.

Elemen yang harus ada:
1. Header: "Manajemen Cabang" + tombol "+ Tambah Cabang" di pojok kanan atas
2. List/tabel cabang, tiap baris menampilkan:
   - Nama cabang
   - Alamat (jika ada)
   - Status: Aktif / Nonaktif (badge warna hijau/abu-abu)
   - Jumlah customer terdaftar di cabang itu (opsional, angka ringkas)
   - Tombol aksi: "Edit" dan "Nonaktifkan"/"Aktifkan"
3. Modal/form "Tambah Cabang Baru" (muncul saat klik "+ Tambah Cabang"):
   - Input: Nama Cabang
   - Input: Alamat (opsional)
   - Input: Email login untuk cabang ini (akan dibuatkan akun Kasir terkait)
   - Tombol "Simpan"
4. Modal "Edit Cabang" sama seperti form tambah, tapi field sudah terisi data existing

Layout: mobile-first list/card view, di desktop bisa jadi tabel penuh dengan kolom-kolom di atas.
Style: status badge harus jelas (hijau=aktif, abu-abu=nonaktif), aksi nonaktifkan perlu konfirmasi (modal "Yakin nonaktifkan cabang ini? Data historis tetap tersimpan").
```

---

## 10. Dashboard Gabungan (BARU Owner Only)

**Fungsi:** Owner melihat insight retensi lintas semua cabang, atau fokus ke satu cabang tertentu.

**Prompt:**
```
Buatkan UI "Dashboard Gabungan" untuk aplikasi Retain-ly, khusus role Owner versi lanjutan dari Dashboard biasa (lihat P-UI-retainly.md Section 5) dengan tambahan kemampuan multi-cabang.

Elemen tambahan dari Dashboard v1:
1. Toggle/dropdown di bagian paling atas: "Semua Cabang" atau pilih salah satu cabang spesifik dari daftar
2. Ketika "Semua Cabang" dipilih:
   - Summary cards (total customer, total transaksi, repeat rate, jumlah at-risk) menampilkan angka gabungan semua cabang
   - Section BARU: "Perbandingan Antar Cabang" bar chart horizontal membandingkan repeat rate atau total transaksi per cabang, diurutkan dari performa tertinggi
   - Section BARU: tabel ringkas per cabang (nama cabang, total customer, repeat rate, jumlah at-risk) dengan tombol "Lihat Detail" yang membawa ke Dashboard cabang tersebut secara spesifik
3. Ketika satu cabang spesifik dipilih:
   - Tampilan sama persis seperti Dashboard v1 (khusus data cabang itu)

Layout: mobile-first, toggle cabang harus mudah diakses (sticky di atas saat scroll). Desktop: toggle di sidebar atau top bar, chart perbandingan cabang ditampilkan lebih lebar.
Style: warna konsisten dengan Dashboard v1, chart perbandingan cabang pakai warna berbeda per cabang agar mudah dibedakan.
```

---

## 11. Role Guard / Access Denied (BARU)

**Fungsi:** mencegah Kasir mengakses halaman Owner-only secara UI (pelengkap RLS di backend).

**Prompt:**
```
Buatkan UI "Access Denied" sederhana untuk aplikasi Retain-ly ditampilkan jika user dengan role Kasir mencoba mengakses halaman Owner-only (misal Manajemen Cabang atau Dashboard Gabungan) lewat URL langsung.

Elemen yang harus ada:
- Ikon/ilustrasi sederhana (kunci atau tanda seru)
- Teks: "Kamu tidak punya akses ke halaman ini"
- Tombol "Kembali ke Beranda"

Layout: centered, minimalis, full-screen.
Style: netral, tidak menakutkan ini situasi biasa (user salah akses), bukan error sistem.
```

---

## Navigasi (Update dari v1)

**Prompt tambahan:**
```
Update struktur navigasi Retain-ly untuk mendukung 2 role:

Role Kasir navigasi sama seperti v1: Home (Input Order), Customer, Dashboard, Follow-up, Settings.

Role Owner navigasi tambahan:
- Item baru "Cabang" (mengarah ke Manajemen Cabang) di bottom-nav (mobile) atau sidebar (desktop)
- Item "Dashboard" untuk Owner mengarah ke Dashboard Gabungan (bukan dashboard cabang tunggal)

Header/top bar menampilkan: nama cabang (jika role Kasir) atau "Semua Cabang" / nama cabang yang sedang dipilih (jika role Owner), plus badge kecil menunjukkan role user ("Kasir" / "Owner").
```
