import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle2, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n'
import { formatPrice } from '@/lib/utils'
import { downloadInvoice } from '@/lib/invoice'

type LastOrder = {
  id: string
  total: number
  items: { id: string; title: string; qty: number; price: number }[]
  customer_name: string
  customer_email?: string
  created_at?: string
}

export const Route = createFileRoute('/_store/thank-you')({ component: ThankYou })

function ThankYou() {
  const { t } = useI18n()
  const [order, setOrder] = useState<LastOrder | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('phsar-ichiba:last-order')
      if (raw) setOrder(JSON.parse(raw) as LastOrder)
    } catch {
      // ignore — show the generic thank-you below
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-leaf-600" strokeWidth={1.5} />
      <h1 className="mt-6 font-display text-3xl font-bold text-ink">
        {t('thankyou.thanks', { name: order?.customer_name ? `, ${order.customer_name}` : '' })}
      </h1>
      <p className="mt-3 text-ink-soft">
        {t('thankyou.placed')} {order?.customer_email ? t('thankyou.emailNotice') : t('thankyou.contactNotice')}
      </p>

      {order && (
        <div className="mt-8 space-y-4 rounded-2xl bg-leaf-50 p-6 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">{t('thankyou.orderRef')}</span>
            <span className="font-mono text-ink">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="space-y-2 border-t border-leaf-200 pt-4">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span className="truncate pr-2">
                  <span className="font-medium text-ink">{it.title}</span>
                  <span className="text-ink-soft"> × {it.qty}</span>
                </span>
                <span className="font-bold text-ink">{formatPrice(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-leaf-200 pt-4 font-display text-lg font-bold text-ink">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await downloadInvoice({ ...order, created_at: order.created_at ?? new Date().toISOString() })
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to generate invoice')
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-leaf-200 py-2.5 text-sm font-semibold text-ink hover:bg-white"
          >
            <FileDown className="h-4 w-4" />
            {t('thankyou.invoice')}
          </button>
        </div>
      )}

      <Link
        to="/shop"
        className="mt-8 inline-block rounded-full border border-leaf-200 px-6 py-3 text-sm font-semibold text-ink hover:bg-leaf-50"
      >
        {t('thankyou.continueShopping')}
      </Link>
    </div>
  )
}
