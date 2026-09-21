"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FloppyDisk,
  Info,
  Gear,
  Storefront,
  WhatsappLogo,
  Check,
  CloudCheck,
  DownloadSimple,
  UploadSimple,
  FileCsv,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import {
  syncSettingsFromSheets,
  saveAppSettings,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
} from "@/services/settingsService";
import { clearSheetsCache } from "@/services/sheetsService";
import {
  parseCsv,
  mapCsvToRows,
  downloadImportTemplate,
  type ImportCustomerRow,
  type MappedCsv,
} from "@/utils/csvImport";
import { fadeUp } from "@/lib/motion";
import { useMounted } from "@/lib/useMounted";
import { getSessionUser } from "@/utils/session";
import { isManagerRole } from "@/services/adminService";

export default function SettingsPage() {
  const ready = useMounted();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);
  const [canImport, setCanImport] = useState(false);
  const [canEditSettings, setCanEditSettings] = useState(false);

  // Import customer state
  const [importFile, setImportFile] = useState<{
    name: string;
    mapped: MappedCsv;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getSessionUser();
    const manager = Boolean(user && isManagerRole(user.role));
    setCanImport(manager);
    setCanEditSettings(manager);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await syncSettingsFromSheets();
      setSettings(s);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEditSettings) return;
    setSaving(true);
    try {
      await saveAppSettings(settings);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!canEditSettings) return;
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await fetch("/api/orders/recalculate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRecalcResult(
          `Selesai. ${data.total_orders} orders, ${data.updated} customer diperbarui.`,
        );
      } else {
        setRecalcResult(`Gagal: ${data.error}`);
      }
    } catch {
      setRecalcResult("Gagal menghubungi server");
    } finally {
      setRecalculating(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const mapped = mapCsvToRows(parseCsv(text));
      setImportFile({ name: file.name, mapped });
    } catch {
      setImportFile({
        name: file.name,
        mapped: { data: [], errors: ["Gagal membaca file CSV."] },
      });
    }
    setImportResult(null);
  };

  const parseErrors = importFile ? importFile.mapped.errors : [];

  const handleRunImport = async () => {
    if (!importFile || importFile.mapped.data.length === 0 || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/sheets/import-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importFile.mapped.data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Import gagal");

      setImportResult({
        imported: result.imported as number,
        skipped: result.skipped as number,
        errors: [...parseErrors, ...((result.errors as string[]) || [])],
      });

      clearSheetsCache("customers");
      toast.success(
        result.imported > 0
          ? `${result.imported} customer berhasil diimport`
          : "Tidak ada customer baru yang diimport",
      );
    } catch (err) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : "Import gagal"],
      });
      toast.error(err instanceof Error ? err.message : "Import gagal");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10 pb-28 md:pb-20">
      {/* Toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-[#022D4E] shadow-xl shadow-emerald/30"
          >
            <Check size={18} weight="bold" /> Pengaturan Berhasil Disimpan!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heading */}
      <motion.div
        variants={fadeUp}
        custom={0}
        initial="hidden"
        animate={ready ? "show" : "hidden"}
        className="mb-8"
      >
        <Badge className="h-auto rounded-full border-hairline bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#022D4E]">
          Preferensi
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
          Pengaturan Aplikasi
        </h1>
        <p className="mt-1.5 text-xs text-ash sm:text-sm">
          Kustomisasi identitas toko, ambang retensi, dan template WhatsApp
          (tersimpan di cloud)
        </p>
      </motion.div>

      <div className="space-y-5">
        {/* Store Profile */}
        <motion.div
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl  bg-[#022D4E]-wash text-[#022D4E]">
                  <Storefront size={20} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Identitas Cabang / Toko
                  </h2>
                  <p className="mt-0.5 text-xs text-ash">
                    Nama toko yang akan tampil pada sidebar dan template WA
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash">
                  Nama Cabang / Outlet
                </Label>
                <Input
                  value={settings.storeName}
                  onChange={(e) =>
                    setSettings({ ...settings, storeName: e.target.value })
                  }
                  disabled={!canEditSettings}
                  placeholder="Misal: Cabang Senopati / Outlet Sudirman"
                  className="h-12 text-sm font-medium disabled:cursor-not-allowed disabled:bg-sunken/60 disabled:text-ash"
                />
                {!canEditSettings && (
                  <p className="mt-2 text-xs text-ash">
                    Nama toko ditetapkan oleh Admin dan tidak dapat diubah oleh
                    user.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Retention Threshold */}
        <motion.div
          variants={fadeUp}
          custom={2}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl  bg-[#022D4E]-wash text-[#022D4E]">
                  <Gear size={20} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Threshold Retensi (Status Churn)
                  </h2>
                  <p className="mt-0.5 text-xs text-ash">
                    Atur batas hari tanpa order untuk mengklasifikasikan status
                    customer
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash">
                    Batas Active (Hari)
                  </Label>
                  <Input
                    type="number"
                    value={settings.activeDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        activeDays: Number(e.target.value) || 30,
                      })
                    }
                    disabled={!canEditSettings}
                    className="h-11 bg-sunken/50 font-semibold"
                  />
                  <p className="mt-1.5 text-[11px] text-ash">
                    0 &ndash; {settings.activeDays} hari ={" "}
                    <strong className="text-emerald">Active</strong>
                  </p>
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash">
                    Batas At Risk (Hari)
                  </Label>
                  <Input
                    type="number"
                    value={settings.atRiskDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        atRiskDays: Number(e.target.value) || 60,
                      })
                    }
                    disabled={!canEditSettings}
                    className="h-11 bg-sunken/50 font-semibold"
                  />
                  <p className="mt-1.5 text-[11px] text-ash">
                    {settings.activeDays + 1} &ndash; {settings.atRiskDays} hari
                    = <strong className="text-[#022D4E]-deep">At Risk</strong>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-3.5">
                <Info
                  size={18}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-[#022D4E]-deep"
                />
                <p className="text-xs leading-relaxed text-ash">
                  Customer yang tidak melakukan transaksi lebih dari{" "}
                  <strong>{settings.atRiskDays} hari</strong> akan otomatis
                  dimasukkan ke status{" "}
                  <strong className="text-ink">Churned</strong> di seluruh
                  dashboard & laporan.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {canImport && (
        /* Import Data Customer */
        <motion.div
          variants={fadeUp}
          custom={3}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl  bg-[#022D4E]-wash text-[#022D4E]">
                  <UploadSimple size={20} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Import Data Customer
                  </h2>
                  <p className="mt-0.5 text-xs text-ash">
                    Tambah customer secara massal dari file CSV. Nomor WhatsApp
                    yang sudah terdaftar akan dilewati (duplikat)
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-hairline bg-sunken/40 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">
                    Template Import (.csv)
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ash">
                    Kolom: Nama, No WhatsApp, Cabang (CMH/BDG), Gender (L/P),
                    Rentang Usia, Tanggal Order Pertama, Catatan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadImportTemplate}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-ink/10 transition-all hover:bg-ink/5 active:scale-95"
                >
                  <DownloadSimple
                    size={14}
                    weight="bold"
                    className="text-[#022D4E]"
                  />
                  Download Template
                </button>
              </div>

              <div className="mt-4">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ash">
                  File CSV
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-muted/20 px-4 py-6 text-center transition-colors",
                    importFile
                      ? "border-accent/50  bg-[#022D4E]/5"
                      : "border-hairline hover:border-accent/40 hover: bg-[#022D4E]/5",
                  )}
                >
                  {importFile ? (
                    <>
                      <FileCsv
                        size={24}
                        weight="duotone"
                        className="text-[#022D4E]"
                      />
                      <span className="text-xs font-semibold text-ink">
                        {importFile.name}
                      </span>
                      <span className="text-[11px] text-ash">
                        {importFile.mapped.data.length} baris data siap diimport
                        &middot; klik untuk ganti file
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadSimple
                        size={24}
                        weight="duotone"
                        className="text-mist"
                      />
                      <span className="text-xs font-semibold text-ink">
                        Klik untuk pilih file CSV
                      </span>
                      <span className="text-[11px] text-ash">
                        .csv - template yang sudah diisi atau hasil export dari
                        Daftar Customer
                      </span>
                    </>
                  )}
                </button>
              </div>

              {parseErrors.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber/30 bg-amber/5 p-3 text-[11px] leading-relaxed text-[#022D4E]-deep">
                  {parseErrors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}

              {importResult && (
                <div
                  className={cn(
                    "mt-4 rounded-2xl border p-3 text-[11px] leading-relaxed",
                    importResult.errors.length > 0
                      ? "border-amber/30 bg-amber/5 text-[#022D4E]-deep"
                      : "border-emerald/30 bg-emerald/5 text-emerald",
                  )}
                >
                  <p className="text-xs font-semibold">
                    Import selesai: {importResult.imported} diimport,{" "}
                    {importResult.skipped} dilewati (duplikat).
                  </p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="mt-1">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleRunImport}
                disabled={
                  !importFile ||
                  importFile.mapped.data.length === 0 ||
                  importing
                }
                className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#022D4E] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <UploadSimple size={15} weight="bold" />
                    Import{" "}
                    {importFile && importFile.mapped.data.length > 0
                      ? importFile.mapped.data.length
                      : 0}{" "}
                    Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
        )}

        {/* WhatsApp Message Template */}
        <motion.div
          variants={fadeUp}
          custom={4}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <div className="doppel-outer">
            <div className="doppel-inner p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
                  <WhatsappLogo size={20} weight="fill" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    Template Pesan WhatsApp Follow-up
                  </h2>
                  <p className="mt-0.5 text-xs text-ash">
                    Variabel yang didukung:{" "}
                    <code className="text-[#022D4E] font-semibold">
                      {"{nama}"}
                    </code>{" "}
                    dan{" "}
                    <code className="text-[#022D4E] font-semibold">
                      {"{toko}"}
                    </code>
                  </p>
                </div>
              </div>

              <Textarea
                value={settings.waTemplate}
                onChange={(e) =>
                  setSettings({ ...settings, waTemplate: e.target.value })
                }
                disabled={!canEditSettings}
                rows={3}
                className="resize-none text-sm leading-relaxed disabled:cursor-not-allowed disabled:bg-sunken/60"
              />

              <div className="mt-3 rounded-2xl border border-hairline bg-sunken/40 p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Preview Hasil Chat WA
                </p>
                <p className="text-xs leading-relaxed text-ink font-medium">
                  {settings.waTemplate
                    .replace("{nama}", "Budi Santoso")
                    .replace("{toko}", settings.storeName)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Info about sync */}
        <motion.div
          variants={fadeUp}
          custom={5}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <div className="rounded-2xl border border-accent/20  bg-[#022D4E]/5 p-4">
            <p className="flex items-start gap-2 text-xs text-ash">
              <CloudCheck
                size={16}
                weight="duotone"
                className="mt-0.5 shrink-0 text-[#022D4E]"
              />
              <span>
                <strong className="text-[#022D4E]">Tersimpan di Cloud</strong>{" "}
                Pengaturan ini disimpan di Google Sheets dan akan sync ke semua
                perangkat yang login dengan akun yang sama.
              </span>
            </p>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          variants={fadeUp}
          custom={6}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
          <button
            onClick={handleSave}
            disabled={saving || !canEditSettings}
            className="group flex min-h-[50px] h-13 w-full items-center justify-center gap-3 rounded-full bg-[#022D4E] text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-px active:scale-[0.98] disabled:opacity-50"
            style={{ boxShadow: "0 8px 24px -8px rgba(28, 43, 66, 0.5)" }}
          >
            {saving ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <FloppyDisk size={18} weight="bold" />
                <span>Simpan Semua Pengaturan</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Hidden Recalculate (admin tool) */}
        <motion.div
          variants={fadeUp}
          custom={7}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
          className="mt-8 border-t border-hairline pt-4"
        >
          <button
            onClick={handleRecalculate}
            disabled={recalculating || !canEditSettings}
            className="text-[11px] text-ash hover:text-ink transition-colors"
          >
            {recalculating
              ? "Menghitung ulang order_count..."
              : "Recalculate order_count"}
          </button>
          {recalcResult && (
            <p className="mt-1 text-[11px] text-ash">{recalcResult}</p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
