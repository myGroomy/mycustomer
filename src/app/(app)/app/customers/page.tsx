"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MagnifyingGlass,
  UsersThree,
  Calendar,
  Funnel,
  X,
  DownloadSimple,
  Phone,
  ShoppingBag,
  WarningCircle,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomersWithStats,
  searchCustomers,
} from "@/services/customerService";
import { getRetentionStatus, getRetentionLabel } from "@/utils/churnStatus";
import { CHANNELS, DEFAULT_THRESHOLDS, PAGE_SIZE } from "@/constants";
import { fadeUp } from "@/lib/motion";
import { useMounted } from "@/lib/useMounted";
import type { CustomerWithStats, RetentionStatus } from "@/types";

type RepeatFilter = "all" | "1x" | "2-5x" | "6-10x" | "11-20x" | "21x+";

const REPEAT_FILTERS: { key: RepeatFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "1x", label: "1x" },
  { key: "2-5x", label: "2-5x" },
  { key: "6-10x", label: "6-10x" },
  { key: "11-20x", label: "11-20x" },
  { key: "21x+", label: "21x+" },
];

function matchesRepeatFilter(count: number, filter: RepeatFilter): boolean {
  if (filter === "all") return true;
  if (filter === "1x") return count === 1;
  if (filter === "2-5x") return count >= 2 && count <= 5;
  if (filter === "6-10x") return count >= 6 && count <= 10;
  if (filter === "11-20x") return count >= 11 && count <= 20;
  if (filter === "21x+") return count >= 21;
  return true;
}

function CustomerListView() {
  const ready = useMounted();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<RetentionStatus | "all">("all");
  const [repeatFilter, setRepeatFilter] = useState<RepeatFilter>("all");
  const [countRange, setCountRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Filter State
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (searchQuery) {
        const result = await searchCustomers(searchQuery, page, PAGE_SIZE);
        const seenIds = new Set<string>();
        const withStats: CustomerWithStats[] = result.data
          .filter((c) => {
            if (seenIds.has(c.id)) return false;
            seenIds.add(c.id);
            return true;
          })
          .map((c) => ({
            ...c,
            retention_status: getRetentionStatus(
              c.last_order_date,
              DEFAULT_THRESHOLDS,
            ),
          }));
        setCustomers(withStats);
        setTotalPages(result.totalPages);
        setTotal(result.count);
      } else {
        const result = await getCustomersWithStats(page, PAGE_SIZE);
        const seenIds = new Set<string>();
        const withStatus = result.data
          .filter((c) => {
            if (seenIds.has(c.id)) return false;
            seenIds.add(c.id);
            return true;
          })
          .map((c) => ({
            ...c,
            retention_status: getRetentionStatus(
              c.last_order_date,
              DEFAULT_THRESHOLDS,
            ),
          }));
        setCustomers(withStatus);
        setTotalPages(result.totalPages);
        setTotal(result.count);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data customer",
      );
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Support drill-down query params from Dashboard: ?status=... dan ?order_count_min&order_count_max
  useEffect(() => {
    if (!searchParams) return;
    const status = searchParams.get("status");
    if (status === "active" || status === "at_risk" || status === "churned") {
      setFilter(status);
    }
    const minStr = searchParams.get("order_count_min");
    const maxStr = searchParams.get("order_count_max");
    const min = minStr ? parseInt(minStr, 10) : null;
    const max = maxStr ? parseInt(maxStr, 10) : null;
    if (min !== null || max !== null) {
      setCountRange({ min: min ?? 0, max: max ?? Number.MAX_SAFE_INTEGER });
    }
  }, [searchParams]);

  const matchesAllFilters = (c: CustomerWithStats) => {
    if (filter !== "all" && c.retention_status !== filter) return false;
    if (!matchesRepeatFilter(c.order_count || 0, repeatFilter)) return false;
    if (countRange) {
      const oc = c.order_count || 0;
      if (oc < countRange.min || oc > countRange.max) return false;
    }
    if (dateFrom && c.last_order_date < dateFrom) return false;
    if (dateTo && c.last_order_date > dateTo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const qNoZero = q.startsWith("0") ? q.slice(1) : q;
      const phone = c.phone_normalized || "";

      const nameMatch = c.name?.toLowerCase().includes(q);
      const phoneMatch = phone.includes(q) || phone.includes(qNoZero);
      // Cocokkan juga dengan nama alias (case-insensitive)
      const aliasMatch =
        c.aliases?.some((a) => a.name.toLowerCase().includes(q)) ?? false;
      // Cocokkan juga dengan usia dan jenis_kelamin (case-insensitive)
      const usiaMatch = (c.usia || "").toLowerCase().includes(q);
      const genderMatch = (c.gender || "").toLowerCase().includes(q);
      const jenisKelaminMatch = (c.jenis_kelamin || "").toLowerCase().includes(q);

      if (!nameMatch && !phoneMatch && !aliasMatch && !usiaMatch && !genderMatch && !jenisKelaminMatch) return false;
    }
    return true;
  };


  const seenFilterIds = new Set<string>();
  const filtered = customers.filter((c) => {
    if (seenFilterIds.has(c.id)) return false;
    seenFilterIds.add(c.id);
    return matchesAllFilters(c);
  });

  const countRangeLabel = countRange
    ? countRange.max === Number.MAX_SAFE_INTEGER
      ? `${countRange.min}x+`
      : countRange.min === countRange.max
        ? `${countRange.min}x`
        : `${countRange.min}x–${countRange.max}x`
    : "";

  const activeFilterLabels: { name: string; value: string }[] = [];
  if (filter !== "all")
    activeFilterLabels.push({
      name: "Status Retensi",
      value:
        filter === "active"
          ? "Active"
          : filter === "at_risk"
            ? "At Risk"
            : "Churned",
    });
  if (repeatFilter !== "all")
    activeFilterLabels.push({ name: "Jumlah Order", value: repeatFilter });
  if (countRange)
    activeFilterLabels.push({ name: "Order Spesifik", value: countRangeLabel });
  if (searchQuery)
    activeFilterLabels.push({ name: "Cari", value: searchQuery });
  if (dateFrom)
    activeFilterLabels.push({ name: "Dari Tanggal", value: dateFrom });
  if (dateTo)
    activeFilterLabels.push({ name: "Sampai Tanggal", value: dateTo });

  const downloadCsv = (rows: CustomerWithStats[]) => {
    const BOM = "\uFEFF";
    const lines: string[] = [];
    lines.push('"DAFTAR CUSTOMER - EXPORT"');
    lines.push(`"Dibuat",,,"${new Date().toLocaleString("id-ID")}"`);
    lines.push(`"Total Baris",,,${rows.length}`);
    if (activeFilterLabels.length > 0) {
      lines.push('"FILTER"');
      activeFilterLabels.forEach((f) =>
        lines.push(`"${f.name}",,,"${String(f.value).replace(/"/g, '""')}"`),
      );
    }
    lines.push("");
    lines.push(
      [
        "No",
        "Nama Customer",
        "No WhatsApp",
        "Gender",
        "Usia",
        "Cabang",
        "Jumlah Order",
        "First Order",
        "Last Order",
        "Status Retensi",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
    rows.forEach((c, idx) => {
      const row = [
        idx + 1,
        c.name,
        c.phone_normalized,
        c.gender === "L" ? "Laki-laki" : c.gender === "P" ? "Perempuan" : "",
        c.age_range || "",
        c.branch ||
          [
            ...new Set(c.orders?.map((o) => o.branch).filter(Boolean) || []),
          ].join("+"),
        c.order_count || 0,
        c.first_order_date,
        c.last_order_date,
        getRetentionLabel(c.retention_status),
      ];
      lines.push(
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      );
    });

    const blob = new Blob([BOM + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Daftar_Customer_${
      activeFilterLabels.length > 0
        ? activeFilterLabels
            .map((f) => f.value.replace(/\s+/g, ""))
            .join("-")
            .slice(0, 60)
        : "Semua"
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const r = await getCustomersWithStats(0, 10000);
      const all = r.data.map((c) => ({
        ...c,
        retention_status: getRetentionStatus(
          c.last_order_date,
          DEFAULT_THRESHOLDS,
        ),
      }));
      downloadCsv(all.filter(matchesAllFilters));
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  const getDaysSince = (date: string) =>
    Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  const getStatusBadge = (status: RetentionStatus, days: number) => {
    if (status === "active")
      return (
        <Badge className="bg-emerald/10 text-emerald border-emerald/20">
          Active
        </Badge>
      );
    if (status === "at_risk")
      return (
        <Badge className="bg-amber/10 text-accent-deep border-amber/20">
          {days}d Risk
        </Badge>
      );
    return (
      <Badge className="bg-rose/10 text-ink border-rose/20">
        {days}d Churned
      </Badge>
    );
  };

  const getAvatarStyle = (status: RetentionStatus) => {
    if (status === "active") return " bg-[#022D4E]-wash text-accent-deep";
    if (status === "at_risk") return "bg-amber/10 text-accent-deep";
    return "bg-rose/10 text-ink";
  };

  const getFavChannel = (c: CustomerWithStats) => {
    if (!c.orders || !Array.isArray(c.orders) || c.orders.length === 0)
      return null;
    const freq: Record<string, number> = {};
    for (const o of c.orders) {
      freq[o.channel] = (freq[o.channel] || 0) + 1;
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return CHANNELS.find((ch) => ch.id === top[0])?.label || top[0];
  };

  const counts = { active: 0, at_risk: 0, churned: 0 };
  customers.forEach((c) => counts[c.retention_status as keyof typeof counts]++);

  const hasDateFilter = Boolean(dateFrom || dateTo);
  const hasActiveFilter = Boolean(
    searchQuery ||
    filter !== "all" ||
    repeatFilter !== "all" ||
    hasDateFilter ||
    countRange,
  );

  const handleResetAll = () => {
    setSearchQuery("");
    setFilter("all");
    setRepeatFilter("all");
    setCountRange(null);
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Heading */}
      <motion.div
        variants={fadeUp}
        custom={0}
        initial="hidden"
        animate={ready ? "show" : "hidden"}
        className="mb-6"
      >
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Database
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
          Daftar Customer
        </h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">
          {total} customer terdaftar dalam database
        </p>
      </motion.div>

      {/* Filter Toolbar */}
      <motion.div
        variants={fadeUp}
        custom={1}
        initial="hidden"
        animate={ready ? "show" : "hidden"}
        className="mb-6"
      >
        <div className="doppel-outer">
          <div className="doppel-inner p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Funnel size={16} weight="duotone" className="text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ash">
                  Filter Customer
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || loading}
                  className="inline-flex items-center gap-1.5 rounded-full  bg-[#022D4E] px-4 min-h-[44px] text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Download CSV data sesuai filter aktif"
                >
                  <DownloadSimple size={14} weight="bold" />
                  {downloading ? "Menyiapkan..." : "Download CSV"}
                </button>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 min-h-[44px] text-xs font-semibold text-ink ring-1 ring-ink/10 transition-all hover:bg-ink/5 active:scale-95"
                  >
                    <X size={13} weight="bold" className="text-accent" />
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-4">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                  Cari Customer
                </span>
                <div className="relative">
                  <MagnifyingGlass
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist"
                    size={18}
                    weight="light"
                  />
                  <Input
                    type="text"
                    placeholder="Cari nama atau no. telepon..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    className="h-11 pl-10 text-sm rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                  Status Retensi
                </span>
                <Select
                  value={filter}
                  onValueChange={(v) =>
                    v && setFilter(v as RetentionStatus | "all")
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua ({total})</SelectItem>
                    <SelectItem value="active">
                      Active ({counts.active})
                    </SelectItem>
                    <SelectItem value="at_risk">
                      At Risk ({counts.at_risk})
                    </SelectItem>
                    <SelectItem value="churned">
                      Churned ({counts.churned})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                  Jumlah Order
                </span>
                <Select
                  value={repeatFilter}
                  onValueChange={(v) => v && setRepeatFilter(v as RepeatFilter)}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {REPEAT_FILTERS.filter((f) => f.key !== "all").map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                  Dari Tanggal
                </span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-11 text-xs rounded-2xl"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-ash">
                  Sampai Tanggal
                </span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-11 text-xs rounded-2xl"
                />
              </div>
            </div>

            {countRange && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCountRange(null)}
                  className="flex items-center gap-1.5 rounded-full border border-accent  bg-[#022D4E] px-4 min-h-[44px] text-[11px] font-semibold text-white transition-all hover:opacity-90"
                  title="Reset filter order count"
                >
                  Order: {countRangeLabel}
                  <X size={12} weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-rose/20 bg-rose/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <WarningCircle
              size={22}
              weight="duotone"
              className="shrink-0 text-rose"
            />
            <div className="text-sm text-ink">
              <span className="font-semibold">Gagal memuat data.</span>{" "}
              <span className="text-ash">{error}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadCustomers()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full  bg-[#022D4E] px-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 sm:ml-4"
          >
            Coba Lagi
          </button>
        </motion.div>
      )}

      {/* Customer Grid/List */}
      <div className="space-y-3">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="doppel-outer">
                <div className="doppel-inner p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-sunken" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-1/3 rounded bg-sunken" />
                      <div className="h-2.5 w-1/4 rounded bg-sunken" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        <motion.div
          variants={fadeUp}
          custom={3}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
          className="grid grid-cols-1 gap-3"
        >
          {!loading &&
            filtered.map((customer) => {
              const status = customer.retention_status;
              const days = getDaysSince(customer.last_order_date);
              const favCh = getFavChannel(customer);
              return (
                <Link
                  key={customer.id}
                  href={`/app/customers/${customer.id}`}
                  className="group block"
                >
                  <div className="doppel-outer transition-all duration-300 group-hover:-translate-y-0.5">
                    <div className="doppel-inner p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold ${getAvatarStyle(status)}`}
                          >
                            {getInitials(customer.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-ink truncate">
                                {customer.name}
                              </span>
                              {getStatusBadge(status, days)}
                              <Badge
                                variant="outline"
                                className="border-accent/20 text-accent"
                              >
                                Order ke-{(customer.order_count || 0) + 1}
                              </Badge>
                              {(!customer.age_range || !customer.gender) && (
                                <Badge
                                  variant="outline"
                                  className="border-accent-soft/40 text-accent-deep"
                                >
                                  profil belum lengkap
                                </Badge>
                              )}
                            </div>

                            {/* ── Baris alias ─────────────────────────────────────── */}
                            {(() => {
                              const aliases = customer.aliases ?? [];
                              if (aliases.length === 0) return null;

                              const q = searchQuery.toLowerCase();
                              // Alias yang cocok dengan query aktif
                              const matchedAliases = q
                                ? aliases.filter((a) =>
                                    a.name.toLowerCase().includes(q),
                                  )
                                : [];
                              // Hanya match via alias (bukan nama utama atau telepon)
                              const isAliasOnlyMatch =
                                matchedAliases.length > 0 &&
                                !customer.name?.toLowerCase().includes(q);

                              if (isAliasOnlyMatch) {
                                // Highlight: "Ditemukan via alias: ..."
                                return (
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-semibold text-accent-deep ring-1 ring-amber/30">
                                      <svg
                                        width="9"
                                        height="9"
                                        viewBox="0 0 12 12"
                                        fill="currentColor"
                                        aria-hidden="true"
                                      >
                                        <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1Zm.5 7.5h-1v-1h1v1Zm0-2.25h-1V3.5h1v2.75Z" />
                                      </svg>
                                      Ditemukan via alias
                                    </span>
                                    {matchedAliases.map((a) => (
                                      <span
                                        key={a.name}
                                        className="rounded-full bg-amber/10 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft ring-1 ring-amber/20"
                                      >
                                        {a.name}
                                        {a.branch && a.branch !== "-" && (
                                          <span className="ml-1 text-mist">
                                            · {a.branch}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }

                              // Tidak sedang mencari, atau search cocok lewat nama utama →
                              // tampilkan semua alias dengan gaya muted seperti sebelumnya
                              return (
                                <div className="mt-0.5 text-[11px] text-mist">
                                  Alias:{" "}
                                  {aliases.map((a) => a.name).join(", ")}
                                </div>
                              );
                            })()}

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash">
                              <span className="font-mono text-ink-soft">
                                {customer.phone_normalized}
                              </span>
                              <span>&middot;</span>
                              <span className="font-semibold text-accent">
                                {customer.order_count}x order
                              </span>
                              {favCh && (
                                <>
                                  <span>&middot;</span>
                                  <span className="rounded bg-sunken px-1.5 py-0.5 text-[10px] text-ink-soft">
                                    {favCh}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right info (Dates) */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-hairline pt-2.5 sm:pt-0 text-xs text-ash gap-1 shrink-0">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar size={13} className="text-accent" />
                            <span>
                              Order Terakhir:{" "}
                              <strong className="text-ink">
                                {customer.last_order_date}
                              </strong>
                            </span>
                          </div>
                          <div className="text-[10px] text-mist">
                            Pertama: {customer.first_order_date}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
        </motion.div>

        {!loading && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-mist">
              <UsersThree size={28} weight="duotone" className="text-mist" />
            </span>
            <p className="mt-3 text-sm text-ash">
              Tidak ada customer ditemukan
            </p>
          </motion.div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-hairline pt-5">
          <p className="text-xs text-ash">
            Halaman <strong className="text-ink">{page + 1}</strong> dari{" "}
            <strong className="text-ink">{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-full border border-hairline bg-white px-4 py-2 min-h-[44px] text-xs font-semibold text-ash transition-all duration-300 hover:bg-sunken hover:text-ink active:scale-[0.98] disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-full border border-hairline bg-white px-4 py-2 min-h-[44px] text-xs font-semibold text-ink transition-all duration-300 hover:bg-sunken active:scale-[0.98] disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CustomerListPage() {
  return (
    <Suspense fallback={null}>
      <CustomerListView />
    </Suspense>
  );
}
