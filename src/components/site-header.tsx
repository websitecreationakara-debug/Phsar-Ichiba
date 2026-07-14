import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, User, ShoppingBasket, Menu, X, Sprout } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { categoryArt } from "@/lib/category-art";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { data: categories } = useCategories();
  const { count: cartCount, setDrawerOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: (prev) => ({ ...prev, q: query || undefined }) });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-leaf-100 bg-cream/95 backdrop-blur">
      <div className="bg-leaf-700 py-1.5 text-center text-xs font-medium text-leaf-50">
        Free delivery on orders over $30 — order before 6pm for same-day delivery.
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          className="rounded-full p-2 text-ink hover:bg-leaf-100 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-600 text-white">
            <Sprout className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-bold leading-none text-leaf-800">
            Phsar Ichiba
            <span className="block text-[10px] font-medium tracking-wide text-ink-soft">
              THE MARKET
            </span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="mx-auto hidden max-w-md flex-1 md:block">
          <div className="flex items-center gap-2 rounded-full border border-leaf-200 bg-white px-4 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fresh vegetables, fruit, and more…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/60"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/shop"
            className="hidden rounded-full p-2 text-ink hover:bg-leaf-100 sm:flex"
            aria-label="Wishlist"
          >
            <span className="relative">
              <Heart className="h-5 w-5" />
              {wishCount > 0 && <CountBadge n={wishCount} />}
            </span>
          </Link>
          <Link to="/account" className="hidden rounded-full p-2 text-ink hover:bg-leaf-100 sm:flex" aria-label="Account">
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 rounded-full bg-leaf-600 px-3 py-2 text-white transition hover:bg-leaf-700"
            aria-label="Open cart"
          >
            <ShoppingBasket className="h-5 w-5" />
            {cartCount > 0 && <CountBadge n={cartCount} />}
          </button>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:flex">
        <CategoryChip to="/shop" label="All" />
        {categories?.map((c) => {
          const { icon: Icon } = categoryArt(c.slug);
          return (
            <CategoryChip
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              label={c.name}
              icon={<Icon className="h-3.5 w-3.5" />}
            />
          );
        })}
      </nav>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-leaf-100 px-4 py-3 md:hidden">
          <form onSubmit={submitSearch} className="mb-2 flex items-center gap-2 rounded-full border border-leaf-200 bg-white px-4 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>
          <Link to="/shop" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100" onClick={() => setMenuOpen(false)}>
            All products
          </Link>
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100"
              onClick={() => setMenuOpen(false)}
            >
              {c.name}
            </Link>
          ))}
          <Link to="/account" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100" onClick={() => setMenuOpen(false)}>
            Account
          </Link>
        </nav>
      )}
    </header>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-carrot-500 px-1 text-[10px] font-bold text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}

function CategoryChip({
  to,
  search,
  label,
  icon,
}: {
  to: string;
  search?: Record<string, string>;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-leaf-100 hover:text-leaf-800",
      )}
      activeProps={{ className: "bg-leaf-100 text-leaf-800" }}
    >
      {icon}
      {label}
    </Link>
  );
}
