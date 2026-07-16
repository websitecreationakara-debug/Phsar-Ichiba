import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Star, Plus } from "lucide-react";
import type { Product, ProductVariation } from "@/lib/types";
import { categoryArt } from "@/lib/category-art";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useI18n, localizedProductTitle } from "@/lib/i18n";
import { productFromPrice } from "@/lib/variants";
import { withBase } from "@/lib/base-path";

export function ProductCard({
  product,
  categorySlug,
  variations,
}: {
  product: Product;
  categorySlug?: string | null;
  // This product's own variations, when it's a variable product — used to show
  // a "from $X" price and out-of-stock state instead of the (unused) price/
  // stock columns on the parent row itself.
  variations?: ProductVariation[];
}) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { icon: Icon, gradient } = categoryArt(categorySlug);

  const isVariable = product.type === "variable";
  const outOfStock = isVariable
    ? !!variations?.length && variations.every((v) => v.stock !== null && v.stock <= 0)
    : product.stock !== null && product.stock <= 0;
  const onSale = !isVariable && product.sale_price != null && product.sale_price < product.price;
  const fromPrice = isVariable ? productFromPrice(product, variations ?? []) : product.price;
  const wished = has(product.id);
  const title = localizedProductTitle(product, locale);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden"
      >
        {product.image_url ? (
          <img
            src={withBase(product.image_url)}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              gradient,
            )}
          >
            <Icon className="h-12 w-12 text-white/90" strokeWidth={1.5} />
          </div>
        )}

        {product.badge && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-carrot-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            {product.badge}
          </span>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white">
            {t("product.soldOut")}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => toggle(product.id)}
        aria-label={t("nav.wishlist")}
        aria-pressed={wished}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-sm transition hover:text-tomato-500"
      >
        <Heart className={cn("h-4 w-4", wished && "fill-tomato-500 text-tomato-500")} />
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/product/$id" params={{ id: product.id }} className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold text-ink">{title}</h3>
        </Link>

        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <Star className="h-3.5 w-3.5 fill-carrot-400 text-carrot-400" />
          <span>{(product.rating ?? 0).toFixed(1)}</span>
          {product.weight && <span className="text-ink-soft/70">· {product.weight}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-bold text-leaf-700">
              {isVariable
                ? t("product.fromPrice", { price: formatPrice(fromPrice) })
                : formatPrice(onSale ? product.sale_price! : product.price)}
            </span>
            {onSale && (
              <span className="text-xs text-ink-soft/60 line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() =>
              isVariable ? navigate({ to: "/product/$id", params: { id: product.id } }) : add(product)
            }
            aria-label={t("product.addToCartAria", { title })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-600 text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-ink-soft/30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
