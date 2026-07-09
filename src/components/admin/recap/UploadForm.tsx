"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { FileDropzone } from "@/components/admin/recap/FileDropzone";

interface UploadFormProps {
  rawFile: File | null;
  rekapFile: File | null;
  threshold: string;
  overrides: string;
  tglPemeriksaan: string;
  pendidikan: string;
  onRawFile: (f: File) => void;
  onRekapFile: (f: File) => void;
  onThreshold: (v: string) => void;
  onOverrides: (v: string) => void;
  onTglPemeriksaan: (v: string) => void;
  onPendidikan: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  processing: boolean;
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

export function UploadForm({
  rawFile,
  rekapFile,
  threshold,
  overrides,
  tglPemeriksaan,
  pendidikan,
  onRawFile,
  onRekapFile,
  onThreshold,
  onOverrides,
  onTglPemeriksaan,
  onPendidikan,
  onSubmit,
  disabled,
  processing,
}: UploadFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Upload File</h2>
        <p className="mt-1 text-sm text-zinc-500">Rekap = sumber kebenaran nama &amp; kelas.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FileDropzone
            label="File RAW"
            hint="Data Google Forms (.xlsx)"
            file={rawFile}
            onChange={onRawFile}
          />
          <FileDropzone
            label="File Rekap"
            hint="Template Gugus (.xlsx)"
            file={rekapFile}
            onChange={onRekapFile}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Field Seragam</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Isi agar kolom TGL Pemeriksaan dan Pendidikan diseragamkan untuk semua siswa.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-900">
              Tanggal Pemeriksaan (DD/MM/YYYY)
            </label>
            <input
              className={inputClass}
              value={tglPemeriksaan}
              onChange={(e) => onTglPemeriksaan(e.target.value)}
              placeholder="31/03/2026"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-900">Pendidikan</label>
            <input
              className={inputClass}
              value={pendidikan}
              onChange={(e) => onPendidikan(e.target.value)}
              placeholder="SMAN 1 CIREBON"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          Pengaturan Lanjutan
          <span aria-hidden="true">{advancedOpen ? "▾" : "▸"}</span>
        </button>
        {advancedOpen && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-900">Match Threshold</label>
              <input
                type="number"
                min="0.5"
                max="1"
                step="0.01"
                className={inputClass}
                value={threshold}
                onChange={(e) => onThreshold(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-900">
                Manual Overrides (JSON)
              </label>
              <textarea
                className={`${inputClass} h-16 resize-y py-2 font-mono text-xs`}
                value={overrides}
                onChange={(e) => onOverrides(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play aria-hidden="true" size={16} />
        {processing ? "Memproses..." : "Proses Otomatis"}
      </button>
    </div>
  );
}
