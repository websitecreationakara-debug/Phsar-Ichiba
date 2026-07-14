import { createFileRoute } from "@tanstack/react-router";
import { useStoreSettings } from "@/hooks/use-products";
import { useEffect, useState } from "react";
import { updateSettings } from "@/data/settings";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsAdmin });

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";
const labelCls = "mb-1 block text-sm font-medium text-ink";

function SettingsAdmin() {
  const { data } = useStoreSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    banner_text: "",
    global_discount_pct: "0",
    free_shipping_threshold: "30",
  });

  useEffect(() => {
    if (data)
      setForm({
        banner_text: data.banner_text ?? "",
        global_discount_pct: String(data.global_discount_pct ?? 0),
        free_shipping_threshold: String(data.free_shipping_threshold ?? 30),
      });
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    try {
      await updateSettings({
        data: {
          id: data.id,
          banner_text: form.banner_text,
          global_discount_pct: Number(form.global_discount_pct),
          free_shipping_threshold: Number(form.free_shipping_threshold),
        },
      });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["store_settings"] });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Store Settings</h1>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
        <div>
          <label className={labelCls}>Promotional Banner Text</label>
          <input
            value={form.banner_text}
            onChange={(e) => setForm({ ...form, banner_text: e.target.value })}
            placeholder="e.g. 🎉 Free delivery this weekend — use code SAVE20"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-ink-soft">
            Shows as a dismissible bar at the top of the store. Leave blank to hide it. Editing the text
            shows it again to everyone.
          </p>
        </div>
        <div>
          <label className={labelCls}>Global Discount %</label>
          <input
            type="number"
            step="0.5"
            value={form.global_discount_pct}
            onChange={(e) => setForm({ ...form, global_discount_pct: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Free Shipping Threshold ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.free_shipping_threshold}
            onChange={(e) => setForm({ ...form, free_shipping_threshold: e.target.value })}
            className={inputCls}
          />
        </div>
        <button type="submit" className="w-full rounded-full bg-leaf-600 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700">
          Save settings
        </button>
      </form>

      <div className="rounded-2xl border border-leaf-100 bg-white p-6">
        <h2 className="mb-2 font-display font-bold text-ink">Make a user admin</h2>
        <p className="text-sm text-ink-soft">
          Run this in the D1 console (<code className="rounded bg-leaf-50 px-1.5 py-0.5">wrangler d1 execute</code>
          ):{" "}
          <code className="rounded bg-leaf-50 px-1.5 py-0.5">
            UPDATE user SET role = 'admin' WHERE email = 'someone@example.com';
          </code>
        </p>
      </div>
    </div>
  );
}
