"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  UserPlus,
  ArrowRight,
  FloppyDisk,
  ArrowCounterClockwise,
  Phone,
  Basket,
  ShoppingBag,
  ClockCounterClockwise,
  ArrowSquareOut,
  Warning,
} from "@phosphor-icons/react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  resolveCustomer,
  getCustomersWithStats,
} from "@/services/customerService";
import { createOrder } from "@/services/orderService";
import { getRetentionStatus, getRetentionLabel } from "@/utils/churnStatus";
import { DEFAULT_THRESHOLDS } from "@/constants";
import { FLUID_EASE } from "@/lib/motion";
import { useMounted } from "@/lib/useMounted";
import { getSessionUser } from "@/utils/session";
import type { ChannelType, CustomerWithStats } from "@/types";

const CHANNELS = [
  { id: "dine_in" as ChannelType, label: "Dine-in" },
  { id: "takeaway" as ChannelType, label: "Takeaway" },
  { id: "gofood" as ChannelType, label: "Gofood" },
  { id: "grab" as ChannelType, label: "Grab" },
  { id: "shopee" as ChannelType, label: "Shopee" },
  { id: "whatsapp" as ChannelType, label: "WhatsApp" },
  { id: "custom" as ChannelType, label: "Lainnya" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: FLUID_EASE } },
};

export default function InputOrderPage() {
  const ready = useMounted();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [preloadedCustomers, setPreloadedCustomers] = useState<
    CustomerWithStats[]
  >([]);
  const [preloading, setPreloading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [channel, setChannel] = useState<ChannelType>("takeaway");
  const [customChannel, setCustomChannel] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBranch, setUserBranch] = useState("");

  // Alias dialog state
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [aliasName, setAliasName] = useState("");

  useEffect(() => {
    setUserBranch(getSessionUser()?.branch || "");
  }, []);

  // Preload all customers on mount
  useEffect(() => {
    async function preload() {
      try {
        const res = await getCustomersWithStats(0, 1000);
        const withStatus = res.data.map((c) => ({
          ...c,
          retention_status: getRetentionStatus(
            c.last_order_date,
            DEFAULT_THRESHOLDS,
          ),
        }));
        setPreloadedCustomers(withStatus);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat daftar customer",
        );
      } finally {
        setPreloading(false);
      }
    }
    preload();
  }, []);

  // Local filtering (instant, no network)
  const filteredCustomers = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const qNoZero = q.startsWith("0") ? q.slice(1) : q;

    return preloadedCustomers
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const phone = c.phone_normalized || "";
        const phoneMatch = phone.includes(q) || phone.includes(qNoZero);
        return nameMatch || phoneMatch;
      })
      .slice(0, 8);
  }, [query, preloadedCustomers]);

  const isPhone = (val: string) => /^\d{8,15}$/.test(val.replace(/\D/g, ""));

  const handleSelectCustomer = (customer: CustomerWithStats) => {
    const status = getRetentionStatus(
      customer.last_order_date,
      DEFAULT_THRESHOLDS,
    );
    setSelectedCustomer({ ...customer, retention_status: status });
    setIsCreatingNew(false);
    setQuery(`${customer.name} (${customer.phone_normalized})`);
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedCustomer(null);
    if (isPhone(query)) {
      setNewPhone(query);
      setNewName("");
    } else {
      setNewName(query);
      setNewPhone("");
    }
  };

  const handleReset = () => {
    setQuery("");
    setSelectedCustomer(null);
    setIsCreatingNew(false);
    setNewName("");
    setNewPhone("");
    setChannel("takeaway");
    setCustomChannel("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setError(null);
    setAliasName("");
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let customerId = selectedCustomer?.id;
      if (!customerId) {
        if (!newName.trim()) {
          setError("Nama customer wajib diisi");
          setLoading(false);
          return;
        }
        if (!newPhone.trim()) {
          setError("Nomor WhatsApp wajib diisi");
          setLoading(false);
          return;
        }
        const resolved = await resolveCustomer(
          newPhone,
          newName.trim(),
          orderDate,
          userBranch,
        );
        customerId = resolved.customer_id;
      }

      await createOrder({
        customer_id: customerId!,
        order_date: orderDate,
        channel: channel === "custom" ? "custom" : channel,
        raw_phone_input: newPhone || selectedCustomer?.phone_normalized || "",
        branch: userBranch,
        alias_name: aliasName.trim() || undefined,
      });

      toast.success("Order tersimpan", {
        description: `${selectedCustomer?.name || newName} ${CHANNELS.find((c) => c.id === channel)?.label || channel}`,
      });
      setTimeout(() => handleReset(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan order");
    } finally {
      setLoading(false);
    }
  };

  const showDropdown = !selectedCustomer && !isCreatingNew && query.length >= 2;
  const canSubmit =
    (selectedCustomer ||
      (isCreatingNew && newName.trim() && newPhone.trim())) &&
    !loading;

  const getStatusBadge = (status?: string) => {
    if (status === "active")
      return (
        <Badge className="bg-emerald/10 text-emerald border-emerald/20">
          Active
        </Badge>
      );
    if (status === "at_risk")
      return (
        <Badge className="bg-amber/10 text-[#022D4E]-deep border-amber/20">
          At Risk
        </Badge>
      );
    return (
      <Badge className="bg-rose/10 text-ink border-rose/20">Churned</Badge>
    );
  };

  const daysSinceLastOrder = selectedCustomer
    ? Math.floor(
        (Date.now() - new Date(selectedCustomer.last_order_date).getTime()) /
          86400000,
      )
    : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 md:py-10 pb-36 md:pb-32">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: FLUID_EASE }}
          className="mb-6 rounded-2xl border border-rose/20 bg-rose/10 p-3.5 text-sm text-ink"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={ready ? "show" : "hidden"}
        className="mb-6"
      >
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#022D4E]">
          Rekam Transaksi
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
          Input Order Baru
        </h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">
          Cari pelanggan atau daftarkan pelanggan baru
        </p>
      </motion.div>

      {/* Command search */}
      <div className="doppel-outer">
        <div className="doppel-inner p-4 sm:p-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={ready ? "show" : "hidden"}
          >
            <Command
              className="rounded-2xl border border-hairline bg-white overflow-visible"
              shouldFilter={false}
            >
              <div className="relative">
                <CommandInput
                  ref={inputRef as any}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={
                    preloading
                      ? "Memuat data pelanggan..."
                      : "Ketik nama atau nomor HP..."
                  }
                  className="h-12 text-sm sm:h-13 sm:text-base border-0 focus:ring-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full text-ash transition-colors duration-300 hover:bg-sunken hover:text-ink z-10"
                  >
                    <X size={18} weight="bold" />
                  </button>
                )}
              </div>

              {showDropdown && (
                <CommandList className="max-h-80">
                  {filteredCustomers.length === 0 && !preloading ? (
                    <CommandEmpty>
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="text-sm text-ash">
                          {query.length < 2
                            ? "Ketik minimal 2 karakter"
                            : "Tidak ditemukan"}
                        </div>
                        {query.length >= 2 && (
                          <button
                            type="button"
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 rounded-full  bg-[#022D4E]-wash px-4 py-2 text-sm font-medium text-[#022D4E]-deep transition-colors hover: bg-[#022D4E]/20"
                          >
                            <UserPlus size={16} weight="duotone" />
                            Buat Pelanggan Baru
                          </button>
                        )}
                      </div>
                    </CommandEmpty>
                  ) : (
                    <CommandGroup heading="Pelanggan Ditemukan">
                      {filteredCustomers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.phone_normalized}`}
                          onSelect={() => handleSelectCustomer(c)}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl  bg-[#022D4E]-wash text-xs font-semibold text-[#022D4E]-deep">
                              {c.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 truncate text-sm font-medium text-ink">
                                  {c.name}
                                </span>
                                {getStatusBadge(c.retention_status)}
                              </div>
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className="flex min-w-0 items-center gap-1 font-mono text-xs text-ash">
                                  <Phone size={11} />
                                  <span className="truncate">{c.phone_normalized}</span>
                                </span>
                                <span className="shrink-0 rounded-full bg-[#022D4E]-wash px-2 py-0.5 text-[10px] font-semibold text-[#022D4E]-deep">
                                  Order ke-{(c.order_count || 0) + 1}
                                </span>
                              </div>
                              <div className="truncate text-xs text-ash">
                                {c.orders && c.orders.length > 0
                                  ? `Terakhir: ${c.orders[0].channel} • ${c.last_order_date}`
                                  : `Pertama: ${c.first_order_date}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={`/app/customers/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-1 text-xs font-medium text-ash transition-colors hover:bg-sunken hover:text-ink"
                              title="Lihat Profil Lengkap"
                            >
                              <ArrowSquareOut size={13} weight="bold" />
                              <span className="hidden sm:inline">Profil</span>
                            </Link>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink ring-1 ring-ink/10 transition-transform group-hover:scale-105">
                              <Check size={14} weight="bold" />
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {!preloading &&
                    query.length >= 2 &&
                    filteredCustomers.length > 0 && (
                      <div className="border-t border-hairline p-2">
                        <button
                          type="button"
                          onClick={handleCreateNew}
                          className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors duration-200 hover:bg-sunken"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-[#022D4E]">
                            <UserPlus size={18} weight="duotone" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-ink">
                              Buat Pelanggan Baru
                            </div>
                            <div className="text-xs text-ash">
                              {isPhone(query)
                                ? `Nomor ${query}`
                                : `Nama "${query}"`}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                </CommandList>
              )}
            </Command>
          </motion.div>
        </div>
      </div>

      {/* Selected customer Rich Profile Card */}
      <AnimatePresence>
        {selectedCustomer && !isCreatingNew && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: FLUID_EASE }}
            className="mt-4"
          >
            <div className="doppel-outer">
              <div className="doppel-inner p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl  bg-[#022D4E]-wash text-sm font-semibold text-[#022D4E]-deep">
                      {selectedCustomer.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
                          {selectedCustomer.name}
                        </h2>
                        {getStatusBadge(selectedCustomer.retention_status)}
                      </div>
                      <a
                        href={`tel:${selectedCustomer.phone_normalized}`}
                        className="mt-1 flex items-center gap-1 font-mono text-xs text-ash hover:text-[#022D4E]"
                      >
                        <Phone size={12} weight="bold" />
                        {selectedCustomer.phone_normalized}
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-colors hover:bg-sunken hover:text-ink"
                    title="Ganti Pelanggan"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                {/* Sub Stats Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-hairline pt-4">
                  <div className="rounded-2xl border border-hairline bg-white p-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ash">
                      <span>Total Order</span>
                      <ShoppingBag
                        size={14}
                        weight="duotone"
                        className="text-[#022D4E]"
                      />
                    </div>
                    <div className="mt-1 text-base font-semibold text-ink sm:text-lg">
                      {selectedCustomer.order_count}x{" "}
                      <span className="text-xs font-normal text-ash">
                        order
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-hairline bg-white p-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ash">
                      <span>Order Terakhir</span>
                      <ClockCounterClockwise
                        size={14}
                        weight="duotone"
                        className="text-[#022D4E]"
                      />
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold text-ink sm:text-sm">
                      {daysSinceLastOrder === 0
                        ? "Hari ini"
                        : `${daysSinceLastOrder} hari lalu`}
                    </div>
                  </div>
                </div>

                {/* Alias note button */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAliasDialogOpen(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hairline bg-white px-3 text-xs text-ash transition-colors hover:border-accent/30 hover:bg-sunken hover:text-[#022D4E]"
                  >
                    <Warning size={14} weight="duotone" />
                    Tambahkan alias customer
                  </button>
                  <Link
                    href={`/app/customers/${selectedCustomer.id}`}
                    className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#022D4E] hover:text-[#022D4E]-deep"
                  >
                    <span>Detail Profil</span>
                    <ArrowSquareOut
                      size={14}
                      weight="bold"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New customer form */}
      <AnimatePresence>
        {isCreatingNew && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: FLUID_EASE }}
            className="mt-4"
          >
            <div className="doppel-outer">
              <div className="doppel-inner p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus
                      size={18}
                      weight="duotone"
                      className="text-[#022D4E]"
                    />
                    <span className="text-base font-semibold text-ink">
                      Pelanggan Baru
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ash transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">
                      Nama *
                    </Label>
                    <Input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">
                      No. WhatsApp *
                    </Label>
                    <Input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="h-11 rounded-2xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel & date */}
      {(selectedCustomer || isCreatingNew) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: FLUID_EASE }}
          className="mt-4 grid grid-cols-1 gap-4"
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-4 sm:p-5">
              <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-ash">
                Channel Order *
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id)}
                    className={`min-h-[44px] rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300 active:scale-[0.96] ${
                      channel === ch.id
                        ? "bg-white text-ink ring-1 ring-ink/10 shadow-[0_6px_16px_-6px_rgba(28,43,66,0.5)]"
                        : "border border-hairline bg-white text-ash hover:bg-sunken hover:text-ink"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              {channel === "custom" && (
                <Input
                  type="text"
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value)}
                  placeholder="Sebutkan channel..."
                  className="mt-3 h-11 rounded-2xl"
                />
              )}
            </div>
          </div>

          <div className="doppel-outer">
            <div className="doppel-inner p-4 sm:p-5">
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ash">
                Tanggal Transaksi
              </Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Fixed bottom CTA */}
      {selectedCustomer || isCreatingNew ? (
        <div className="fixed inset-x-0 bottom-20 md:bottom-0 z-30 md:left-64">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="doppel-outer rounded-[1.75rem]">
              <div className="doppel-inner flex items-center gap-2.5 rounded-[calc(1.75rem-0.375rem)] p-2.5 sm:p-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="group flex min-h-[48px] h-12 sm:h-13 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#022D4E] text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
                  style={{ boxShadow: "0 8px 24px -8px rgba(28, 43, 66, 0.5)" }}
                >
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <FloppyDisk size={18} weight="bold" />
                      <span>Simpan Order</span>
                      <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0.5">
                        <ArrowRight size={15} weight="bold" />
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex min-h-[48px] h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full border border-hairline bg-white text-ash transition-all duration-500 hover:bg-sunken hover:text-ink active:scale-[0.96]"
                  title="Batal / Reset"
                >
                  <ArrowCounterClockwise size={18} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-mist"
        >
          <Basket size={16} weight="duotone" className="text-[#022D4E]" />
          Pilih atau buat pelanggan untuk melanjutkan
        </motion.p>
      )}

      {/* Alias Dialog */}
      <Dialog open={aliasDialogOpen} onOpenChange={setAliasDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Alias Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-ash">
              Masukkan nama lain yang digunakan customer saat order.
            </p>
            <Input
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="Contoh: Sinta"
              className="rounded-2xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAliasDialogOpen(false)}
              className="rounded-full"
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (aliasName.trim()) {
                  toast.success("Alias akan disimpan bersama order");
                }
                setAliasDialogOpen(false);
              }}
              className="rounded-full"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
