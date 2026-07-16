import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useProducts, useCategories, useAllVariations } from '@/hooks/use-products'
import { useI18n, localizedCategoryName } from '@/lib/i18n'
import { ProductCard } from '@/components/product-card'
import { categoryArt } from '@/lib/category-art'
import { groupVariations, productFromPrice } from '@/lib/variants'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

type ShopSearch = { category?: string; q?: string }
type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating'

const isOnSale = (p: Product) => p.sale_price != null && p.sale_price < p.price

export const Route = createFileRoute('/_store/shop')({
  component: Shop,
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search.category === 'string' ? search.category : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
})

function Shop() {
  const search = Route.useSearch()
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const { data: variations } = useAllVariations()
  const { t, locale } = useI18n()

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))
  const variationsByProduct = groupVariations(variations ?? [])
  const displayPrice = (p: Product) => productFromPrice(p, variationsByProduct.get(p.id) ?? [])

  const [query, setQuery] = useState(search.q ?? '')
  const [activeCat, setActiveCat] = useState<string | undefined>(search.category)
  const [sort, setSort] = useState<Sort>('featured')
  const [range, setRange] = useState<[number, number] | null>(null)
  const [onSale, setOnSale] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Shop stays mounted across category-chip navigations, so state initializers
  // above don't re-run — sync local filter state when the URL changes instead.
  useEffect(() => setActiveCat(search.category), [search.category])
  useEffect(() => setQuery(search.q ?? ''), [search.q])

  const activeCategory = categories?.find((c) => c.slug === activeCat)

  const prices = (products ?? []).map(displayPrice)
  const floor = prices.length ? Math.floor(Math.min(...prices)) : 0
  let ceil = prices.length ? Math.ceil(Math.max(...prices)) : 100
  if (ceil <= floor) ceil = floor + 1
  const [lo, hi] = range ?? [floor, ceil]
  const priceActive = lo > floor || hi < ceil

  const filtersActive = !!activeCat || query.trim() !== '' || priceActive || onSale

  const resetFilters = () => {
    setActiveCat(undefined)
    setQuery('')
    setRange(null)
    setOnSale(false)
    setSort('featured')
  }

  const filtered = useMemo(() => {
    let rows = products ?? []
    if (activeCategory) rows = rows.filter((p) => p.category_id === activeCategory.id)
    if (query) {
      const needle = query.toLowerCase()
      rows = rows.filter(
        (p) => p.title.toLowerCase().includes(needle) || (p.title_en ?? '').toLowerCase().includes(needle),
      )
    }
    if (onSale) rows = rows.filter(isOnSale)
    rows = rows.filter((p) => {
      const price = displayPrice(p)
      return price >= lo && price <= hi
    })
    return rows
  }, [products, activeCategory, query, onSale, lo, hi, variations])

  const sorted = useMemo(() => {
    const rows = [...filtered]
    switch (sort) {
      case 'price-asc':
        return rows.sort((a, b) => displayPrice(a) - displayPrice(b))
      case 'price-desc':
        return rows.sort((a, b) => displayPrice(b) - displayPrice(a))
      case 'rating':
        return rows.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      default:
        return rows
    }
  }, [filtered, sort])

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          {t('shop.filters')}
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-leaf-700 hover:underline"
          >
            {t('shop.clearAll')}
          </button>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">
          {t('shop.search')}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            className="w-full rounded-full border border-leaf-200 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-leaf-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">
          {t('shop.categories')}
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveCat(undefined)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition hover:bg-leaf-100',
              !activeCat && 'bg-leaf-100 text-leaf-800',
            )}
          >
            {t('shop.allProducts')}
          </button>
          {(categories ?? []).map((c) => {
            const { icon: Icon } = categoryArt(c.slug)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.slug)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition hover:bg-leaf-100',
                  activeCat === c.slug && 'bg-leaf-100 text-leaf-800',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {localizedCategoryName(c, locale)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {t('shop.price')}
          </label>
          <span className="text-xs font-semibold text-leaf-700">
            ${lo} – ${hi}
          </span>
        </div>
        <div className="relative h-4">
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-leaf-100" />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-leaf-600"
            style={{
              left: `${((lo - floor) / (ceil - floor)) * 100}%`,
              right: `${100 - ((hi - floor) / (ceil - floor)) * 100}%`,
            }}
          />
          <input
            type="range"
            min={floor}
            max={ceil}
            value={lo}
            onChange={(e) => setRange([Math.min(Number(e.target.value), hi), hi])}
            className="range-thumb pointer-events-none absolute inset-x-0 top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          />
          <input
            type="range"
            min={floor}
            max={ceil}
            value={hi}
            onChange={(e) => setRange([lo, Math.max(Number(e.target.value), lo)])}
            className="range-thumb pointer-events-none absolute inset-x-0 top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">
          {t('shop.offers')}
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-leaf-100">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => setOnSale(e.target.checked)}
            className="h-4 w-4 rounded border-leaf-300 text-leaf-600 focus:ring-leaf-500"
          />
          {t('shop.onSaleOnly')}
        </label>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {activeCategory
              ? localizedCategoryName(activeCategory, locale)
              : query
                ? t('shop.resultsFor', { q: query })
                : t('shop.allProducts')}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isLoading ? t('shop.loading') : t('shop.itemCount', { n: sorted.length })}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pr-1 lg:block">
          {filterPanel}
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full border border-leaf-200 px-3.5 py-2 text-sm font-medium text-ink hover:bg-leaf-100 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('shop.filters')}
              {filtersActive && <span className="h-2 w-2 rounded-full bg-carrot-500" />}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs uppercase tracking-wide text-ink-soft sm:inline">
                {t('shop.sort')}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-leaf-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500"
              >
                <option value="featured">{t('shop.sort.featured')}</option>
                <option value="price-asc">{t('shop.sort.priceAsc')}</option>
                <option value="price-desc">{t('shop.sort.priceDesc')}</option>
                <option value="rating">{t('shop.sort.rating')}</option>
              </select>
            </div>
          </div>

          {!isLoading && sorted.length === 0 ? (
            <div className="rounded-3xl border border-leaf-100 bg-white p-10 text-center">
              <p className="font-display text-lg font-semibold text-ink">
                {query ? t('shop.noProductsFor', { q: query }) : t('shop.noProducts')}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{t('shop.noProductsSub')}</p>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-full border border-leaf-200 px-4 py-2 text-sm font-medium text-ink hover:bg-leaf-100"
                >
                  {t('shop.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sorted.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  categorySlug={categoryById.get(p.category_id ?? '')?.slug}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label={t('a11y.close')}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative flex h-full w-[86%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-ink">{t('shop.filters')}</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label={t('a11y.close')}
                className="rounded-full p-1.5 text-ink-soft hover:bg-leaf-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{filterPanel}</div>
            <div className="border-t border-leaf-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-full bg-leaf-600 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700"
              >
                {t('shop.showResults', { n: sorted.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
