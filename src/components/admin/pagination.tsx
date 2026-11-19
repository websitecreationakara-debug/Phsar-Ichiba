import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Page numbers to render: always the first and last page, the current page and
// its neighbours, with "…" standing in for the gaps — e.g. 1 … 4 5 6 … 20.
function pageItems(current: number, pages: number): (number | "gap-left" | "gap-right")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const items: (number | "gap-left" | "gap-right")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);
  if (start > 2) items.push("gap-left");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pages - 1) items.push("gap-right");
  items.push(pages);
  return items;
}

const btn =
  "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({
  page,
  limit,
  total,
  limits,
  onPage,
  onLimit,
  noun = "items",
}: {
  page: number;
  limit: number;
  total: number;
  limits: readonly number[];
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(page, 1), pages);
  const from = total === 0 ? 0 : (current - 1) * limit + 1;
  const to = Math.min(current * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-leaf-100 bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="h-9 rounded-lg border border-leaf-200 bg-white px-2 text-sm font-semibold text-ink outline-none focus:border-leaf-500"
          >
            {limits.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          aria-label="Previous page"
          className={cn(btn, "border-leaf-200 text-ink hover:bg-leaf-50")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageItems(current, pages).map((it) =>
          typeof it === "string" ? (
            <span key={it} className="grid h-9 min-w-6 place-items-center text-ink-soft" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onPage(it)}
              aria-label={`Page ${it}`}
              aria-current={it === current ? "page" : undefined}
              className={cn(
                btn,
                it === current
                  ? "border-leaf-600 bg-leaf-600 text-white"
                  : "border-leaf-200 text-ink hover:bg-leaf-50",
              )}
            >
              {it}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={current >= pages}
          onClick={() => onPage(current + 1)}
          aria-label="Next page"
          className={cn(btn, "border-leaf-200 text-ink hover:bg-leaf-50")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <span className="text-sm text-ink-soft">
        Showing <b className="text-ink">{from}</b>–<b className="text-ink">{to}</b> of{" "}
        <b className="text-ink">{total}</b> {noun}
      </span>
    </nav>
  );
}
