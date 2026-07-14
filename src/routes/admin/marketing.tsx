import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useProducts, usePromotions } from "@/hooks/use-products";
import { createPromotion, updatePromotion, deletePromotion, assignPromotion } from "@/data/promotions";
import { listPromoCodes, createPromoCode, updatePromoCode, deletePromoCode } from "@/data/promo-codes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/admin/modal";
import { Plus, Pencil, Trash2, X, Search, Tag, Percent, Ticket } from "lucide-react";
import { toast } from "sonner";
import { KIND_LABEL } from "@/lib/promotions";
import { cn } from "@/lib/utils";
import type { Promotion, PromoCode } from "@/lib/types";

export const Route = createFileRoute("/admin/marketing")({ component: MarketingAdmin });

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
  name: "",
  kind: "special",
  description: "",
  discount_pct: "",
  starts_at: "",
  ends_at: "",
  active: "true",
  sort_order: "0",
};

// Live/scheduled/ended state for the status pill, derived from the date window.
function promoStatus(p: Promotion) {
  if (!p.active) return { label: "Hidden", cls: "bg-leaf-50 text-ink-soft" };
  const now = Date.now();
  if (p.starts_at && now < Date.parse(`${p.starts_at}T00:00:00`))
    return { label: "Scheduled", cls: "bg-carrot-100 text-carrot-700" };
  if (p.ends_at && now > Date.parse(`${p.ends_at}T23:59:59`))
    return { label: "Ended", cls: "bg-leaf-50 text-ink-soft" };
  return { label: "Live", cls: "bg-leaf-100 text-leaf-700" };
}

const period = (p: Promotion) => {
  if (!p.starts_at && !p.ends_at) return "Always on";
  return `${p.starts_at || "…"} → ${p.ends_at || "…"}`;
};

const emptyCode = { id: "", code: "", type: "percent", value: "", active: "true" };

const codeValueLabel = (c: PromoCode) => (c.type === "fixed" ? `$${c.value.toFixed(2)} off` : `${c.value}% off`);

function MarketingAdmin() {
  const { data: promos = [] } = usePromotions({ all: true });
  const { data: products = [] } = useProducts({ all: true });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const editing = !!form.id;

  // Product picker dialog state.
  const [pickerFor, setPickerFor] = useState<Promotion | null>(null);
  const [pickerSel, setPickerSel] = useState<Set<string>>(new Set());
  const [pickerQuery, setPickerQuery] = useState("");

  // Promo codes.
  const { data: codes = [] } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: () => listPromoCodes() as Promise<PromoCode[]>,
  });
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeForm, setCodeForm] = useState(emptyCode);
  const codeEditing = !!codeForm.id;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["promotions"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const refreshCodes = () => qc.invalidateQueries({ queryKey: ["promo-codes"] });

  const openNewCode = () => {
    setCodeForm(emptyCode);
    setCodeOpen(true);
  };
  const openEditCode = (c: PromoCode) => {
    setCodeForm({ id: c.id, code: c.code, type: c.type, value: String(c.value), active: c.active ? "true" : "false" });
    setCodeOpen(true);
  };
  const saveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: codeForm.code,
      type: codeForm.type,
      value: codeForm.value.trim() === "" ? 0 : Number(codeForm.value),
      active: codeForm.active === "true",
    };
    try {
      if (codeEditing) await updatePromoCode({ data: { id: codeForm.id, ...payload } });
      else await createPromoCode({ data: payload });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save code");
      return;
    }
    toast.success(codeEditing ? "Code updated" : "Code created");
    refreshCodes();
    setCodeOpen(false);
  };
  const delCode = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    try {
      await deletePromoCode({ data: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      return;
    }
    toast.success("Code deleted");
    refreshCodes();
  };

  const openNew = () => {
    setForm({ ...empty, sort_order: String(promos.length) });
    setOpen(true);
  };
  const openEdit = (p: Promotion) => {
    setForm({
      id: p.id,
      name: p.name,
      kind: p.kind,
      description: p.description ?? "",
      discount_pct: p.discount_pct != null ? String(p.discount_pct) : "",
      starts_at: p.starts_at ?? "",
      ends_at: p.ends_at ?? "",
      active: p.active ? "true" : "false",
      sort_order: String(p.sort_order),
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      description: form.description.trim() || null,
      discount_pct: form.discount_pct.trim() === "" ? null : Number(form.discount_pct),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      active: form.active === "true",
      sort_order: form.sort_order.trim() === "" ? 0 : Number(form.sort_order),
    };
    try {
      if (editing) await updatePromotion({ data: { id: form.id, ...payload } });
      else await createPromotion({ data: payload });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save offer");
      return;
    }
    toast.success(editing ? "Offer updated" : "Offer created");
    refresh();
    setOpen(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this offer? Assigned products keep their normal price.")) return;
    try {
      await deletePromotion({ data: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      return;
    }
    toast.success("Offer deleted");
    refresh();
  };

  const removeProduct = async (productId: string) => {
    try {
      await assignPromotion({ data: { productIds: [productId], promotionId: null } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
      return;
    }
    refresh();
  };

  const openPicker = (p: Promotion) => {
    setPickerFor(p);
    setPickerSel(new Set());
    setPickerQuery("");
  };
  const confirmPicker = async () => {
    if (!pickerFor || pickerSel.size === 0) {
      setPickerFor(null);
      return;
    }
    try {
      await assignPromotion({ data: { productIds: [...pickerSel], promotionId: pickerFor.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
      return;
    }
    toast.success(`Added ${pickerSel.size} product(s)`);
    refresh();
    setPickerFor(null);
  };

  const pickerList = products.filter(
    (p) => p.promotion_id !== pickerFor?.id && p.title.toLowerCase().includes(pickerQuery.toLowerCase()),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Marketing</h1>
          <p className="mt-1 text-ink-soft">{promos.length} offer(s) — time-boxed promotions for the storefront.</p>
        </div>
        <BtnPrimary onClick={openNew}>
          <Plus className="h-4 w-4" /> New Offer
        </BtnPrimary>
      </div>

      <div className="space-y-4">
        {promos.length === 0 && (
          <p className="rounded-2xl border border-leaf-100 bg-white px-5 py-10 text-center text-sm text-ink-soft">
            No offers yet. Create one, then assign products to it.
          </p>
        )}
        {promos.map((p) => {
          const assigned = products.filter((pr) => pr.promotion_id === p.id);
          const status = promoStatus(p);
          return (
            <div key={p.id} className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-bold text-ink">{p.name || "(untitled)"}</span>
                    <span className="rounded border border-leaf-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf-700">
                      {KIND_LABEL[p.kind] ?? p.kind}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> {period(p)}
                    </span>
                    {p.discount_pct ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-leaf-700">
                        <Percent className="h-3.5 w-3.5" /> {p.discount_pct}% off
                      </span>
                    ) : (
                      <span>No discount (featured only)</span>
                    )}
                  </div>
                  {p.description && <p className="mt-2 text-sm text-ink-soft">{p.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <BtnIcon onClick={() => openEdit(p)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </BtnIcon>
                  <BtnIcon onClick={() => del(p.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-tomato-600" />
                  </BtnIcon>
                </div>
              </div>

              <div className="border-t border-leaf-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">{assigned.length} product(s)</span>
                  <BtnOutline onClick={() => openPicker(p)}>
                    <Plus className="h-4 w-4" /> Add products
                  </BtnOutline>
                </div>
                {assigned.length === 0 ? (
                  <p className="text-sm text-ink-soft">No products in this offer yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assigned.map((pr) => (
                      <span key={pr.id} className="inline-flex items-center gap-2 rounded-full bg-leaf-50 py-1 pl-1 pr-2 text-sm">
                        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white">
                          {pr.image_url && <img src={pr.image_url} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="max-w-[160px] truncate text-ink">{pr.title}</span>
                        <button
                          type="button"
                          onClick={() => removeProduct(pr.id)}
                          aria-label={`Remove ${pr.title}`}
                          className="text-ink-soft hover:text-tomato-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo codes */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Promo Codes</h2>
            <p className="mt-0.5 text-sm text-ink-soft">Discount codes customers enter at checkout.</p>
          </div>
          <BtnOutline onClick={openNewCode}>
            <Plus className="h-4 w-4" /> New Code
          </BtnOutline>
        </div>

        <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-leaf-50 text-xs uppercase tracking-widest text-ink-soft">
              <tr>
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Discount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-ink-soft">
                    No promo codes yet.
                  </td>
                </tr>
              )}
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-leaf-100">
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-2 font-mono font-bold text-ink">
                      <Ticket className="h-4 w-4 text-leaf-600" /> {c.code}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-ink">{codeValueLabel(c)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-bold uppercase",
                        c.active ? "bg-leaf-100 text-leaf-700" : "bg-leaf-50 text-ink-soft",
                      )}
                    >
                      {c.active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <BtnIcon onClick={() => openEditCode(c)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </BtnIcon>
                      <BtnIcon onClick={() => delCode(c.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-tomato-600" />
                      </BtnIcon>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / edit promo code */}
      <Modal open={codeOpen} onClose={() => setCodeOpen(false)} title={codeEditing ? "Edit Code" : "New Code"} maxWidth="max-w-md">
        <form onSubmit={saveCode} className="space-y-4">
          <Field label="Code">
            <input
              required
              value={codeForm.code}
              onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })}
              placeholder="SAVE10"
              className={cn(inputCls, "uppercase")}
            />
            <p className="mt-1 text-xs text-ink-soft">Saved in capitals; customers can type it any case.</p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={codeForm.type} onChange={(e) => setCodeForm({ ...codeForm, type: e.target.value })} className={inputCls}>
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
            </Field>
            <Field label={codeForm.type === "fixed" ? "Amount ($)" : "Percent (%)"}>
              <input
                required
                type="number"
                min="0"
                step={codeForm.type === "fixed" ? "0.01" : "1"}
                value={codeForm.value}
                onChange={(e) => setCodeForm({ ...codeForm, value: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Status">
            <select value={codeForm.active} onChange={(e) => setCodeForm({ ...codeForm, active: e.target.value })} className={inputCls}>
              <option value="true">Active</option>
              <option value="false">Off</option>
            </select>
          </Field>
          <BtnPrimary type="submit" className="w-full">
            {codeEditing ? "Save changes" : "Create code"}
          </BtnPrimary>
        </form>
      </Modal>

      {/* Create / edit offer */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Offer" : "New Offer"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Summer Vegetable Sale"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={inputCls}>
                <option value="limited">Limited Offer</option>
                <option value="seasonal">Seasonal Offer</option>
                <option value="special">Special Offer</option>
              </select>
            </Field>
            <Field label="Discount % (optional)">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="e.g. 15"
                value={form.discount_pct}
                onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Start date (optional)">
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="End date (optional)">
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Visibility">
              <select value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value })} className={inputCls}>
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shown under the offer heading on the storefront."
              className={cn(inputCls, "min-h-20")}
            />
          </Field>
          <p className="text-xs text-ink-soft">
            Leave both dates blank for an always-on offer. The offer only shows in the store while active and within
            its dates.
          </p>
          <BtnPrimary type="submit" className="w-full">
            {editing ? "Save changes" : "Create offer"}
          </BtnPrimary>
        </form>
      </Modal>

      {/* Add products to an offer */}
      <Modal open={!!pickerFor} onClose={() => setPickerFor(null)} title={`Add products to ${pickerFor?.name ?? ""}`}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search products..."
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {pickerList.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No products to add.</p>
          ) : (
            pickerList.map((pr) => {
              const checked = pickerSel.has(pr.id);
              return (
                <label key={pr.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-leaf-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setPickerSel((s) => {
                        const next = new Set(s);
                        if (checked) next.delete(pr.id);
                        else next.add(pr.id);
                        return next;
                      })
                    }
                  />
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                    {pr.image_url && <img src={pr.image_url} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{pr.title}</span>
                  {pr.promotion_id && <span className="text-[10px] uppercase tracking-wider text-ink-soft">in another offer</span>}
                </label>
              );
            })
          )}
        </div>
        <BtnPrimary onClick={confirmPicker} disabled={pickerSel.size === 0} className="mt-3 w-full">
          Add {pickerSel.size > 0 ? pickerSel.size : ""} product(s)
        </BtnPrimary>
      </Modal>
    </div>
  );
}
