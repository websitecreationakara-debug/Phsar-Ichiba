import { Link } from "@tanstack/react-router";
import { Heart, Star, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { categoryArt } from "@/lib/category-art";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useI18n } from "@/lib/i18n";

export function ProductCard({
  product,
  categorySlug,
}: {
  product: Product;
  categorySlug?: string | null;
}) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const { icon: Icon, gradient } = categoryArt(categorySlug);

  const outOfStock = product.stock !== null && product.stock <= 0;
  const onSale = product.sale_price != null && product.sale_price < product.price;
  const wished = has(product.id);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
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
          <h3 className="truncate font-display text-sm font-semibold text-ink">{product.title}</h3>
        </Link>

        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <Star className="h-3.5 w-3.5 fill-carrot-400 text-carrot-400" />
          <span>{(product.rating ?? 0).toFixed(1)}</span>
          {product.weight && <span className="text-ink-soft/70">· {product.weight}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-bold text-leaf-700">
              {formatPrice(onSale ? product.sale_price! : product.price)}
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
            onClick={() => add(product)}
            aria-label={t("product.addToCartAria", { title: product.title })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-600 text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-ink-soft/30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
