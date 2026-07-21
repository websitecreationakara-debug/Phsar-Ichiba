import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { restoreDatabase } from "@/data/restore";
import { ShieldAlert, UploadCloud, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/restore")({ component: RestorePage });

const CONFIRM_WORD = "RESTORE";

function RestorePage() {
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !!file && confirmText === CONFIRM_WORD && !running;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setRunning(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("confirm", confirmText);
      const res = await restoreDatabase({ data: fd });
      const msg = `Restore complete: ${res.statementsRun} statements executed${
        res.failed ? `, ${res.failed} failed` : ""
      } from ${res.fileName}.`;
      setResult(msg);
      toast.success("Database restored");
      setFile(null);
      setConfirmText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      setResult(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Restore Database from Backup</h1>

      <div className="flex gap-3 rounded-2xl border border-tomato-200 bg-tomato-50 p-4">
        <ShieldAlert className="h-5 w-5 shrink-0 text-tomato-600" />
        <p className="text-sm text-tomato-900">
          This <strong>overwrites the live production database</strong> with the uploaded backup. Any
          orders or changes made after that backup was taken will be permanently lost. This cannot be
          undone. Download the backup file from Google Drive first, then upload it below.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Backup file (.sql)</label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragActive
                ? "border-leaf-500 bg-leaf-50"
                : "border-leaf-200 bg-leaf-50/40 hover:border-leaf-400 hover:bg-leaf-50",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {file ? (
              <>
                <FileCode2 className="h-8 w-8 text-leaf-600" />
                <p className="text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-ink-soft">
                  {(file.size / 1024 / 1024).toFixed(2)} MB — click or drop to replace
                </p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-leaf-500" />
                <p className="text-sm font-medium text-ink">Click to choose a file, or drag and drop it here</p>
                <p className="text-xs text-ink-soft">.sql backup file downloaded from Google Drive</p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">
            Type <code className="rounded bg-leaf-50 px-1.5 py-0.5">{CONFIRM_WORD}</code> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-tomato-600 py-2.5 text-sm font-semibold text-white hover:bg-tomato-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? "Restoring…" : "Restore Database"}
        </button>
      </form>

      {result && <p className="text-sm text-ink-soft">{result}</p>}
    </div>
  );
}
