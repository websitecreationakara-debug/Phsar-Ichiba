import { createFileRoute, Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2, ShoppingBasket } from 'lucide-react'
import { useCart, itemKey, itemUnitPrice } from '@/hooks/use-cart'
import { useI18n, localizedProductTitle } from '@/lib/i18n'
import { categoryArt } from '@/lib/category-art'
import { formatPrice } from '@/lib/utils'

export const Route = createFileRoute('/_store/cart')({ component: CartPage })

function CartPage() {
  const { items, subtotal, remove, setQty } = useCart()
  const { t, locale } = useI18n()

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingBasket className="h-16 w-16 text-leaf-300" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-bold text-ink">{t('cart.empty')}</h1>
        <p className="text-sm text-ink-soft">{t('cart.emptySub')}</p>
        <Link
          to="/shop"
          className="mt-2 rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700"
        >
          {t('cart.startShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">{t('cart.title')}</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-leaf-100 rounded-2xl border border-leaf-100 bg-white">
          {items.map((item) => {
            const key = itemKey(item)
            const { icon: Icon, gradient } = categoryArt(undefined)
            const unit = itemUnitPrice(item)
            const title = localizedProductTitle(item.product, locale)
            return (
              <li key={key} className="flex gap-4 p-4">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={title}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}
                  >
                    <Icon className="h-8 w-8 text-white/90" strokeWidth={1.5} />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/product/$id"
                        params={{ id: item.product.id }}
                        className="truncate font-display text-sm font-semibold text-ink hover:underline"
                      >
                        {title}
                      </Link>
                      {item.variation && <p className="text-xs text-ink-soft">{item.variation.weight}</p>}
                      <p className="text-xs text-ink-soft">{t('cart.priceEach', { price: formatPrice(unit) })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label="Remove item"
                      className="shrink-0 text-ink-soft/60 hover:text-tomato-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-leaf-200">
                      <button
                        type="button"
                        onClick={() => setQty(key, item.qty - 1)}
                        className="p-1.5 text-ink-soft hover:text-leaf-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(key, item.qty + 1)}
                        className="p-1.5 text-ink-soft hover:text-leaf-700"
                        aria-label="Increase quantity"
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
            )
          })}
        </ul>

        <aside className="h-fit rounded-2xl border border-leaf-100 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink">{t('cart.orderSummary')}</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-soft">{t('cart.subtotal')}</span>
            <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
            {t('cart.deliveryFeeNotice')}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-leaf-100 pt-4">
            <span className="font-display text-base font-bold text-ink">{t('cart.total')}</span>
            <span className="font-display text-xl font-bold text-leaf-700">{formatPrice(subtotal)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-4 block w-full rounded-full bg-leaf-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-leaf-700"
          >
            {t('cart.proceedToCheckout')}
          </Link>
        </aside>
      </div>
    </div>
  )
}
