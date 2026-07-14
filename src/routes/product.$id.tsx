import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Heart, Minus, Plus, ChevronRight } from 'lucide-react'
import { useProduct, useProductVariations, useCategories } from '@/hooks/use-products'
import { getProductRating, rateProduct } from '@/data/ratings'
import { useCart } from '@/hooks/use-cart'
import { useWishlist } from '@/hooks/use-wishlist'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/lib/i18n'
import { categoryArt } from '@/lib/category-art'
import { formatPrice, cn } from '@/lib/utils'
import type { ProductVariation } from '@/lib/types'

export const Route = createFileRoute('/product/$id')({ component: ProductDetail })

function ProductDetail() {
  const { id } = Route.useParams()
  const { data: product, isLoading } = useProduct(id)
  const { data: variations } = useProductVariations(id)
  const { data: categories } = useCategories()
  const { add } = useCart()
  const { has, toggle } = useWishlist()
  const { user } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [qty, setQty] = useState(1)
  const [variation, setVariation] = useState<ProductVariation | null>(null)

  const { data: rating } = useQuery({
    queryKey: ['product-rating', id],
    queryFn: () => getProductRating({ data: { productId: id } }),
    enabled: !!id,
  })

  const rateMutation = useMutation({
    mutationFn: (stars: number) => rateProduct({ data: { productId: id, stars } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-rating', id] }),
  })

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-ink-soft">{t('shop.loading')}</div>
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-ink">{t('product.notFound')}</p>
        <Link to="/shop" className="mt-3 inline-block text-sm font-semibold text-leaf-700 hover:underline">
          {t('product.backToShop')}
        </Link>
      </div>
    )
  }

  const category = categories?.find((c) => c.id === product.category_id)
  const { icon: Icon, gradient } = categoryArt(category?.slug)

  const isVariable = product.type === 'variable' && (variations?.length ?? 0) > 0
  const effectivePrice = variation
    ? (variation.sale_price ?? variation.price)
    : (product.sale_price ?? product.price)
  const basePrice = variation ? variation.price : product.price
  const onSale = effectivePrice < basePrice
  const outOfStock = isVariable
    ? variation
      ? variation.stock !== null && variation.stock <= 0
      : false
    : product.stock !== null && product.stock <= 0
  const wished = has(product.id)
  const avg = rating?.average
  const count = rating?.count ?? 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-1 text-xs text-ink-soft">
        <Link to="/shop" className="hover:underline">
          {t('product.breadcrumbShop')}
        </Link>
        <ChevronRight className="h-3 w-3" />
        {category && (
          <>
            <Link to="/shop" search={{ category: category.slug }} className="hover:underline">
              {category.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
              <Icon className="h-24 w-24 text-white/90" strokeWidth={1.25} />
            </div>
          )}
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-carrot-500 px-3 py-1 text-xs font-semibold text-white">
              {product.badge}
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{product.title}</h1>

          <div className="mt-2 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-carrot-400 text-carrot-400" />
              <span className="font-semibold text-ink">{(avg ?? product.rating ?? 0).toFixed(1)}</span>
            </div>
            <span className="text-ink-soft">{t('product.ratings', { n: count })}</span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-leaf-700">
              {formatPrice(effectivePrice)}
            </span>
            {onSale && (
              <span className="text-base text-ink-soft/60 line-through">{formatPrice(basePrice)}</span>
            )}
            {product.weight && !isVariable && (
              <span className="text-sm text-ink-soft">/ {product.weight}</span>
            )}
          </div>

          {product.description && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{product.description}</p>}

          {isVariable && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-ink">{t('product.chooseSize')}</p>
              <div className="flex flex-wrap gap-2">
                {variations!.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariation(v)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      variation?.id === v.id
                        ? 'border-leaf-600 bg-leaf-600 text-white'
                        : 'border-leaf-200 text-ink hover:border-leaf-400',
                    )}
                  >
                    {v.weight}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-leaf-200">
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="p-3 text-ink-soft hover:text-leaf-700"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((n) => n + 1)}
                className="p-3 text-ink-soft hover:text-leaf-700"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock || (isVariable && !variation)}
              onClick={() => add(product, variation, qty)}
              className="flex-1 rounded-full bg-leaf-600 py-3 text-sm font-bold text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-ink-soft/30"
            >
              {outOfStock
                ? t('product.soldOut')
                : isVariable && !variation
                  ? t('product.selectSize')
                  : t('product.addToBasket')}
            </button>

            <button
              type="button"
              onClick={() => toggle(product.id)}
              aria-pressed={wished}
              aria-label={t('nav.wishlist')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-leaf-200 text-ink-soft hover:text-tomato-500"
            >
              <Heart className={cn('h-5 w-5', wished && 'fill-tomato-500 text-tomato-500')} />
            </button>
          </div>

          <div className="mt-8 border-t border-leaf-100 pt-6">
            <p className="mb-2 text-sm font-semibold text-ink">{t('product.rateThis')}</p>
            {user ? (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => rateMutation.mutate(n)}
                    aria-label={`Rate ${n} stars`}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        'h-6 w-6 transition',
                        (rating?.myStars ?? 0) >= n
                          ? 'fill-carrot-400 text-carrot-400'
                          : 'text-leaf-200 hover:text-carrot-300',
                      )}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                <Link to="/account" className="font-semibold text-leaf-700 hover:underline">
                  {t('product.signInToRate')}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
