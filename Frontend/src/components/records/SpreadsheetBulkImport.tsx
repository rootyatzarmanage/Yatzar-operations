import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

export type SpreadsheetImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "number" | "date" | "checkbox";
};

type Props = {
  label: string;
  fileName: string;
  fields: SpreadsheetImportField[];
  onImportRow: (row: Record<string, string | boolean>) => Promise<void>;
};

const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5";

function quoteCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const source = content.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && value.length === 0) quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted cell.");
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function downloadTemplate(fileName: string, fields: SpreadsheetImportField[]) {
  const headers = fields.map((field) => field.label + (field.required ? " (required)" : ""));
  const example = fields.map(() => "");
  const csv = `\uFEFF${[headers, example].map((cells) => cells.map(quoteCsv).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SpreadsheetBulkImport({ label, fileName, fields, onImportRow }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const importFile = async (file?: File) => {
    if (!file) return;
    setBusy(true); setMessage(""); setErrors([]);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Upload the completed CSV template. It opens and saves in Excel.");
      if (file.size > 5 * 1024 * 1024) throw new Error("The file must be 5 MB or smaller.");
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error("Add at least one record below the header row.");
      const headers = parsed[0].map((header) => header.trim().replace(/\s*\(required\)$/i, "").toLowerCase());
      if (new Set(headers).size !== headers.length) throw new Error("The sheet contains duplicate column headings.");
      const indexes = new Map(fields.map((field) => [field.label.toLowerCase(), headers.indexOf(field.label.toLowerCase())]));
      const missingColumns = fields.filter((field) => field.required && (indexes.get(field.label.toLowerCase()) ?? -1) < 0);
      if (missingColumns.length) throw new Error(`Required columns are missing: ${missingColumns.map((field) => field.label).join(", ")}. Download a fresh template.`);
      const dataRows = parsed.slice(1).filter((row) => row.some((cell) => cell.trim()));
      if (!dataRows.length) throw new Error("Add at least one record below the header row.");
      if (dataRows.length > 500) throw new Error("Upload up to 500 rows at a time.");
      let imported = 0;
      const rowErrors: string[] = [];
      for (const [index, cells] of dataRows.entries()) {
        const rowNumber = index + 2;
        const row: Record<string, string | boolean> = {};
        for (const field of fields) {
          const column = indexes.get(field.label.toLowerCase()) ?? -1;
          const cell = column >= 0 ? (cells[column] ?? "").trim() : "";
          if (field.required && !cell) rowErrors.push(`Row ${rowNumber}: ${field.label} is required.`);
          if (field.type === "email" && cell && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell)) rowErrors.push(`Row ${rowNumber}: enter a valid ${field.label.toLowerCase()}.`);
          if (field.type === "checkbox") row[field.key] = /^(true|yes|1)$/i.test(cell);
          else row[field.key] = cell;
        }
        if (rowErrors.some((error) => error.startsWith(`Row ${rowNumber}:`))) continue;
        try { await onImportRow(row); imported += 1; }
        catch (error) { rowErrors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Could not import this record."}`); }
      }
      setErrors(rowErrors);
      setMessage(`${imported} ${label.toLowerCase()}${imported === 1 ? "" : "s"} imported${rowErrors.length ? `; ${rowErrors.length} row${rowErrors.length === 1 ? "" : "s"} need attention.` : " successfully."}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read this spreadsheet.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={busy} onClick={() => downloadTemplate(fileName, fields)} className={secondaryButton}>
      <Download size={16} /> Download Excel template
    </button>
    <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={secondaryButton}>
      <Upload size={16} /> {busy ? "Importing…" : `Upload ${label} CSV`}
    </button>
    <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" aria-label={`Upload ${label} spreadsheet`} onChange={(event) => void importFile(event.target.files?.[0])} />
    <span className="basis-full text-xs text-gray-500 dark:text-gray-400">Fill in the downloaded CSV in Excel, then upload it here. Required columns are marked.</span>
    {message && <div className="basis-full text-sm text-gray-600 dark:text-gray-400" role={errors.length ? "alert" : "status"}>{message}{errors.length > 0 && <ul className="mt-1 list-inside list-disc">{errors.slice(0, 8).map((error) => <li key={error}>{error}</li>)}{errors.length > 8 && <li>And {errors.length - 8} more row errors.</li>}</ul>}</div>}
    <span className="sr-only">CSV format opens in Microsoft Excel and other spreadsheet apps.</span>
  </div>;
}
