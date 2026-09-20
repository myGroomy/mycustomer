# Retain-ly Brand Guidelines v1.0

> Status: Internal Style Guide | Last updated: 2026-09-10
> Bahasa dokumen: copy produk dalam **Bahasa Indonesia**, direktif teknis dalam **English**.

## Quick Reference

| Element | Value |
|---------|-------|
| Brand Name | Retain-ly |
| Tagline | "Jangan sampai pelanggan lupa balik lagi" |
| Primary Color | Accent Blue `#2f6cff` |
| Primary Font | Geist Sans (variable) |
| Mono Font | Geist Mono (variable) |
| Voice | Membumi, Praktis, Personal, Terpercaya |
| Design Language | "Light Soft Structuralism" |

---

## 1. Brand Overview

### 1.1 Nama & Asal Nama

- **Nama:** Retain-ly
- **Origin:** Berasal dari kata **"retain"** (mempertahankan pelanggan) + sufiks **"-ly"** untuk membentuk nama produk yang mudah diingat. Dibaca *"ri-ten-li"*.
- **Logo wordmark:** `Retain-ly` huruf "ly" diwarnai accent blue (`Retain<ly>`).

### 1.2 Positioning Statement

> **For** bisnis F&B di Indonesia (restoran, kafe, warung)
> **Who** mencatat order pelanggan secara manual di HP kasir,
> **Retain-ly** **is a** web-app pencatat order & pelacak retensi pelanggan yang menormalisasi nomor WhatsApp,
> **That** mengubah catatan kasir menjadi database customer aktif / jarang datang / hilang, siap difollow-up dalam satu ketukan.

### 1.3 Misi

> **"Jangan sampai pelanggan lupa balik lagi."**
> Membantu bisnis F&B kecil yang tidak punya akses API POS untuk tetap mengenal pelanggannya, melacak repeat order, dan menjaga mereka kembali tanpa install aplikasi di luar browser.

### 1.4 Target Market

| Segmen | Keterangan |
|--------|-----------|
| **Primary** | Kasir / staff toko resmi yang menginput data customer real-time saat transaksi atau akhir hari, memakai HP official toko |
| **Secondary** | Pemilik UMKM F&B multi-cabang (multi-branch, v2) |
| **Geografi** | Indonesia (UI Bahasa Indonesia, format telepon `08xx`, platform Gofood/Grab/Shopee) |
| **Perangkat** | Mobile-first (PWA), diterima juga di desktop |

### 1.5 Core Values

| Value | Artinya |
|-------|---------|
| **Praktis** | Satu ketuk. Tanpa aplikasi tambahan, tanpa setup rumit. |
| **Data-terpusat** | Catatan kasir yang tadinya tercecer jadi database terpusat. |
| **Personal** | Setiap pelanggan dikenal, disapa, dan diingat. |
| **Membumi** | Bahasa sederhana kasir, bukan jargon enterprise. |

---

## 2. Messaging Framework

### 2.1 Elevator Pitch

**ID:**
> Retain-ly membantu bisnis F&B melacak repeat order dan menghubungi pelanggan yang mulai jarang datang lewat WhatsApp. Cukup ketik nama atau nomor HP saat transaksi, data tersimpan otomatis, dan dashboard memberi tahu siapa yang perlu dihubungi hari ini.

**EN:**
> Retain-ly helps F&B businesses track repeat orders and re-engage customers who are starting to drift away over WhatsApp. Type a name or phone number at the till, data is saved automatically, and the dashboard tells you who to contact today.

### 2.2 Value Proposition per Fitur

| Fitur | Headline (ID) | Bukti / Benefit |
|-------|---------------|-----------------|
| Catat Order | *"Catat Order Sekali Ketuk"* | Rekam transaksi dari semua channel dine-in, takeaway, Gofood, Grab, Shopee dalam satu layar |
| Database Customer | *"Database Customer Otomatis"* | Setiap order membangun profil customer. Nomor WhatsApp ter-normalize, siap dihubungi |
| Retensi Real-Time | *"Retensi Real-Time"* | Lihat siapa aktif, mulai jarang, dan sudah hilang tersegmentasi otomatis |
| Follow-up WhatsApp | *"Follow-up via WhatsApp"* | Satu ketik untuk kirim pesan personal. Tanpa copy-paste, tanpa aplikasi tambahan |

**Subtitle umum (features):**
> "Tidak perlu Excel, tidak perlu catatan manual. Semua tersimpan otomatis."

### 2.3 Hero & CTA Copy

| Elemen | Copy |
|--------|------|
| Hero Headline | *"Jangan sampai pelanggan lupa balik lagi."* (kata **lupa** di-highlight accent blue) |
| Hero Subheadline | *"Retain-ly membantu bisnis F&B melacak repeat order dan menghubungi pelanggan yang mulai jarang datang lewat WhatsApp."* |
| CTA Primer | **"Mulai Sekarang"** |
| CTA Sekunder | **"Lihat Fitur"** |
| Bottom CTA Headline | *"Siap mempertahankan pelanggan Anda?"* |
| Bottom CTA Subtext | *"Mulai gratis. Tidak perlu kartu kredit. Setup dalam 2 menit."* |

### 2.4 Tagline Alternatif (untuk campaign)

1. *"Jangan sampai pelanggan lupa balik lagi."* default, emotional
2. *"Catatan kasir yang jadi database pelanggan."* functional
3. *"Kenal pelangganmu, jaga mereka balik."* short form
4. *"Pertahankan pelanggan, satu ketukan."* benefit-driven

### 2.5 Copywriting Do / Don't

| Do ✅ | Don't ❌ |
|-------|----------|
| Gunakan bahasa percakapan kasir ("tinggal ketik", "cukup") | Jangan istilah teknis database/CRUD/API |
| Sebutkan angka konkret (2 menit, 1 ketik) | Jangan klaim tak berdasar ("solusi #1") |
| Fokus pada menghemat kerja kasir | Jangan menggurui ("Anda harus modern") |
| Bahasa Indonesia alami | Jangan campur inggris berlebihan |

---

## 3. Logo & Iconography

### 3.1 Logo Baru Konsep (PROPOSED)

> **Status:** Konsep. Belum diimplementasikan ke code perlu dicreate sebagai aset SVG.

**Konsep: "Storefront Retensi"**
Mark terdiri dari kanopi toko / etalase sederhana yang menyatu dengan bentuk pelacak panah kembali (*return arrow*), melambangkan **toko + pelanggan yang kembali**. Idealnya komposisi simetris di dalam rounded square (`border-radius ≈ 24%`), satu-satu garis bersih, stroke halus, ramah di ukuran kecil.

- **Makna:** kanopi = bisnis F&B (menggantikan semantik `Storefront`), panah balik = retention.
- **Palet:** gradient accent `#2f6cff → #1e4fd6` di atas rounded square, mark berwarna putih. Untuk favicon: solid `#2f6cff` (bukan ungu).
- **Variant yang dicreate nanti:**
  | Variant | Use Case |
  |---------|----------|
  | `logo-full-horizontal.svg` | Landing header, login |
  | `logo-icon.svg` | Sidebar, mobile header, app favicon |
  | `logo-mono.svg` | Kontras terbatas, single color |

### 3.2 Logo Saat Ini (Interim sampai logo baru dibuat)

| Lokasi | Implementasi |
|--------|--------------|
| Landing nav | Phosphor `Storefront` 18px, ` bg-[#022D4E]` rounded `0.9rem`, putih |
| Sidebar app | Phosphor `Storefront` 22px, ` bg-[#022D4E]` rounded `2xl`, putih |
| Login | Phosphor `Storefront` 20px, `bg-white` ring hairline, warna accent |
| Favicon | `public/favicon.svg` petir ungu `#863bff` **TIDAK konsisten** |

### 3.3 Clean Space & Minimum Size

- **Clear space:** minimum = tinggi mark.
- **Minimum size digital:** full logo 120px, icon 24px.
- **Don'ts:**
  - Jangan rotasi / skew / stretch.
  - Jangan ganti warna di luar palet.
  - Jangan tambah shadow/efek (logo icon boleh memakai ` bg-[#022D4E]` seperti di UI saat ini).
  - Jangan taruh di background ramai tanpa kontras cukup.

### 3.4 Iconography Rules (UI icons)

- Sumber: **@phosphor-icons/react** (`weight="fill"` untuk aksen aktif, regular untuk netral).
- Ukuran konsisten satu-dimensi dalam satu context (mis. 18px header, 20px login, 22px sidebar).
- Icon container: rounded (`0.9rem` / `lg` / `2xl`), ` bg-[#022D4E]` + icon putih untuk aktif/primary.

---

## 4. Color Palette

> Source of truth: tokens di `src/app/globals.css` (Tailwind v4 `@theme`). Jangan hardcode warna selain melalui token.

### 4.1 Brand / Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#2f6cff` | CTAs, active nav, focus ring, brand mark |
| `accent-deep` | `#1e4fd6` | Hover, selection, avatar text |
| `accent-soft` | `#5b8bff` | Ambient orb glow (login), gradient highlight |
| `accent-wash` | `#e8efff` | Icon bg, badge bg, feature icon |
| Primary button gradient | `linear-gradient(180deg, #4780ff, #2259e6)` | `.btn-primary` + shadow `0 8px 24px -8px rgba(47,108,255,.5)` |

### 4.2 Neutral / Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `canvas` | `#f6f7fb` | Page background |
| `surface` | `#ffffff` | Card / component surface |
| `sunken` | `#f1f3f9` | Input field, tab bg, progress track |
| `hairline` | `rgba(15,23,42,0.08)` | Border card/input/divider |
| `hairline-strong` | `rgba(15,23,42,0.14)` | Emphasized border |

### 4.3 Text / Ink

| Token | Hex | Usage |
|-------|-----|-------|
| `ink` | `#0f172a` | Heading & body teks |
| `ink-soft` | `#334155` | Secondary teks (nav, subtitle) |
| `ash` | `#64748b` | Label, caption |
| `mist` | `#94a3b8` | Placeholder, disabled, scrollbar |

### 4.4 Semantic / Status

| Token | Hex | Usage |
|-------|-----|-------|
| `emerald` | `#10b981` | Active ✓, success, tombol WhatsApp |
| `amber` | `#f59e0b` | At Risk (jarang datang) |
| `rose` | `#f43f5e` | Churned (hilang), error |

### 4.5 Do / Don't Warna

| Do ✅ | Don't ❌ |
|-------|----------|
| Gunakan accent untuk OPS sedikit, tajam | Jangan accent untuk dekorasi murni tanpa makna |
| Status warna hanya untuk status retensi/jenis | Jangan biru untuk status error |
| Gradient button hanya utk primary CTA | Jangan gradient di teks / body |
| Warna dari token, bukan hex inline | Jangan ungu `#863bff` dari favicon lama di UI |

### 4.6 Accessibility

- Teks `ink` di atas `surface`: kontras tinggi ✓
- Status chip: teks semantic di atas `accent-wash`/tinted bg (pola chip yang sudah ada).
- Target minimal WCAG AA (4.5:1 teks normal) untuk semua UI.

---

## 5. Typography

### 5.1 Font Stack

```css
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
```

- **Geist Sans** (variable, pakai Next font loader `geist`): semua teks & heading.
- **Geist Mono**: nomor HP, kode/ID, label data, waktu order.

### 5.2 Hierarchy (mobile-first)

| Level | Sizing kira-kira | Weight | Catatan |
|-------|------------------|--------|---------|
| Display/Hero | `text-4xl`–`5xl` | 600–700, `tracking-tight` | Landing hanya |
| H1 (page) | `text-2xl` | 600–700 | Header halaman app |
| H2 | `text-lg`–`xl` | 600 | Section |
| Subheading | `text-sm`–`base` `ink-soft` | 500 | Deskripsi |
| Body | `text-sm` to `base` `ink` | 400–500 | Konten utama |
| Label/Caption | `text-xs`–`sm` `ash`/`mist` | 500 | Meta, tab |
| Data (mono) | `text-sm` medium | 500 | Nomor HP, tanggal |

**Aturan:**
- Gunakan `tracking-tight` untuk heading besar; jangan terlalu condense di body.
- Nomor WhatsApp SELALU pakai Geist Mono (konsisten + mudah dibaca).
- Bahasa `lang="id"`.

---

## 6. Voice & Tone

### 6.1 Persona

Bayangkan brand sebagai **rekan pemilik warung/server yang sigap dan pengertian** tidak sok teknologi, tidak birokratis, langsung ke inti yang bermanfaat.

### 6.2 Voice Chart

| Trait | Kami Adalah | Kami Bukan |
|-------|-------------|-----------|
| **Membumi** | Bahasa sehari-hari kasir: "tinggal ketik", "cukup", "sudah" | Sok ilmiah, jargon korporat |
| **Praktis** | Langsung pada yang menyelamatkan waktu | Antibu, terlalu panjang |
| **Personal** | Menyapa pelanggan & bisnis secara manusiawi | Robotik, membahas "user" sebagai angka |
| **Terpercaya** | Angka konkret, klaim wajar | Overselling, hype kosong |

### 6.3 Tone by Context

| Context | Tone | Contoh |
|---------|------|--------|
| Landing/marketing | Hangat, memancing emosi | *"Jangan sampai pelanggan lupa balik lagi."* |
| Onboarding/fitur | Instruksional, jelas | *"Ketik nama atau nomor HP, pilih channel, selesai."* |
| Success/animasi | Singkat, ringan | *"Order tercatat."* / *"Pelanggan ditambahkan."* |
| Error/kosong (empty state) | Tenang, arah solusi | *"Belum ada order. Mulai dari halaman Input Order."* |
| Follow-up/churn | Peduli, personal | *"Siapa yang perlu dihubungi hari ini."* |

### 6.4 Kata Terlarang & Dianjurkan

| Hindari ❌ | Gunakan ✅ |
|------------|------------|
| "retain" mentah (EN) di copy user-facing | "dipertahankan", "jaga balik" |
| churned/at risk (EN) | "hilang" / "mulai jarang datang" |
| "customer" di copy marketing | "pelanggan" |
| "user experience", "flow", "deploy" | bahasa aksi ukuran kasir |
| "seamless", "revolutionary" | "tanpa ribet", "otomatis" |

> Catatan: istilah EN dibolehkan di penjelasan teknis internal / dokumentasi developer, bukan di UI user-facing.

### 6.5 Sample Rewrites

| Sebelum ❌ | Sesudah ✅ |
|------------|------------|
| "Sync your customer database seamlessly" | "Semua data tersimpan otomatis." |
| "Monitor churn rate in real-time" | "Lihat siapa yang mulai jarang datang." |
| "Elevate retention through engagement" | "Hubungi pelanggan sebelum mereka lupa balik." |
| "Input order and we handle deduplication" | "Ketik nomornya sekali, profil pelanggan terpantau." |

---

## 7. Design Language "Light Soft Structuralism"

> Nama resmi desain system: **"Light Soft Structuralism"** (didefinisikan di `globals.css:7`).

Struktur tegas, perasaan lembut. Grid yang jelas, kartu kokoh ber-bezel ganda, glows lembut, dan detail halus yang membuat app terasa premium namun tidak dingin.

### 7.1 Signature Elements

| Elemen | Spec | Lokasi Kode |
|--------|------|-------------|
| **Double-bezel card** | outer gradient `#fff → #edeff6`, radius `2rem`; inner gradient `#fff → #fafbff` + radial glow biru di atas | `.doppel-outer`, `.doppel-inner` |
| **Ambient hero bg** | tiga radial gradient biru di atas `#f6f7fb` | `.sky-hero` |
| **Film grain** | overlay noise `opacity: 0.028` untuk taktil | `.grain` |
| **Hairline borders** | `rgba(15,23,42,.08)` garis sangat tipis, bukan border solid tebal | token `hairline` |
| **Primary CTA** | gradient `#4780ff → #2259e6`, inset highlight atas, shadow `0 8px 24px -8px rgba(47,108,255,.5)` | `.btn-primary` |

### 7.2 Motion System

| Token | Value | Penggunaan |
|-------|-------|-----------|
| `--ease-fluid` | `cubic-bezier(0.32, 0.72, 0, 1)` (js: `FLUID_EASE`) | transisi normal tujuan |
| `--ease-snappy` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | micro-interaction cepat |

- Durasi pendek untuk micro (150–250ms), lebih panjang untuk layout (300–500ms).
- Motion memperkuat state (tab aktif, status berubah), bukan sebagai hiasan.

### 7.3 Styling Rules

| Do ✅ | Don't ❌ |
|-------|----------|
| Kard & section pakai bezel ganda / hairlines tipis | Jangan border 1px solid gelap tebal |
| Glow biru lembut di area hero/ambient | Jangan shadow tajam `0 0 0 #000` |
| Rounded generous (1rem–2rem) pada surfaces | Jangan sudut tajam 2px di surface besar |
| Status pakai chip ringan (`accent-wash`/tinted) | Jangan chip berwarna penuh kecuali tombol |
| Gunakan ease fluid di seluruh app | Jangan ease bawaan `ease-in-out` default |

---

## 8. Brand Audit Checklist

Gunakan saat merilis fitur / asset baru.

### 8.1 Copy
- [ ] UI user-facing dalam Bahasa Indonesia yang natural?
- [ ] Tidak ada istilah EN teknis (churned, at risk, customer) sebagai label?
- [ ] CTA jelas & aksi ("Mulai Sekarang", "Catat Order", "Kirim WhatsApp")?
- [ ] Klaim didukung angka nyata, tidak hype?

### 8.2 Visual
- [ ] Warna diambil dari token, bukan hex baru di luar palet?
- [ ] Accent biru dipakai untuk OPS/fokus, bukan dekorasi?
- [ ] Tidak ada ungu `#863bff` (favicon lama) yang bocor ke UI?
- [ ] Geist Sans untuk teks, Geist Mono untuk nomor HP & data?
- [ ] Surfaces rounded + hairlines, tanpa border gelap tebal / shadow kasar?

### 8.3 Logo
- [ ] Memakai variant benar (full/icon/mono) untuk context?
- [ ] Clear space terjaga, minimum size terpenuhi?
- [ ] Favicon konsisten dengan family brand (bukan petir ungu)?

### 8.4 Motion
- [ ] Ease pakai `fluid`/`snappy`, durasi proporsional?
- [ ] Motion menandakan state, bukan hiasan belaka?

---

## Changelog

| Version | Tanggal | Perubahan |
|---------|---------|-----------|
| 1.0 | 2026-09-10 | Initial guidelines. Termasuk konsep logo baru "Storefront Retensi" (belum diimplementasikan) |