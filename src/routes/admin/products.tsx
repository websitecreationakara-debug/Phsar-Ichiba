import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useProducts, useCategories, useAllVariations, usePromotions } from "@/hooks/use-products";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getVariations,
  saveVariations,
  setProductStatus,
} from "@/data/products";
import { listMedia, uploadMedia } from "@/data/media";
import { compressImage } from "@/lib/image";
import { groupVariations } from "@/lib/variants";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/admin/modal";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ImageIcon,
  Loader2,
  X,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import type { Product, Media } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  component: ProductsAdmin,
});

const empty = {
  id: "",
  title: "",
  title_en: "",
  description: "",
  price: "0",
  sale_price: "",
  category_id: "",
  stock: "",
  status: "published",
  image_url: "",
  badge: "",
  rating: "4.5",
  weight: "",
  pcs: "",
  type: "simple",
  promotion_id: "",
};

type VarRow = { id?: string; weight: string; price: string; sale_price: string; stock: string; pcs: string };
const blankVar = (): VarRow => ({ weight: "", price: "0", sale_price: "", stock: "", pcs: "" });

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

function ProductsAdmin() {
  const { data: products = [] } = useProducts({ all: true });
  const { data: categories = [] } = useCategories();
  const { data: promos = [] } = usePromotions({ all: true });
  const { data: allVariations = [] } = useAllVariations();
  const { data: mediaItems = [] } = useQuery({
    queryKey: ["media"],
    queryFn: () => listMedia() as Promise<Media[]>,
  });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [vars, setVars] = useState<VarRow[]>([]);
  const editing = !!form.id;
  const isVariable = form.type === "variable";
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const variationsByProduct = groupVariations(allVariations);

  const filtersActive =
    query.trim() !== "" || catFilter !== "all" || statusFilter !== "all" || typeFilter !== "all";
  const filtered = products.filter((p) => {
    if (query) {
      const q = query.toLowerCase();
      const matches = p.title.toLowerCase().includes(q) || (p.title_en ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (catFilter !== "all" && p.category_id !== catFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);
  const onFilterChange =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };
  const resetFilters = () => {
    setQuery("");
    setCatFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  // Drag-reorder only makes sense against the full, unfiltered list — that's the
  // global order the storefront reads. With filters on, positions are ambiguous.
  const canReorder = !filtersActive;
  const reorder = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = products.map((p) => p.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const byId = new Map(products.map((p) => [p.id, p]));
    const next = ids.map((id) => byId.get(id)!);
    qc.setQueryData(["products", "all"], next);
    try {
      await reorderProducts({ data: { ids } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
    qc.invalidateQueries({ queryKey: ["products"] });
  };

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
    setForm(empty);
    setVars([]);
    setPicker(false);
    setOpen(true);
  };
  const openEdit = async (p: Product) => {
    setPicker(false);
    setForm({
      id: p.id,
      title: p.title,
      title_en: p.title_en ?? "",
      description: p.description ?? "",
      price: String(p.price),
      sale_price: p.sale_price != null ? String(p.sale_price) : "",
      category_id: p.category_id ?? "",
      stock: p.stock != null ? String(p.stock) : "",
      status: p.status,
      image_url: p.image_url ?? "",
      badge: p.badge ?? "",
      rating: p.rating != null ? String(p.rating) : "",
      weight: p.weight ?? "",
      pcs: p.pcs != null ? String(p.pcs) : "",
      type: p.type,
      promotion_id: p.promotion_id ?? "",
    });
    setOpen(true);
    if (p.type === "variable") {
      const rows = await getVariations({ data: { productId: p.id, raw: true } });
      setVars(
        rows.map((v) => ({
          id: v.id,
          weight: v.weight,
          price: String(v.price),
          sale_price: v.sale_price != null ? String(v.sale_price) : "",
          stock: v.stock != null ? String(v.stock) : "",
          pcs: v.pcs != null ? String(v.pcs) : "",
        })),
      );
    } else {
      setVars([]);
    }
  };

  const variationPayload = () =>
    vars
      .filter((v) => v.weight.trim() !== "")
      .map((v, i) => ({
        id: v.id,
        weight: v.weight.trim(),
        price: Number(v.price) || 0,
        sale_price: v.sale_price.trim() === "" ? null : Number(v.sale_price),
        stock: v.stock.trim() === "" ? null : Number(v.stock),
        pcs: v.pcs.trim() === "" ? null : Number(v.pcs),
        sort_order: i,
      }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const variable = form.type === "variable";
    const payload = {
      title: form.title,
      title_en: form.title_en.trim() || null,
      description: form.description || null,
      price: variable ? 0 : Number(form.price),
      sale_price: variable || !form.sale_price ? null : Number(form.sale_price),
      category_id: form.category_id || null,
      stock: variable || form.stock.trim() === "" ? null : Number(form.stock),
      status: form.status,
      image_url: form.image_url || null,
      badge: form.badge || null,
      rating: form.rating.trim() === "" ? null : Number(form.rating),
      weight: variable || form.weight.trim() === "" ? null : form.weight.trim(),
      pcs: variable || form.pcs.trim() === "" ? null : Number(form.pcs),
      type: form.type,
      promotion_id: form.promotion_id || null,
    };
    try {
      let productId = form.id;
      if (editing) await updateProduct({ data: { id: form.id, ...payload } });
      else productId = (await createProduct({ data: payload })).id;
      if (variable) await saveVariations({ data: { productId, variations: variationPayload() } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
      return;
    }
    toast.success(editing ? "Product updated" : "Product created");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["variations"] });
    setOpen(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct({ data: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["variations"] });
  };

  const toggleStatus = async (p: Product) => {
    const next = p.status === "published" ? "draft" : "published";
    qc.setQueryData(["products", "all"], (rows: Product[] = []) =>
      rows.map((r) => (r.id === p.id ? { ...r, status: next } : r)),
    );
    try {
      await setProductStatus({ data: { id: p.id, status: next } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
      qc.invalidateQueries({ queryKey: ["products"] });
      return;
    }
    toast.success(next === "published" ? "Product enabled" : "Product disabled");
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const duplicate = async (p: Product) => {
    try {
      const { id } = await createProduct({
        data: {
          title: `${p.title} (Copy)`,
          title_en: p.title_en,
          description: p.description,
          price: p.price,
          sale_price: p.sale_price,
          category_id: p.category_id,
          stock: p.stock,
          status: "draft",
          image_url: p.image_url,
          badge: p.badge,
          rating: p.rating,
          weight: p.weight,
          pcs: p.pcs,
          type: p.type,
          promotion_id: p.promotion_id,
        },
      });
      if (p.type === "variable") {
        const rows = await getVariations({ data: { productId: p.id, raw: true } });
        await saveVariations({
          data: {
            productId: id,
            variations: rows.map((v, i) => ({
              weight: v.weight,
              price: v.price,
              sale_price: v.sale_price,
              stock: v.stock,
              pcs: v.pcs,
              sort_order: i,
            })),
          },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate");
      return;
    }
    toast.success("Product duplicated as draft");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["variations"] });
  };

  const priceLabel = (p: Product) => {
    if (p.type !== "variable") return `$${(p.sale_price ?? p.price).toFixed(2)}`;
    const vs = variationsByProduct.get(p.id) ?? [];
    if (!vs.length) return "—";
    const prices = vs.map((v) => v.sale_price ?? v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)}–$${max.toFixed(2)}`;
  };
  const weightLabel = (p: Product) => {
    if (p.type !== "variable") {
      const parts = [];
      if (p.weight) parts.push(p.weight);
      if (p.pcs != null) parts.push(`${p.pcs} pcs`);
      return parts.length ? parts.join(" · ") : "—";
    }
    const n = (variationsByProduct.get(p.id) ?? []).length;
    return `${n} variation${n === 1 ? "" : "s"}`;
  };
  const stockLabel = (p: Product) => {
    if (p.type !== "variable") return p.stock == null ? "∞" : p.stock;
    const vs = variationsByProduct.get(p.id) ?? [];
    if (!vs.length) return "—";
    const tracked = vs.filter((v) => v.stock != null);
    if (tracked.length === 0) return "∞";
    return tracked.reduce((a, v) => a + (v.stock ?? 0), 0);
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-ink-soft">
            {filtersActive ? `${filtered.length} of ${products.length}` : `${products.length} total`}
          </p>
        </div>
        <BtnPrimary onClick={openNew}>
          <Plus className="h-4 w-4" /> New Product
        </BtnPrimary>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => onFilterChange(setQuery)(e.target.value)}
            placeholder="Search by title..."
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => onFilterChange(setCatFilter)(e.target.value)}
          className={cn(inputCls, "w-44")}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en || c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onFilterChange(setStatusFilter)(e.target.value)}
          className={cn(inputCls, "w-36")}
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => onFilterChange(setTypeFilter)(e.target.value)}
          className={cn(inputCls, "w-36")}
        >
          <option value="all">All types</option>
          <option value="simple">Simple</option>
          <option value="variable">Variable</option>
        </select>
        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700 hover:underline"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      <p className="text-xs text-ink-soft">
        {canReorder
          ? "Drag the ⠿ handle to reorder — this sets the order shown in the store."
          : "Clear filters and search to drag-reorder products."}
      </p>

      <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-leaf-50 text-xs uppercase tracking-widest text-ink-soft">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">Weight</th>
              <th className="px-6 py-3 text-left">Stock</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-ink-soft">
                  No products match your filters.
                </td>
              </tr>
            )}
            {paged.map((p) => (
              <tr
                key={p.id}
                draggable={canReorder}
                onDragStart={() => canReorder && setDragId(p.id)}
                onDragOver={(e) => {
                  if (!canReorder || !dragId) return;
                  e.preventDefault();
                  setOverId(p.id);
                }}
                onDrop={() => {
                  if (canReorder && dragId) reorder(dragId, p.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={cn(
                  "border-t border-leaf-100",
                  dragId === p.id && "opacity-40",
                  overId === p.id && dragId !== p.id && "border-t-2 border-t-leaf-600",
                )}
              >
                <td className="px-2 py-3 text-center">
                  <GripVertical
                    className={cn("inline-block h-4 w-4", canReorder ? "cursor-grab text-ink-soft/60" : "text-ink-soft/20")}
                  />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                      {p.image_url && <img src={withBase(p.image_url)} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-medium text-ink">{p.title}</div>
                      {p.title_en && <div className="text-xs text-ink-soft">{p.title_en}</div>}
                    </div>
                    {p.type === "variable" && (
                      <span className="rounded border border-leaf-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf-700">
                        Variable
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 font-bold text-ink">{priceLabel(p)}</td>
                <td className="px-6 py-3 text-ink-soft">{weightLabel(p)}</td>
                <td className="px-6 py-3 text-ink">{stockLabel(p)}</td>
                <td className="px-6 py-3">
                  <span className="rounded bg-leaf-50 px-2 py-0.5 text-xs font-bold uppercase text-leaf-800">
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <BtnIcon onClick={() => openEdit(p)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </BtnIcon>
                    <BtnIcon
                      onClick={() => toggleStatus(p)}
                      aria-label={p.status === "published" ? "Disable product" : "Enable product"}
                      title={p.status === "published" ? "Published — click to disable" : "Draft — click to enable"}
                    >
                      {p.status === "published" ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-ink-soft/50" />
                      )}
                    </BtnIcon>
                    <BtnIcon onClick={() => duplicate(p)} aria-label="Duplicate">
                      <Copy className="h-4 w-4" />
                    </BtnIcon>
                    <BtnIcon onClick={() => del(p.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-tomato-600" />
                    </BtnIcon>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-ink-soft">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={cn(inputCls, "w-20 py-1.5")}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-ink-soft">
            {rangeStart}–{rangeEnd} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <BtnIcon
              className="border border-leaf-200 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </BtnIcon>
            <BtnIcon
              className="border border-leaf-200 disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </BtnIcon>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Product" : "New Product"} maxWidth="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="English title (for staff — order alerts, admin lists)">
            <input
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              placeholder="Optional"
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={cn(inputCls, "min-h-20")}
            />
          </Field>

          <Field label="Product type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="simple">Simple product</option>
              <option value="variable">Variable product (weights)</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {!isVariable && (
              <>
                <Field label="Price">
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Sale Price">
                  <input
                    type="number"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Stock (blank = unlimited · 0 = out of stock)">
                  <input
                    type="number"
                    min="0"
                    placeholder="Unlimited"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Weight">
                  <input
                    placeholder="e.g. 250g, 1kg"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Pcs per box">
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24"
                    value={form.pcs}
                    onChange={(e) => setForm({ ...form, pcs: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </>
            )}
            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en || c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offer / Promotion">
              <select
                value={form.promotion_id || "none"}
                onChange={(e) => setForm({ ...form, promotion_id: e.target.value === "none" ? "" : e.target.value })}
                className={inputCls}
              >
                <option value="none">No offer</option>
                {promos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
            <Field label="Badge">
              <select
                value={form.badge || "none"}
                onChange={(e) => setForm({ ...form, badge: e.target.value === "none" ? "" : e.target.value })}
                className={inputCls}
              >
                <option value="none">None</option>
                <option value="NEW">NEW</option>
                <option value="HOT">HOT</option>
                <option value="SALE">SALE</option>
                <option value="ORGANIC">ORGANIC</option>
              </select>
            </Field>
            <Field label="Rating (0–5)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="4.5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          {isVariable && (
            <div className="space-y-3 rounded-xl border border-leaf-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">Variations (weights)</span>
                <BtnOutline type="button" onClick={() => setVars((v) => [...v, blankVar()])}>
                  <Plus className="h-4 w-4" /> Add variation
                </BtnOutline>
              </div>
              {vars.length === 0 ? (
                <p className="text-xs text-ink-soft">Add at least one weight, each with its own price and stock.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto] gap-2 text-[11px] uppercase tracking-wider text-ink-soft">
                    <span>Weight</span>
                    <span>Price</span>
                    <span>Sale</span>
                    <span>Stock</span>
                    <span>Pcs/box</span>
                    <span></span>
                  </div>
                  {vars.map((v, i) => (
                    <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto] gap-2">
                      <input
                        placeholder="250g"
                        value={v.weight}
                        onChange={(e) => setVars((rows) => rows.map((r, j) => (j === i ? { ...r, weight: e.target.value } : r)))}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => setVars((rows) => rows.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="—"
                        value={v.sale_price}
                        onChange={(e) => setVars((rows) => rows.map((r, j) => (j === i ? { ...r, sale_price: e.target.value } : r)))}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="∞"
                        value={v.stock}
                        onChange={(e) => setVars((rows) => rows.map((r, j) => (j === i ? { ...r, stock: e.target.value } : r)))}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="—"
                        value={v.pcs}
                        onChange={(e) => setVars((rows) => rows.map((r, j) => (j === i ? { ...r, pcs: e.target.value } : r)))}
                        className={inputCls}
                      />
                      <BtnIcon type="button" onClick={() => setVars((rows) => rows.filter((_, j) => j !== i))} aria-label="Remove variation">
                        <Trash2 className="h-4 w-4 text-tomato-600" />
                      </BtnIcon>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className={labelCls}>Product image</label>
            <div className="flex items-start gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-leaf-200 bg-leaf-50">
                {form.image_url ? (
                  <>
                    <img src={withBase(form.image_url)} alt="" className="h-full w-full object-cover" />
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
                        <img src={withBase(m.url)} alt={m.filename} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <BtnPrimary type="submit" className="w-full">
            {editing ? "Save changes" : "Create product"}
          </BtnPrimary>
        </form>
      </Modal>
    </div>
  );
}
