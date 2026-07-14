import { createFileRoute, Link } from '@tanstack/react-router'
import { Truck, Leaf, ShieldCheck, Clock } from 'lucide-react'
import { useHeroSlides, useCategories, useProducts } from '@/hooks/use-products'
import { useI18n, type I18nKey } from '@/lib/i18n'
import { HeroCarousel } from '@/components/hero-carousel'
import { ProductCard } from '@/components/product-card'
import { categoryArt } from '@/lib/category-art'

export const Route = createFileRoute('/_store/')({ component: Home })

const PERKS: { icon: typeof Leaf; titleKey: I18nKey; bodyKey: I18nKey }[] = [
  { icon: Leaf, titleKey: 'home.perk1.title', bodyKey: 'home.perk1.body' },
  { icon: Truck, titleKey: 'home.perk2.title', bodyKey: 'home.perk2.body' },
  { icon: ShieldCheck, titleKey: 'home.perk3.title', bodyKey: 'home.perk3.body' },
  { icon: Clock, titleKey: 'home.perk4.title', bodyKey: 'home.perk4.body' },
]

function Home() {
  const { data: slides } = useHeroSlides()
  const { data: categories } = useCategories()
  const { data: products } = useProducts()
  const { t } = useI18n()

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))
  const onSale = (products ?? []).filter((p) => p.sale_price != null && p.sale_price < p.price)
  const featured = (products ?? []).slice(0, 8)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <HeroCarousel slides={slides ?? []} />

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PERKS.map((perk) => (
          <div
            key={perk.titleKey}
            className="flex flex-col items-center gap-2 rounded-2xl border border-leaf-100 bg-white p-4 text-center"
          >
            <perk.icon className="h-6 w-6 text-leaf-600" strokeWidth={1.75} />
            <p className="font-display text-sm font-semibold text-ink">{t(perk.titleKey)}</p>
            <p className="text-xs text-ink-soft">{t(perk.bodyKey)}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-ink">{t('home.shopByCategory')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(categories ?? []).map((c) => {
            const { icon: Icon, gradient } = categoryArt(c.slug)
            return (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-leaf-100 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} transition group-hover:scale-105`}
                >
                  <Icon className="h-7 w-7 text-white" strokeWidth={1.5} />
                </span>
                <span className="font-display text-sm font-semibold text-ink">{c.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {onSale.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink">{t('home.onSale')}</h2>
            <Link to="/shop" className="text-sm font-semibold text-leaf-700 hover:underline">
              {t('home.seeAll')}
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {onSale.map((p) => (
              <ProductCard key={p.id} product={p} categorySlug={categoryById.get(p.category_id ?? '')?.slug} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-ink">{t('home.freshPicks')}</h2>
          <Link to="/shop" className="text-sm font-semibold text-leaf-700 hover:underline">
            {t('home.seeAll')}
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} categorySlug={categoryById.get(p.category_id ?? '')?.slug} />
          ))}
        </div>
      </section>
    </div>
  )
}
