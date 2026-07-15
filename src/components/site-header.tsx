import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, User, ShoppingBasket, Menu, X, Languages } from "lucide-react";
import { useCategories } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useI18n, LOCALES, localizedCategoryName } from "@/lib/i18n";
import { categoryArt } from "@/lib/category-art";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { data: categories } = useCategories();
  const { count: cartCount, setDrawerOpen } = useCart();
  const { count: wishCount } = useWishlist();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: (prev) => ({ ...prev, q: query || undefined }) });
  };

  const targetLocale = locale === "ja" ? "en" : "ja";
  const targetLabel = LOCALES.find((l) => l.code === targetLocale)?.label;
  const toggleLocale = () => setLocale(targetLocale);

  return (
    <header className="sticky top-0 z-40 border-b border-leaf-100 bg-cream/95 backdrop-blur">
      <div className="bg-leaf-700 py-1.5 text-center text-xs font-medium text-leaf-50">
        {t("bar.delivery")}
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <button
          type="button"
          className="rounded-full p-2 text-ink hover:bg-leaf-100 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t("a11y.toggleMenu")}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/brand/wordmark.png" alt="Phsar Ichiba" className="h-12 w-auto object-contain" />
        </Link>

        <form onSubmit={submitSearch} className="mx-auto hidden max-w-md flex-1 md:block">
          <div className="flex items-center gap-2 rounded-full border border-leaf-200 bg-white px-4 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/60"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLocale}
            className="flex items-center gap-1 rounded-full border border-leaf-200 px-2.5 py-2 text-xs font-semibold text-ink-soft hover:bg-leaf-100"
            aria-label={t("a11y.switchLanguage")}
            title={t("a11y.switchLanguage")}
          >
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">{targetLabel}</span>
          </button>
          <Link
            to="/wishlist"
            className="hidden rounded-full p-2 text-ink hover:bg-leaf-100 sm:flex"
            aria-label={t("nav.wishlist")}
          >
            <span className="relative">
              <Heart className="h-5 w-5" />
              {wishCount > 0 && <CountBadge n={wishCount} />}
            </span>
          </Link>
          <Link to="/account" className="hidden rounded-full p-2 text-ink hover:bg-leaf-100 sm:flex" aria-label={t("nav.account")}>
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-2 rounded-full bg-leaf-600 px-3 py-2 text-white transition hover:bg-leaf-700"
            aria-label={t("nav.cart")}
          >
            <ShoppingBasket className="h-5 w-5" />
            {cartCount > 0 && <CountBadge n={cartCount} />}
          </button>
        </div>
      </div>

      <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:flex">
        <CategoryChip to="/shop" label={t("nav.all")} />
        {categories?.map((c) => {
          const { icon: Icon } = categoryArt(c.slug);
          return (
            <CategoryChip
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              label={localizedCategoryName(c, locale)}
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
              placeholder={t("nav.searchPlaceholder")}
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>
          <Link to="/shop" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100" onClick={() => setMenuOpen(false)}>
            {t("nav.allProducts")}
          </Link>
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100"
              onClick={() => setMenuOpen(false)}
            >
              {localizedCategoryName(c, locale)}
            </Link>
          ))}
          <Link to="/wishlist" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100" onClick={() => setMenuOpen(false)}>
            {t("nav.wishlist")}
            {wishCount > 0 && <span className="ml-1.5 text-ink-soft">({wishCount})</span>}
          </Link>
          <Link to="/account" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-leaf-100" onClick={() => setMenuOpen(false)}>
            {t("nav.account")}
          </Link>
          <button
            type="button"
            onClick={toggleLocale}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-leaf-100"
          >
            <Languages className="h-4 w-4" />
            {targetLabel}
          </button>
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
