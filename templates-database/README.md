# templates-database

Template database (`.xlsx`) untuk instalasi baru MyCustomer. Aplikasi memakai
**satu Google Spreadsheet dengan banyak tab** sebagai datastore — file di folder
ini adalah cetakannya.

## File

| File | Fungsi |
|------|--------|
| `mycustomer-database-template.xlsx` | Template siap pakai: 10 tab aplikasi + tab `_panduan` |
| `generate_templates.py` | Generator (openpyxl) — jalankan ulang saat skema berubah |

## Cara pakai

1. Upload `mycustomer-database-template.xlsx` ke Google Drive.
2. Buka file tersebut dengan **Google Sheets** (otomatis terkonversi jadi spreadsheet).
3. Share spreadsheet ke email **service account** sebagai **Editor**.
4. Salin ID spreadsheet dari URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
5. Isi `GOOGLE_SPREADSHEET_ID=SPREADSHEET_ID` di `.env.local`.
6. (Opsional) Hapus tab `_panduan` — hanya dokumentasi, tidak dibaca aplikasi.

## Isi workbook

Tab yang **wajib ada** (nama dan urutan kolom persis — jangan diubah):

- `customers` — 17 kolom (`id` … `followed_up_at`)
- `orders` — 9 kolom (`id` … `followed_up_at`)
- `settings` — `key`, `value` (+ 4 baris default terisi)
- `branches` — 6 kolom (+ seed CMH & BDG)
- `users` — 9 kolom (`id` … `status`)
- `customer_branches` — 9 kolom
- `staging_cmh` / `staging_bdg` — 5 kolom (`tanggal, nama, tipe_order, no_telp, status`)

Tab **opsional** (untuk fitur import Admin):

- `import_customers` / `import_orders` — baris kuning = contoh, hapus sebelum dipakai.

Detail kolom, enum valid, dan catatan posisi-kritis ada di tab `_panduan`
dan di [`plan-database.md`](../plan-database.md) §3.

## Regenerasi

```bash
python3 templates-database/generate_templates.py
```

Script membaca definisi `SHEETS` di dalamnya lalu menimpa `.xlsx` + memverifikasi
ulang nama tab dan semua header terhadap skema yang didefinisikan.
Butuh `openpyxl` (`pip install openpyxl`).

## Catatan

- Baris kosong = template bersih; aplikasi mengisi data sendiri (append).
- Kolom nomor HP/ID diformat sebagai **teks** agar leading `0` tidak hilang.
- **Jangan rename tab** atau menggeser kolom posisi-kritis (A–C customers,
  B–D orders) — ada kode yang membaca berdasarkan index kolom.
