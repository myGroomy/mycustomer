import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Code,
  Database,
  GitBranch,
  LockKey,
  MapTrifold,
  Rocket,
  ShieldCheck,
  TestTube,
} from "@phosphor-icons/react/dist/ssr";

const folderMap = [
  ["src/app/(app)", "Halaman aplikasi yang membutuhkan session."],
  ["src/app/api", "Route backend untuk auth, customer, order, dan Google Sheets."],
  ["src/services", "Service client untuk memanggil API dan memetakan data domain."],
  ["src/lib", "Session server, auth helper, provider, rate limit, dan utilitas infra."],
  ["src/utils", "Pure utility seperti normalisasi nomor dan status retensi."],
  ["src/types", "TypeScript types untuk customer, order, session, dan user."],
  ["src/components/ui", "Primitive UI berbasis shadcn/Base UI."],
  ["supabase/migrations", "Tidak digunakan sebagai datastore utama project ini."],
];

const apiGroups = [
  ["Auth", "/api/auth/login, /api/auth/logout, /api/auth/me"],
  ["Customer", "/api/customers/resolve, /api/customers/update, /api/customers/follow-up"],
  ["Order", "/api/orders, /api/orders/follow-up, /api/orders/recalculate"],
  ["Sheets", "/api/sheets dan route append/update/delete/import"],
  ["Admin", "/api/admin/backfill-branch-memberships"],
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink p-5 text-sm leading-7 text-white">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-[100dvh] bg-canvas px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ash transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          Kembali ke landing page
        </Link>

        <header className="mt-10 border-b border-hairline pb-8">
          <div className="flex items-center gap-3 text-accent">
            <Code size={26} weight="duotone" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Developer Handbook
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Panduan Developer MYCUSTOMER
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ash">
            Dokumentasi onboarding untuk memahami arsitektur, alur data, aturan
            domain, dan cara aman mengembangkan fitur baru.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-accent/20 bg-accent/5 p-5">
          <div className="flex gap-3">
            <Rocket size={22} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h2 className="font-semibold">Mulai dari sini</h2>
              <p className="mt-2 text-sm leading-6 text-ash">
                Setup environment lokal dan Google Sheets dijelaskan di{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-ink">
                  README.md
                </code>
                . Setelah project berjalan, gunakan halaman ini sebagai referensi
                saat membaca atau mengubah codebase.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            [MapTrifold, "Struktur", "Lokasi source dan tanggung jawabnya"],
            [Database, "Data flow", "Cara data bergerak melalui API"],
            [ShieldCheck, "Guardrails", "Aturan keamanan yang wajib dipertahankan"],
          ].map(([Icon, title, description]) => (
            <div key={title as string} className="rounded-2xl border border-hairline bg-white p-4">
              <Icon size={22} weight="duotone" className="text-accent" />
              <div className="mt-3 text-sm font-semibold">{title as string}</div>
              <div className="mt-1 text-xs text-ash">{description as string}</div>
            </div>
          ))}
        </div>

        <section className="mt-10 space-y-10">
          <article>
            <h2 className="text-2xl font-semibold">1. Gambaran arsitektur</h2>
            <p className="mt-3 leading-7 text-ash">
              MYCUSTOMER adalah aplikasi Next.js App Router. UI client memanggil
              API route internal, lalu API route membaca atau menulis Google
              Sheets menggunakan service account di server. Credential Google
              tidak boleh masuk ke browser.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Client UI", "Halaman React dan komponen interaktif."],
                ["API layer", "Session, authorization, validasi, dan transformasi."],
                ["Google Sheets", "Datastore untuk users, customers, orders, dan settings."],
              ].map(([title, description], index) => (
                <div key={title} className="rounded-2xl border border-hairline bg-white p-4">
                  <div className="text-xs font-bold text-accent">0{index + 1}</div>
                  <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-ash">{description}</p>
                </div>
              ))}
            </div>
            <CodeBlock>{`Client Component
  -> src/services/*
  -> /api/*
  -> authenticatedUser()
  -> Google Sheets API`}</CodeBlock>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">2. Peta folder</h2>
            <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white">
              {folderMap.map(([folder, description]) => (
                <div key={folder} className="grid gap-1 px-4 py-3 sm:grid-cols-[ minmax(0,0.9fr)_1.5fr] sm:gap-5">
                  <code className="text-sm font-semibold text-accent">{folder}</code>
                  <span className="text-sm text-ash">{description}</span>
                </div>
              ))}
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">3. Alur data utama</h2>
            <div className="mt-4 space-y-4">
              {[
                ["Input order", "Halaman input mencari atau resolve customer, menormalisasi nomor, lalu membuat order melalui /api/orders."],
                ["Customer", "Data customer dan order dibaca melalui service. Status retensi dihitung di client dari tanggal order terakhir dan settings."],
                ["Follow-up", "Daftar customer berisiko difilter dari data branch yang diizinkan. Pengiriman WhatsApp tetap manual melalui wa.me."],
                ["Settings", "Settings aplikasi dibaca dari Google Sheets dan disinkronkan ke provider/settings service."],
              ].map(([title, description]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-hairline bg-white p-4">
                  <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-emerald" />
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ash">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">4. API dan authorization</h2>
            <p className="mt-3 leading-7 text-ash">
              Route terproteksi wajib memanggil helper auth server-side. Jangan
              menganggap hidden menu atau role dari localStorage sebagai kontrol
              keamanan.
            </p>
            <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white">
              {apiGroups.map(([group, routes]) => (
                <div key={group} className="grid gap-1 px-4 py-3 sm:grid-cols-[100px_1fr] sm:gap-5">
                  <span className="text-sm font-semibold">{group}</span>
                  <code className="text-xs leading-6 text-ash">{routes}</code>
                </div>
              ))}
            </div>
            <CodeBlock>{`const auth = await authenticatedUser(["owner", "admin"])
if (auth.error) return auth.error

// Untuk data branch, selalu gunakan auth.user.branch
// Jangan percaya branch dari request body tanpa verifikasi.`}</CodeBlock>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">5. Aturan domain yang wajib</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Nomor WhatsApp", "Selalu panggil normalizePhone() sebelum menyimpan, query, deduplikasi, atau matching."],
                ["Status retensi", "Rule-based dari recency dan threshold settings. Jangan menambahkan ML/DL tanpa keputusan produk baru."],
                ["Google Sheets writes", "Gunakan RAW, bukan USER_ENTERED, dan cegah formula injection pada input user."],
                ["Follow-up", "Hanya buat link wa.me manual. Jangan menambahkan API pengiriman WhatsApp otomatis."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-hairline bg-white p-4">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ash">{description}</p>
                </div>
              ))}
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">6. Checklist membuat fitur baru</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-ash">
              {[
                "Cari service, utility, dan komponen yang sudah ada sebelum membuat helper baru.",
                "Tentukan apakah route membutuhkan session, role, dan branch scope.",
                "Validasi input di server; validasi client hanya untuk UX.",
                "Batasi query list dengan pagination atau limit.",
                "Pastikan response tidak mengembalikan PII atau error backend yang tidak diperlukan.",
                "Tambahkan state loading, error, dan empty state pada UI.",
                "Jalankan npm run typecheck dan git diff --check sebelum handoff.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">7. Testing dan validasi</h2>
            <div className="mt-4 flex gap-3 rounded-2xl border border-hairline bg-white p-5">
              <TestTube size={22} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
              <div className="text-sm leading-7 text-ash">
                <p>
                  Utility murni seperti normalisasi nomor, churn status, vCard,
                  dan wa.me link harus mudah diuji tanpa side effect.
                </p>
                <CodeBlock>{`npm run typecheck
git diff --check
npm run build`}</CodeBlock>
              </div>
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">8. Catatan keamanan</h2>
            <div className="mt-4 flex gap-3 rounded-2xl border border-rose/20 bg-rose/5 p-5">
              <LockKey size={22} weight="duotone" className="mt-0.5 shrink-0 text-rose" />
              <p className="text-sm leading-7 text-ash">
                Data customer berisi PII. Jangan mencetak nomor WhatsApp atau
                credential ke log. Export/import wajib dibatasi server-side untuk
                role admin, dan setiap perubahan schema harus dicatat dalam
                decision log project.
              </p>
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-semibold">9. Git workflow</h2>
            <p className="mt-3 leading-7 text-ash">
              Buat perubahan kecil dan terfokus, jangan mereset perubahan user
              lain, dan jangan commit secret. Gunakan commit message yang
              menjelaskan perubahan perilaku, lalu sertakan hasil typecheck pada
              handoff.
            </p>
            <div className="mt-4 flex gap-3 rounded-2xl border border-hairline bg-white p-5">
              <GitBranch size={22} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
              <span className="text-sm leading-6 text-ash">
                README adalah panduan setup operator. Halaman ini adalah referensi
                engineer dan harus diperbarui jika arsitektur atau guardrail
                berubah.
              </span>
            </div>
          </article>
        </section>

        <footer className="mt-12 border-t border-hairline pt-6 text-sm text-ash">
          MYCUSTOMER Developer Handbook
        </footer>
      </div>
    </main>
  );
}
