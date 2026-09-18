# agents.md Retain-ly

> File ini untuk AI coding agent (Claude Code, Cursor, dsb) yang bekerja langsung di repo ini.
> Untuk konteks proyek lengkap (scope, milestone, decision log), baca `plan.md` dulu.

## Project Snapshot

Retain-ly: PWA pencatatan customer F&B (tanggal, nama, channel order, no telp) untuk melacak repeat order dan status retensi (Active/At Risk/Churned) secara rule-based. Stack: Vite + React (TypeScript) + Supabase + vite-plugin-pwa, hosting Vercel.

## Setup Commands

```bash
npm install
cp .env.example .env.local   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

Test: `npm test` Lint: `npm run lint` Build: `npm run build`

## Hard Rules Jangan Dilanggar

1. **No telp WAJIB dinormalisasi** lewat `normalizePhone()` (di `src/utils/`) sebelum disimpan atau dipakai untuk query/matching. Jangan simpan/compare no telp mentah.
2. **Jangan fetch tabel penuh tanpa pagination.** Semua query list (`customers`, `orders`) wajib pakai `.range()` atau `.limit()`. Volume data ditarget ±73.000 baris dalam 4 tahun query tanpa limit akan berat.
3. **Jangan implementasikan pengiriman WhatsApp otomatis via API** (Baileys, whatsapp-web.js, WhatsApp Business API). Fitur follow-up HARUS tetap `wa.me` link manual-trigger ini keputusan final (lihat `plan.md` Decision Log #5), bukan placeholder sementara.
4. **Jangan tambahkan model ML/DL untuk churn prediction.** Churn status dihitung rule-based dari `recency` (hari sejak `order_date` terakhir) dibanding threshold di Settings. Ini keputusan eksplisit (Decision Log #4) jangan diusulkan ulang tanpa instruksi baru dari user.
5. **Jangan tambah field/fitur nominal transaksi.** Data nominal sengaja di luar scope (POS tidak menyediakan tanpa upgrade berbayar) lihat PRD Section 3 (Non-Tujuan).
6. **Jangan commit `.env`, API key, atau kredensial Supabase.** Selalu lewat env var.
7. **Jangan ganti stack** (Next.js, Astro, Firebase, React Native) tanpa instruksi eksplisit dari user keputusan stack sudah final dan didiskusikan panjang (lihat `plan.md` Decision Log #1-2).

## Code Style

- TypeScript strict mode, ESLint + Prettier (jalankan sebelum commit)
- Komponen: `PascalCase.tsx` utils/hooks: `camelCase.ts` kolom DB: `snake_case`
- Absolute import dari `src/` (`@/utils/...`), bukan `../../..`
- Fungsi murni untuk logic inti (`normalizePhone`, kalkulasi churn) testable tanpa side effect
- Async/Supabase call wajib eksplisit handle error (tampilkan state error, jangan silent fail)

## Where Things Live

| Kebutuhan | Lokasi |
|---|---|
| Koneksi Supabase | `src/services/supabaseClient.ts` |
| Logic customer/order (CRUD, search) | `src/services/customerService.ts`, `orderService.ts` |
| Normalisasi no telp | `src/utils/normalizePhone.ts` |
| Kalkulasi status retensi/churn | `src/utils/churnStatus.ts` |
| Generator wa.me link | `src/utils/waLinkBuilder.ts` |
| Generator vCard (.vcf) | `src/utils/vcardGenerator.ts` |
| Halaman/screen | `src/pages/` (lihat daftar lengkap di `docs/P-UI-retainly.md`) |
| Skema database | `plan.md` Section 13, atau `supabase/migrations/` jika sudah ada |

## Sebelum Mengerjakan Task

1. Cek `plan.md` Section 10 (Task Breakdown) task sudah dipecah per milestone
2. Cek apakah utility yang dibutuhkan sudah ada di `src/utils/` sebelum bikin baru
3. Kalau task menyentuh skema database, catat sebagai entri baru di `plan.md` Decision Log, jangan ubah langsung tanpa jejak

## Testing Expectation

- Utility murni (`normalizePhone`, `churnStatus`, `vcardGenerator`, `waLinkBuilder`) wajib unit test target 80%+ coverage
- Fitur autocomplete dan dedup-detection wajib ada test untuk edge case format no telp (`0812...`, `+62812...`, `62812...`, `812...`)
- UI styling/visual tidak perlu ditest (belum ada design system final)

## Kalau Ragu

Task ambigu atau berpotensi mengubah scope → cek `plan.md` Section 2 (Assumptions & Open Questions) dan Section 8 (Scope & Feature List, khususnya "Will NOT Have") dulu sebelum eksekusi. Kalau tetap tidak jelas, tanyakan ke user daripada berasumsi.
