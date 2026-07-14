import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus, updateOrderTracking, deleteOrder } from "@/data/orders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MapPin, Trash2, FileDown } from "lucide-react";
import { downloadInvoice } from "@/lib/invoice";

export const Route = createFileRoute("/admin/orders")({ component: OrdersAdmin });

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";

function OrdersAdmin() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders-admin"],
    queryFn: () => listOrders(),
    refetchInterval: 30000,
  });

  const setStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus({ data: { id, status } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
    qc.invalidateQueries({ queryKey: ["orders-admin"] });
    qc.invalidateQueries({ queryKey: ["orders-pending-count"] });
  };

  const saveTracking = async (id: string, tracking_url: string, current: string | null) => {
    if (tracking_url.trim() === (current ?? "")) return;
    try {
      await updateOrderTracking({ data: { id, tracking_url } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to save tracking link");
    }
    qc.invalidateQueries({ queryKey: ["orders-admin"] });
    toast.success("Tracking link saved");
  };

  const printInvoice = async (order: Parameters<typeof downloadInvoice>[0]) => {
    try {
      await downloadInvoice(order);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    }
  };

  const removeOrder = async (id: string) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      await deleteOrder({ data: { id } });
    } catch (err) {
      return toast.error(err instanceof Error ? err.message : "Failed to delete order");
    }
    qc.invalidateQueries({ queryKey: ["orders-admin"] });
    qc.invalidateQueries({ queryKey: ["orders-pending-count"] });
    toast.success("Order deleted");
  };

  return (
    <div className="max-w-7xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Orders</h1>
      <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-leaf-50 text-xs uppercase tracking-widest text-ink-soft">
            <tr>
              <th className="px-6 py-3 text-left">Order</th>
              <th className="px-6 py-3 text-left">Customer</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Items</th>
              <th className="px-6 py-3 text-left">Total</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-leaf-100">
                <td className="px-6 py-3 font-mono text-xs text-ink">{o.id.slice(0, 8)}</td>
                <td className="px-6 py-3">
                  <div className="font-medium text-ink">{o.customer_name ?? "—"}</div>
                  {o.customer_email && <div className="text-xs text-ink-soft">{o.customer_email}</div>}
                  {o.customer_phone && <div className="text-xs text-ink-soft">{o.customer_phone}</div>}
                  {(o.address || o.city || o.postal_code) && (
                    <div className="text-xs text-ink-soft">
                      {[o.address, o.city, o.postal_code].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {o.location_lat != null && o.location_lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${o.location_lat},${o.location_lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-leaf-700 hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> View on map
                    </a>
                  )}
                  {o.scheduled_at && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-carrot-600">
                      🗓️ Scheduled: {o.scheduled_at.replace("T", " ")}
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 text-ink">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-3">
                  {Array.isArray(o.items) && o.items.length > 0 ? (
                    <ul className="space-y-0.5">
                      {o.items.map((it, i) => (
                        <li key={it.id ?? i}>
                          <span className="font-medium text-ink">{it.title}</span>
                          <span className="text-ink-soft"> × {it.qty}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </td>
                <td className="px-6 py-3 font-bold text-ink">
                  ${Number(o.total).toFixed(2)}
                  {o.discount > 0 && (
                    <span className="block text-[11px] font-medium text-leaf-700">
                      {o.promo_code ? `${o.promo_code}: ` : ""}−${Number(o.discount).toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      className={cn(inputCls, "h-8 w-36 py-1 text-xs")}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => printInvoice(o)}
                      title="Download invoice (PDF)"
                      className="text-ink-soft transition-colors hover:text-leaf-700"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeOrder(o.id)}
                      title="Delete order"
                      className="text-ink-soft transition-colors hover:text-tomato-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {o.status === "shipped" && (
                    <input
                      key={o.tracking_url ?? ""}
                      type="url"
                      defaultValue={o.tracking_url ?? ""}
                      placeholder="Delivery tracking link…"
                      title="Paste the courier's tracking link, then click away to save. Sent to the customer when marked Shipped."
                      onBlur={(e) => saveTracking(o.id, e.target.value, o.tracking_url)}
                      className={cn(inputCls, "mt-2 h-8 w-56 py-1 text-xs")}
                    />
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-ink-soft">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
