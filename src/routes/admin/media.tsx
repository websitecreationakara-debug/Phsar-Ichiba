import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMedia, uploadMedia, deleteMedia, renameMedia } from "@/data/media";
import { compressImage } from "@/lib/image";
import { Upload, Trash2, Copy, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { withBase } from "@/lib/base-path";
import type { Media } from "@/lib/types";

export const Route = createFileRoute("/admin/media")({
  component: MediaAdmin,
});

function MediaAdmin() {
  const { data: items = [] } = useQuery({
    queryKey: ["media"],
    queryFn: () => listMedia() as Promise<Media[]>,
  });
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startRename = (m: Media) => {
    setEditing(m.id);
    setDraft(m.filename);
  };

  const saveRename = async (m: Media) => {
    const filename = draft.trim();
    setEditing(null);
    if (!filename || filename === m.filename) return;
    try {
      await renameMedia({ data: { id: m.id, filename } });
      qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", await compressImage(file));
        await uploadMedia({ data: fd });
      }
      toast.success(files.length > 1 ? `${files.length} images uploaded` : "Image uploaded");
      qc.invalidateQueries({ queryKey: ["media"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const del = async (m: Media) => {
    if (!confirm(`Delete ${m.filename}?`)) return;
    try {
      await deleteMedia({ data: { id: m.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["media"] });
  };

  const copy = (m: Media) => {
    navigator.clipboard.writeText(`${window.location.origin}${withBase(m.url)}`);
    toast.success("Full URL copied");
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Media</h1>
          <p className="mt-1 text-ink-soft">{items.length} files</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-700 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-leaf-200 p-16 text-center text-ink-soft">
          No media yet. Upload your first image.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-xl border border-leaf-100 bg-white">
              <div className="aspect-square bg-leaf-50">
                <img src={withBase(m.url)} alt={m.filename} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                {editing === m.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => saveRename(m)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(m);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="w-full rounded border border-leaf-200 px-1 py-0.5 text-xs text-ink outline-none focus:border-leaf-500"
                  />
                ) : (
                  <p className="truncate text-xs text-ink" title={m.filename}>
                    {m.filename}
                  </p>
                )}
                <p className="text-[10px] text-ink-soft">{(m.size / 1024).toFixed(0)} KB</p>
                <button
                  onClick={() => copy(m)}
                  title="Click to copy full URL"
                  className="mt-1 w-full truncate text-left font-mono text-[10px] text-ink-soft/80 hover:text-ink"
                >
                  {m.url}
                </button>
              </div>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => startRename(m)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink-soft shadow-sm hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => copy(m)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink-soft shadow-sm hover:bg-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => del(m)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-tomato-600 shadow-sm hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
