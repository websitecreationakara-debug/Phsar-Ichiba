import { createFileRoute, Link } from '@tanstack/react-router'
import { Truck, Leaf, ShieldCheck, Clock } from 'lucide-react'
import { useHeroSlides, useCategories, useProducts } from '@/hooks/use-products'
import { HeroCarousel } from '@/components/hero-carousel'
import { ProductCard } from '@/components/product-card'
import { categoryArt } from '@/lib/category-art'

export const Route = createFileRoute('/')({ component: Home })

const PERKS = [
  { icon: Leaf, label: 'Picked fresh daily', body: 'Sourced from local farms every morning.' },
  { icon: Truck, label: 'Same-day delivery', body: 'Order before 6pm, delivered today.' },
  { icon: ShieldCheck, label: 'Quality guaranteed', body: "Not happy? We'll make it right." },
  { icon: Clock, label: 'Open every day', body: '7am – 9pm, including weekends.' },
]

function Home() {
  const { data: slides } = useHeroSlides()
  const { data: categories } = useCategories()
  const { data: products } = useProducts()

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))
  const onSale = (products ?? []).filter((p) => p.sale_price != null && p.sale_price < p.price)
  const featured = (products ?? []).slice(0, 8)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <HeroCarousel slides={slides ?? []} />

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PERKS.map((perk) => (
          <div
            key={perk.label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-leaf-100 bg-white p-4 text-center"
          >
            <perk.icon className="h-6 w-6 text-leaf-600" strokeWidth={1.75} />
            <p className="font-display text-sm font-semibold text-ink">{perk.label}</p>
            <p className="text-xs text-ink-soft">{perk.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-ink">Shop by category</h2>
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
            <h2 className="font-display text-2xl font-bold text-ink">On sale this week</h2>
            <Link to="/shop" className="text-sm font-semibold text-leaf-700 hover:underline">
              See all
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
          <h2 className="font-display text-2xl font-bold text-ink">Fresh picks</h2>
          <Link to="/shop" className="text-sm font-semibold text-leaf-700 hover:underline">
            See all
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
