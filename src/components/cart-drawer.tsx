import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useCart, itemKey, itemUnitPrice } from "@/hooks/use-cart";
import { useI18n, localizedProductTitle } from "@/lib/i18n";
import { categoryArt } from "@/lib/category-art";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { items, count, subtotal, drawerOpen, setDrawerOpen, remove, setQty } = useCart();
  const { t, locale } = useI18n();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("a11y.closeCart")}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => setDrawerOpen(false)}
      />

      <div className="relative flex h-full w-full max-w-sm flex-col bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-4">
          <h2 className="font-display text-lg font-bold text-ink">{t("cart.count", { n: count })}</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-full p-2 text-ink-soft hover:bg-leaf-100"
            aria-label={t("a11y.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingBasket className="h-12 w-12 text-leaf-300" strokeWidth={1.5} />
            <p className="text-sm text-ink-soft">{t("cart.empty")}</p>
            <Link
              to="/shop"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700"
            >
              {t("cart.startShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 py-2">
              {items.map((item) => {
                const key = itemKey(item);
                const { icon: Icon, gradient } = categoryArt(undefined);
                const unit = itemUnitPrice(item);
                const title = localizedProductTitle(item.product, locale);
                return (
                  <li key={key} className="flex gap-3 border-b border-leaf-100 py-4 last:border-0">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={title}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}
                      >
                        <Icon className="h-6 w-6 text-white/90" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">
                          {title}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(key)}
                          aria-label={t("a11y.removeItem")}
                          className="shrink-0 text-ink-soft/60 hover:text-tomato-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.variation && (
                        <p className="text-xs text-ink-soft">{item.variation.weight}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <div className="flex items-center rounded-full border border-leaf-200">
                          <button
                            type="button"
                            onClick={() => setQty(key, item.qty - 1)}
                            className="p-1.5 text-ink-soft hover:text-leaf-700"
                            aria-label={t("a11y.decreaseQty")}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(key, item.qty + 1)}
                            className="p-1.5 text-ink-soft hover:text-leaf-700"
                            aria-label={t("a11y.increaseQty")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-display text-sm font-bold text-leaf-700">
                          {formatPrice(unit * item.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-leaf-100 px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t("cart.subtotal")}</span>
                <span className="font-display text-lg font-bold text-ink">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link
                to="/cart"
                onClick={() => setDrawerOpen(false)}
                className="block w-full rounded-full bg-leaf-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-leaf-700"
              >
                {t("cart.viewBasket")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
