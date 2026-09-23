export default function AppLoading() {
  return (
    <main
      aria-label="Memuat halaman"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-10"
    >
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-5 w-32 rounded-full bg-sunken" />
          <div className="h-9 w-64 rounded-xl bg-sunken" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-sunken" />
        </div>

        <div className="rounded-3xl border border-hairline bg-white p-4 sm:p-5">
          <div className="h-12 w-full rounded-2xl bg-sunken" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-28 rounded-3xl border border-hairline bg-white p-5"
            >
              <div className="h-4 w-2/5 rounded bg-sunken" />
              <div className="mt-4 h-6 w-3/5 rounded bg-sunken" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
