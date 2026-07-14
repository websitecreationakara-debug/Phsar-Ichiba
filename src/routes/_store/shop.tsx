import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useProducts, useCategories } from '@/hooks/use-products'
import { useI18n, localizedCategoryName } from '@/lib/i18n'
import { ProductCard } from '@/components/product-card'
import { categoryArt } from '@/lib/category-art'
import { cn } from '@/lib/utils'

type ShopSearch = { category?: string; q?: string }

export const Route = createFileRoute('/_store/shop')({
  component: Shop,
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search.category === 'string' ? search.category : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
})

function Shop() {
  const { category, q } = Route.useSearch()
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { t, locale } = useI18n()

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))
  const activeCategory = categories?.find((c) => c.slug === category)

  const filtered = useMemo(() => {
    let rows = products ?? []
    if (activeCategory) rows = rows.filter((p) => p.category_id === activeCategory.id)
    if (q) {
      const needle = q.toLowerCase()
      rows = rows.filter((p) => p.title.toLowerCase().includes(needle))
    }
    return rows
  }, [products, activeCategory, q])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {activeCategory
              ? localizedCategoryName(activeCategory, locale)
              : q
                ? t('shop.resultsFor', { q })
                : t('shop.allProducts')}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isLoading ? t('shop.loading') : t('shop.itemCount', { n: filtered.length })}
          </p>
        </div>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link
          to="/shop"
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border border-leaf-200 px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-leaf-100 hover:text-leaf-800',
            !category && 'border-leaf-600 bg-leaf-100 text-leaf-800',
          )}
        >
          {t('shop.allProducts')}
        </Link>
        {(categories ?? []).map((c) => {
          const { icon: Icon } = categoryArt(c.slug)
          return (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border border-leaf-200 px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-leaf-100 hover:text-leaf-800',
                category === c.slug && 'border-leaf-600 bg-leaf-100 text-leaf-800',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {localizedCategoryName(c, locale)}
            </Link>
          )
        })}
      </nav>

      {!isLoading && filtered.length === 0 && (
        <p className="rounded-2xl border border-leaf-100 bg-white p-8 text-center text-sm text-ink-soft">
          {q ? t('shop.noProductsFor', { q }) : t('shop.noProducts')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} categorySlug={categoryById.get(p.category_id ?? '')?.slug} />
        ))}
      </div>
    </div>
  )
}
