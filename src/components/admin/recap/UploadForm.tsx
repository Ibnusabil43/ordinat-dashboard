"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { clsx } from "clsx";
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
  /** FE-N1 — no event picked yet means nothing for Tanggal Pemeriksaan/Pendidikan to default from, so the whole form is locked until one is. */
  formDisabled?: boolean;
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
  formDisabled = false,
}: UploadFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <fieldset
      disabled={formDisabled}
      className={clsx("m-0 flex flex-col gap-6 border-0 p-0", formDisabled && "opacity-50")}
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Upload Files</h2>
        <p className="mt-1 text-sm text-zinc-500">Recap = the source of truth for names &amp; classes.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FileDropzone
            label="RAW File"
            hint="Google Forms data (.xlsx)"
            file={rawFile}
            onChange={onRawFile}
          />
          <FileDropzone
            label="Recap File"
            hint="Gugus template (.xlsx)"
            file={rekapFile}
            onChange={onRekapFile}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Uniform Fields</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Fill in so the Test Date and Education columns are the same for every student.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-900">
              Test Date (DD/MM/YYYY)
            </label>
            <input
              className={inputClass}
              value={tglPemeriksaan}
              onChange={(e) => onTglPemeriksaan(e.target.value)}
              placeholder="31/03/2026"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-900">Education</label>
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
          Advanced Settings
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
        {processing ? "Processing..." : "Auto Process"}
      </button>
    </fieldset>
  );
}
