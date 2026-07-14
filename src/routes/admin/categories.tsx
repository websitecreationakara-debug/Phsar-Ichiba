import { createFileRoute } from "@tanstack/react-router";
import { useCategories } from "@/hooks/use-products";
import { createCategory, updateCategory, deleteCategory } from "@/data/categories";
import { listMedia, uploadMedia } from "@/data/media";
import { compressImage } from "@/lib/image";
import { slugify, cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/admin/modal";
import { Fragment, useRef, useState } from "react";
import { Trash2, Upload, ImageIcon, Loader2, X, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import type { Category, Media } from "@/lib/types";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesAdmin });

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";

function BtnOutline({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-leaf-200 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-leaf-50 disabled:opacity-60",
        className,
      )}
    />
  );
}
function BtnIcon({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-leaf-50",
        className,
      )}
    />
  );
}

function CategoriesAdmin() {
  const { data: categories = [] } = useCategories();
  const { data: mediaItems = [] } = useQuery({
    queryKey: ["media"],
    queryFn: () => listMedia() as Promise<Media[]>,
  });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Top-level categories are valid parents (keeps the tree cycle-free).
  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string | null) =>
    id === null
      ? categories.filter((c) => !c.parent_id || !categories.some((p) => p.id === c.parent_id))
      : categories.filter((c) => c.parent_id === id);

  const [editing, setEditing] = useState<Category | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({ data: { name, slug: slugify(name), parent_id: parentId || null } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to add category");
    }
    setName("");
    setParentId("");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const reparent = async (c: Category, parent_id: string | null) => {
    if (parent_id === (c.parent_id ?? null)) return;
    try {
      await updateCategory({ data: { id: c.id, parent_id } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to move category");
    }
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const startRename = (c: Category) => {
    setRenaming(c.id);
    setRenameValue(c.name);
  };

  const saveRename = async (c: Category) => {
    const next = renameValue.trim();
    if (!next || next === c.name) return setRenaming(null);
    try {
      await updateCategory({ data: { id: c.id, name: next, slug: slugify(next) } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
    setRenaming(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategory({ data: { id } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const openImage = (c: Category) => {
    setEditing(c);
    setImageUrl(c.image_url ?? "");
    setPicker(false);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", await compressImage(file));
      const { url } = await uploadMedia({ data: fd });
      setImageUrl(url);
      qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveImage = async () => {
    if (!editing) return;
    try {
      await updateCategory({ data: { id: editing.id, image_url: imageUrl || null } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to save image");
    }
    toast.success("Category image updated");
    qc.invalidateQueries({ queryKey: ["categories"] });
    setEditing(null);
  };

  const renderRow = (c: Category, depth: number) => (
    <div
      key={c.id}
      className="flex items-center justify-between gap-3 px-5 py-3"
      style={{ paddingLeft: 20 + depth * 28 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {depth > 0 && <span className="shrink-0 text-ink-soft">↳</span>}
        <button
          type="button"
          onClick={() => openImage(c)}
          className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-leaf-200 bg-leaf-50 text-ink-soft hover:ring-2 hover:ring-leaf-500"
          aria-label="Set category image"
        >
          {c.image_url ? (
            <img src={c.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </button>
        {renaming === c.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename(c);
              if (e.key === "Escape") setRenaming(null);
            }}
            className={cn(inputCls, "h-9 w-48")}
          />
        ) : (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{c.name}</p>
            <p className="truncate text-xs text-ink-soft">{c.slug}</p>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <select
          value={c.parent_id ?? "none"}
          onChange={(e) => reparent(c, e.target.value === "none" ? null : e.target.value)}
          className={cn(inputCls, "h-9 w-36 py-1 text-xs")}
        >
          <option value="none">Top level</option>
          {categories
            .filter((p) => p.id !== c.id && !p.parent_id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        {renaming === c.id ? (
          <BtnOutline onClick={() => saveRename(c)}>
            <Check className="h-4 w-4" /> Save
          </BtnOutline>
        ) : (
          <BtnIcon onClick={() => startRename(c)} aria-label="Rename category">
            <Pencil className="h-4 w-4" />
          </BtnIcon>
        )}
        <BtnIcon onClick={() => openImage(c)} aria-label="Image">
          <ImageIcon className="h-4 w-4" />
        </BtnIcon>
        <BtnIcon onClick={() => del(c.id)} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-tomato-600" />
        </BtnIcon>
      </div>
    </div>
  );

  const renderTree = (parentIdVal: string | null, depth: number): React.ReactNode =>
    childrenOf(parentIdVal).map((c) => (
      <Fragment key={c.id}>
        {renderRow(c, depth)}
        {renderTree(c.id, depth + 1)}
      </Fragment>
    ));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Categories</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className={cn(inputCls, "min-w-[200px] flex-1")}
        />
        <select
          value={parentId || "none"}
          onChange={(e) => setParentId(e.target.value === "none" ? "" : e.target.value)}
          className={cn(inputCls, "w-48")}
        >
          <option value="none">Top level (no parent)</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
          Add
        </button>
      </form>
      <div className="divide-y divide-leaf-100 rounded-2xl border border-leaf-100 bg-white">
        {renderTree(null, 0)}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${editing?.name ?? ""} image`} maxWidth="max-w-md">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-leaf-200 bg-leaf-50">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute right-0.5 top-0.5 rounded-full bg-white/80 p-0.5"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="grid h-full w-full place-items-center text-ink-soft">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <BtnOutline type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload
                </BtnOutline>
                <BtnOutline type="button" onClick={() => setPicker((v) => !v)}>
                  <ImageIcon className="h-4 w-4" /> Media library
                </BtnOutline>
              </div>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="or paste a URL https://..."
                className={inputCls}
              />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
          {picker && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-leaf-200 p-2">
              {mediaItems.length === 0 ? (
                <p className="p-2 text-xs text-ink-soft">No media yet — upload an image first.</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {mediaItems.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setImageUrl(m.url);
                        setPicker(false);
                      }}
                      className="aspect-square overflow-hidden rounded-md border border-leaf-200 hover:ring-2 hover:ring-leaf-500"
                    >
                      <img src={m.url} alt={m.filename} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={saveImage}
            className="w-full rounded-full bg-leaf-600 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700"
          >
            Save image
          </button>
        </div>
      </Modal>
    </div>
  );
}
