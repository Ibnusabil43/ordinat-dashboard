"use client";

import { FileCheck2, FileUp } from "lucide-react";
import { clsx } from "clsx";

export function FileDropzone({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File) => void;
}) {
  return (
    <label
      className={clsx(
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition",
        file ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 hover:border-zinc-400",
      )}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => {
          if (e.target.files?.[0]) onChange(e.target.files[0]);
        }}
      />
      {file ? (
        <FileCheck2 aria-hidden="true" size={22} className="text-zinc-900" />
      ) : (
        <FileUp aria-hidden="true" size={22} className="text-zinc-400" />
      )}
      <div className="text-sm font-medium text-zinc-900">{label}</div>
      <div className="text-xs text-zinc-500">{hint}</div>
      {file && <div className="text-xs font-medium text-zinc-900">{file.name}</div>}
    </label>
  );
}
