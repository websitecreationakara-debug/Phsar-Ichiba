import { createFileRoute, Link } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export const Route = createFileRoute('/_store/$')({ component: NotFoundPage })

function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
      <SearchX className="h-16 w-16 text-leaf-300" strokeWidth={1.5} />
      <h1 className="font-display text-3xl font-bold text-ink">{t('notFound.title')}</h1>
      <p className="text-ink-soft">{t('notFound.sub')}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700">
          {t('notFound.backHome')}
        </Link>
        <Link to="/shop" className="rounded-full border border-leaf-200 px-6 py-3 text-sm font-semibold text-ink hover:bg-leaf-50">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    </div>
  )
}
