import { createFileRoute, Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { useWishlist } from '@/hooks/use-wishlist'
import { useProducts, useCategories, useAllVariations } from '@/hooks/use-products'
import { useI18n } from '@/lib/i18n'
import { groupVariations } from '@/lib/variants'

export const Route = createFileRoute('/_store/wishlist')({ component: Wishlist })

function Wishlist() {
  const { t } = useI18n()
  const { ids } = useWishlist()
  const { data: products = [] } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: variations } = useAllVariations()
  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const variationsByProduct = groupVariations(variations ?? [])

  // Preserve the order items were saved in.
  const saved = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p != null)

  if (saved.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <Heart className="h-16 w-16 text-leaf-300" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-bold text-ink">{t('wishlist.empty')}</h1>
        <p className="text-ink-soft">{t('wishlist.emptySub')}</p>
        <Link to="/shop" className="mt-2 rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">{t('wishlist.title')}</h1>
        <p className="mt-1 text-ink-soft">{t('wishlist.itemsSaved', { count: String(saved.length) })}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {saved.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            categorySlug={categoryById.get(p.category_id ?? '')?.slug}
            variations={variationsByProduct.get(p.id)}
          />
        ))}
      </div>
    </div>
  )
}
