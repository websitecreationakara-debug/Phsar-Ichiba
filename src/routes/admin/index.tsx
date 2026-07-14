import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/use-products";
import { listOrders } from "@/data/orders";
import { getSiteAnalytics } from "@/data/analytics";
import { DollarSign, Package, ShoppingCart, Users, Eye, MousePointerClick, Globe } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

const PERIODS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

function StatList({ title, rows }: { title: string; rows: { label: string; views: number }[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-soft">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {rows.slice(0, 5).map((r) => (
          <li key={r.label} className="flex justify-between gap-3">
            <span className="truncate text-ink-soft">{r.label}</span>
            <span className="shrink-0 font-semibold text-ink">{r.views.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisitorsSection() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["site-analytics", days],
    queryFn: () => getSiteAnalytics({ data: { days } }),
    staleTime: 5 * 60 * 1000,
  });

  const maxViews = Math.max(...(data?.series.map((s) => s.pageViews) ?? []), 1);

  return (
    <section className="space-y-6 rounded-2xl border border-leaf-100 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-ink">Website Visitors</h2>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 rounded-lg border border-leaf-200 px-2 text-sm text-ink outline-none focus:border-leaf-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {data?.configured && (
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-leaf-600" />
              <div>
                <p className="font-display text-xl font-bold leading-none text-ink">
                  {data.totalPageViews.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-ink-soft">Views</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-leaf-600" />
              <div>
                <p className="font-display text-xl font-bold leading-none text-ink">
                  {data.totalVisits.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-ink-soft">Visits</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-soft">Loading analytics…</p>
      ) : isError ? (
        <p className="text-sm text-tomato-600">
          {error instanceof Error ? error.message : "Failed to load analytics."}
        </p>
      ) : !data?.configured ? (
        <p className="text-sm text-ink-soft">
          Analytics isn't connected yet. Add the <code>CLOUDFLARE_API_TOKEN</code>,{" "}
          <code>CLOUDFLARE_ACCOUNT_ID</code>, and <code>CF_WEB_ANALYTICS_SITE_TAG</code> secrets to
          the Worker, then redeploy.
        </p>
      ) : (
        <>
          {data.series.length > 0 ? (
            <div className="flex h-40 items-end gap-1">
              {data.series.map((s) => (
                <div
                  key={s.date}
                  title={`${s.date}: ${s.pageViews} views`}
                  className="flex-1 rounded-t-sm bg-leaf-500/70"
                  style={{ height: `${(s.pageViews / maxViews) * 100}%`, minHeight: "2px" }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              No visits recorded in this period — data appears once the tracking beacon receives
              traffic.
            </p>
          )}

          {(data.topPages.length > 0 || data.topReferrers.length > 0 || data.topCountries.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatList title="Top pages" rows={data.topPages} />
              <StatList title="Top referrers" rows={data.topReferrers} />
              <StatList title="Top countries" rows={data.topCountries} />
            </div>
          )}

          <p className="flex items-start gap-1.5 border-t border-leaf-100 pt-3 text-xs text-ink-soft">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Figures are Cloudflare's estimates from the privacy-first beacon — it counts real
              browsers (most bots are excluded), leaves out your own admin pages, and scales up
              sampled traffic, so totals are approximate, not exact.
            </span>
          </p>
        </>
      )}
    </section>
  );
}

function AdminHome() {
  const { data: products = [] } = useProducts({ all: true });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders-admin"],
    queryFn: () => listOrders(),
  });

  const revenue = orders.reduce((a, o) => a + Number(o.total), 0);
  const active = orders.filter((o) => o.status !== "completed").length;

  const stats = [
    { label: "Total Revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, tint: "bg-leaf-100 text-leaf-700" },
    { label: "Active Orders", value: active, icon: ShoppingCart, tint: "bg-carrot-100 text-carrot-700" },
    { label: "Total Products", value: products.length, icon: Package, tint: "bg-leaf-100 text-leaf-700" },
    { label: "Total Orders", value: orders.length, icon: Users, tint: "bg-carrot-100 text-carrot-700" },
  ];

  // Simple bar chart from last 7 days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const total = orders
      .filter((o) => o.created_at.slice(0, 10) === dayStr)
      .reduce((a, o) => a + Number(o.total), 0);
    return { day: d.toLocaleDateString("en", { weekday: "short" }), total };
  });
  const max = Math.max(...days.map((d) => d.total), 1);

  return (
    <div className="max-w-7xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-ink-soft">Store performance at a glance.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-leaf-100 bg-white p-5">
            <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${s.tint}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-leaf-100 bg-white p-6">
        <h2 className="mb-6 font-display text-lg font-bold text-ink">Revenue · Last 7 days</h2>
        <div className="flex h-48 items-end gap-3">
          {days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="relative w-full overflow-hidden rounded-t-md bg-leaf-600"
                  style={{ height: `${(d.total / max) * 100}%`, minHeight: "4px" }}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </section>

      <VisitorsSection />

      <section className="overflow-hidden rounded-2xl border border-leaf-100 bg-white">
        <div className="border-b border-leaf-100 px-6 py-4">
          <h2 className="font-display font-bold text-ink">Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-leaf-50 text-xs uppercase tracking-widest text-ink-soft">
            <tr>
              <th className="px-6 py-3 text-left">Order</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map((o) => (
              <tr key={o.id} className="border-t border-leaf-100">
                <td className="px-6 py-3 font-mono text-xs text-ink">{o.id.slice(0, 8)}</td>
                <td className="px-6 py-3">
                  <span className="rounded bg-leaf-50 px-2 py-0.5 text-xs font-bold uppercase text-leaf-800">
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-bold text-ink">${Number(o.total).toFixed(2)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-ink-soft">
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
