"use client";

import { useState } from "react";
import { Plus, Trash, FloppyDisk, Tag } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { CustomerAlias } from "@/types";

interface CustomerAliasesEditorProps {
  /** Daftar alias yang sudah ada untuk customer ini */
  aliases: CustomerAlias[];
  /** Branch aktif user yang login — dipakai sebagai default branch alias baru */
  currentBranch?: string;
  /** Dipanggil saat user menekan "Simpan Aliases" dengan daftar alias terbaru */
  onSave: (aliases: CustomerAlias[]) => Promise<void>;
  /** Opsional: status loading dari parent untuk disable tombol */
  disabled?: boolean;
}

/**
 * CustomerAliasesEditor
 *
 * Komponen UI untuk melihat, menambah, dan menghapus alias customer.
 * Setiap alias merekam nama, branch, dan timestamp kapan pertama/terakhir terlihat.
 *
 * Cara pakai di halaman detail customer:
 *   <CustomerAliasesEditor
 *     aliases={customer.aliases ?? []}
 *     currentBranch={session?.branch}
 *     onSave={handleSaveAliases}
 *   />
 */
export function CustomerAliasesEditor({
  aliases: initialAliases,
  currentBranch = "",
  onSave,
  disabled = false,
}: CustomerAliasesEditorProps) {
  const [aliases, setAliases] = useState<CustomerAlias[]>(initialAliases);
  const [newName, setNewName] = useState("");
  const [newBranch, setNewBranch] = useState(currentBranch);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setAddError("Nama alias tidak boleh kosong.");
      return;
    }
    const alreadyExists = aliases.some(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadyExists) {
      setAddError("Alias dengan nama ini sudah ada.");
      return;
    }

    const now = new Date().toISOString();
    const newAlias: CustomerAlias = {
      name: trimmed,
      branch: newBranch.trim() || "-",
      first_seen_at: now,
      last_seen_at: now,
    };

    setAliases((prev) => [...prev, newAlias]);
    setNewName("");
    setAddError(null);
  };

  const handleRemove = (index: number) => {
    setAliases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(aliases);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Tag size={15} weight="duotone" className="text-accent" />
        <Label className="text-xs font-semibold uppercase tracking-wider text-ash">
          Nama Alias / Cadangan
        </Label>
        <Badge variant="secondary" className="text-[10px]">
          {aliases.length} alias
        </Badge>
      </div>

      {/* Daftar Alias */}
      {aliases.length > 0 ? (
        <ul className="space-y-2">
          {aliases.map((alias, idx) => (
            <li
              key={`${alias.name}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-sunken px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {alias.name}
                </p>
                <p className="text-[10px] text-mist">
                  Cabang: {alias.branch || "—"} &middot; Pertama:{" "}
                  {alias.first_seen_at
                    ? new Date(alias.first_seen_at).toLocaleDateString("id-ID")
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                disabled={disabled || saving}
                aria-label={`Hapus alias ${alias.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mist transition-colors hover:bg-rose/10 hover:text-rose active:scale-95 disabled:opacity-40"
              >
                <Trash size={15} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-hairline px-4 py-5 text-center text-xs text-mist">
          Belum ada alias. Tambahkan nama lain yang dikenal untuk pelanggan ini.
        </p>
      )}

      {/* Form Tambah Alias */}
      <div className="rounded-2xl border border-hairline bg-white p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ash">
          Tambah Alias Baru
        </p>

        {addError && (
          <p className="rounded-xl bg-rose/10 px-3 py-2 text-xs text-rose">
            {addError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input
            type="text"
            placeholder="Nama alias (contoh: Budi, Pak Budi, Budi Santoso)"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            disabled={disabled || saving}
            className="h-10 rounded-xl text-sm"
          />
          <Input
            type="text"
            placeholder="Cabang"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            disabled={disabled || saving}
            className="h-10 w-full sm:w-28 rounded-xl text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled || saving || !newName.trim()}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-accent/30 bg-accent/5 px-4 text-xs font-semibold text-accent transition-all hover:bg-accent/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} weight="bold" />
            Tambah
          </button>
        </div>
      </div>

      {/* Tombol Simpan */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={disabled || saving}
          className="rounded-full"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <FloppyDisk size={15} weight="bold" className="mr-2" />
              Simpan Aliases
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
