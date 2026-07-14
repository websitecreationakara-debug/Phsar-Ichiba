import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useProducts, useCategories } from '@/hooks/use-products'
import { useI18n } from '@/lib/i18n'
import { ProductCard } from '@/components/product-card'
import { categoryArt } from '@/lib/category-art'
import { cn } from '@/lib/utils'

type ShopSearch = { category?: string; q?: string }

export const Route = createFileRoute('/shop')({
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
  const { t } = useI18n()

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
            {activeCategory ? activeCategory.name : q ? t('shop.resultsFor', { q }) : t('shop.allProducts')}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isLoading ? t('shop.loading') : t('shop.itemCount', { n: filtered.length })}
          </p>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-48 shrink-0 md:block">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal className="h-4 w-4" /> {t('shop.categories')}
          </h2>
          <ul className="space-y-1">
            <li>
              <Link
                to="/shop"
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-leaf-100',
                  !category && 'bg-leaf-100 text-leaf-800',
                )}
              >
                {t('shop.allProducts')}
              </Link>
            </li>
            {(categories ?? []).map((c) => {
              const { icon: Icon } = categoryArt(c.slug)
              return (
                <li key={c.id}>
                  <Link
                    to="/shop"
                    search={{ category: c.slug }}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-leaf-100',
                      category === c.slug && 'bg-leaf-100 text-leaf-800',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {c.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1">
          {!isLoading && filtered.length === 0 && (
            <p className="rounded-2xl border border-leaf-100 bg-white p-8 text-center text-sm text-ink-soft">
              {q ? t('shop.noProductsFor', { q }) : t('shop.noProducts')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                categorySlug={categoryById.get(p.category_id ?? '')?.slug}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
