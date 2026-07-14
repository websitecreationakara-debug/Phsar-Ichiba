import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useHeroSlides } from "@/hooks/use-products";
import { createHeroSlide, updateHeroSlide, deleteHeroSlide } from "@/data/banners";
import { listMedia, uploadMedia } from "@/data/media";
import { compressImage } from "@/lib/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/admin/modal";
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HeroSlide, Media } from "@/lib/types";

export const Route = createFileRoute("/admin/banners")({ component: BannersAdmin });

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";
const labelCls = "mb-1 block text-sm font-medium text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
function BtnPrimary({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-700 disabled:opacity-60",
        className,
      )}
    />
  );
}
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

const empty = {
  id: "",
  eyebrow: "",
  title_top: "",
  title_accent: "",
  title_bottom: "",
  body: "",
  image_url: "",
  cta_label: "",
  cta_link: "/shop",
  sort_order: "0",
  active: "true",
};

function BannersAdmin() {
  const { data: slides = [] } = useHeroSlides({ all: true });
  const { data: mediaItems = [] } = useQuery({
    queryKey: ["media"],
    queryFn: () => listMedia() as Promise<Media[]>,
  });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const editing = !!form.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(false);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", await compressImage(file));
      const { url } = await uploadMedia({ data: fd });
      setForm((f) => ({ ...f, image_url: url }));
      qc.invalidateQueries({ queryKey: ["media"] });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openNew = () => {
    setForm({ ...empty, sort_order: String(slides.length) });
    setPicker(false);
    setOpen(true);
  };
  const openEdit = (s: HeroSlide) => {
    setPicker(false);
    setForm({
      id: s.id,
      eyebrow: s.eyebrow ?? "",
      title_top: s.title_top ?? "",
      title_accent: s.title_accent ?? "",
      title_bottom: s.title_bottom ?? "",
      body: s.body ?? "",
      image_url: s.image_url ?? "",
      cta_label: s.cta_label ?? "",
      cta_link: s.cta_link ?? "/shop",
      sort_order: String(s.sort_order),
      active: s.active ? "true" : "false",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      eyebrow: form.eyebrow || null,
      title_top: form.title_top || null,
      title_accent: form.title_accent || null,
      title_bottom: form.title_bottom || null,
      body: form.body || null,
      image_url: form.image_url || null,
      cta_label: form.cta_label || null,
      cta_link: form.cta_link || "/shop",
      sort_order: form.sort_order.trim() === "" ? 0 : Number(form.sort_order),
      active: form.active === "true",
    };
    try {
      if (editing) await updateHeroSlide({ data: { id: form.id, ...payload } });
      else await createHeroSlide({ data: payload });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save slide");
      return;
    }
    toast.success(editing ? "Slide updated" : "Slide created");
    qc.invalidateQueries({ queryKey: ["hero_slides"] });
    setOpen(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    try {
      await deleteHeroSlide({ data: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["hero_slides"] });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Hero Banner</h1>
          <p className="mt-1 text-ink-soft">{slides.length} slide(s) on the homepage</p>
        </div>
        <BtnPrimary onClick={openNew}>
          <Plus className="h-4 w-4" /> New Slide
        </BtnPrimary>
      </div>

      <div className="divide-y divide-leaf-100 rounded-2xl border border-leaf-100 bg-white">
        {slides.map((s) => (
          <div key={s.id} className="flex items-center gap-4 px-5 py-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
              {s.image_url && <img src={s.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">
                {[s.title_top, s.title_accent, s.title_bottom].filter(Boolean).join(" ") || "(untitled)"}
              </p>
              <p className="truncate text-xs text-ink-soft">{s.eyebrow}</p>
            </div>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-bold uppercase",
                s.active ? "bg-leaf-100 text-leaf-700" : "bg-leaf-50 text-ink-soft",
              )}
            >
              {s.active ? "Visible" : "Hidden"}
            </span>
            <span className="w-10 text-center text-xs text-ink-soft">#{s.sort_order}</span>
            <div className="flex gap-1">
              <BtnIcon onClick={() => openEdit(s)}>
                <Pencil className="h-4 w-4" />
              </BtnIcon>
              <BtnIcon onClick={() => del(s.id)}>
                <Trash2 className="h-4 w-4 text-tomato-600" />
              </BtnIcon>
            </div>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            No slides yet — add one to fill the homepage banner.
          </p>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Slide" : "New Slide"} maxWidth="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <Field label="Eyebrow (small label above title)">
            <input
              value={form.eyebrow}
              onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              placeholder="Fresh from the farm"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Title — top line">
              <input
                value={form.title_top}
                onChange={(e) => setForm({ ...form, title_top: e.target.value })}
                placeholder="Today's pick,"
                className={inputCls}
              />
            </Field>
            <Field label="Highlighted word">
              <input
                value={form.title_accent}
                onChange={(e) => setForm({ ...form, title_accent: e.target.value })}
                placeholder="straight from the market"
                className={inputCls}
              />
            </Field>
            <Field label="Title — rest">
              <input
                value={form.title_bottom}
                onChange={(e) => setForm({ ...form, title_bottom: e.target.value })}
                placeholder="to your door."
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Body text">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Hand-picked vegetables and fruit, sourced daily from local growers."
              className={cn(inputCls, "min-h-20")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Button label">
              <input
                value={form.cta_label}
                onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                placeholder="Shop fresh produce"
                className={inputCls}
              />
            </Field>
            <Field label="Button link">
              <input
                value={form.cta_link}
                onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                placeholder="/shop"
                className={inputCls}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Visibility">
              <select value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value })} className={inputCls}>
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </Field>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Slide image</label>
            <div className="flex items-start gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-leaf-200 bg-leaf-50">
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
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
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
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
                          setForm((f) => ({ ...f, image_url: m.url }));
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
          </div>

          <BtnPrimary type="submit" className="w-full">
            {editing ? "Save changes" : "Create slide"}
          </BtnPrimary>
        </form>
      </Modal>
    </div>
  );
}
