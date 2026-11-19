import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Languages, Loader2, Save, Search, Square } from 'lucide-react'
import { toast } from 'sonner'
import { useCategories, useProducts } from '@/hooks/use-products'
import { translateToEnglish, saveProductTranslations } from '@/data/translate'
import { updateCategory } from '@/data/categories'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/admin/pagination'
import type { Category, Product } from '@/lib/types'

const LIMITS = [10, 20, 50, 100] as const
const DEFAULT_LIMIT = 20

type TranslationsSearch = { page?: number; limit?: number }

export const Route = createFileRoute('/admin/translations')({
  component: TranslationsAdmin,
  // Invalid values are dropped (not kept), so a hand-edited URL like
  // ?page=abc&limit=7 falls back to the defaults below.
  validateSearch: (search: Record<string, unknown>): TranslationsSearch => {
    const page = Number(search.page)
    const limit = Number(search.limit)
    return {
      page: Number.isInteger(page) && page >= 1 ? page : undefined,
      limit: LIMITS.some((n) => n === limit) ? limit : undefined,
    }
  },
  // First visit to /admin/translations (no params) → rewrite the URL to
  // ?page=1&limit=20 in place, so the address bar always shows the paging state.
  beforeLoad: ({ search }) => {
    if (search.page === undefined || search.limit === undefined) {
      throw redirect({
        to: '/admin/translations',
        search: { page: search.page ?? 1, limit: search.limit ?? DEFAULT_LIMIT },
        replace: true,
      })
    }
  },
})

const inputCls =
  'w-full rounded-lg border border-leaf-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500'
const CONCURRENCY = 3

type Draft = { title_en: string; description_en: string }

const plain = (html: string | null) =>
  (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const savedDraft = (p: Product): Draft => ({
  title_en: p.title_en ?? '',
  description_en: p.description_en ?? '',
})

// Per-field state of what is SAVED (i.e. what the storefront shows in English).
const titleDone = (p: Product) => !!p.title_en?.trim()
const descriptionState = (p: Product): 'done' | 'missing' | 'none' =>
  !plain(p.description) ? 'none' : p.description_en?.trim() ? 'done' : 'missing'

// Needs work = no English title, or a Japanese description with no English one.
const productMissing = (p: Product) => !titleDone(p) || descriptionState(p) === 'missing'

type Status = 'missing' | 'translated' | 'all'

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        ok ? 'bg-leaf-100 text-leaf-800' : 'bg-carrot-100 text-carrot-700',
      )}
    >
      {ok && <Check className="h-3 w-3" />}
      {children}
    </span>
  )
}

function ActionButton({
  busy,
  disabled,
  onClick,
  children,
  primary,
}: {
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
        primary
          ? 'bg-leaf-600 text-white hover:bg-leaf-700'
          : 'border border-leaf-200 text-leaf-700 hover:bg-leaf-50',
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

function TranslationsAdmin() {
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const { page = 1, limit = DEFAULT_LIMIT } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPaging = (patch: TranslationsSearch) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) })
    // Each page is tall — start the new one at the top.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const { data: products = [] } = useProducts({ all: true })
  const { data: categories = [] } = useCategories()

  const missingProducts = products.filter(productMissing).length
  const missingCategories = categories.filter((c) => !c.name_en?.trim()).length

  const tabs = [
    { key: 'products', label: 'Products', missing: missingProducts },
    { key: 'categories', label: 'Categories', missing: missingCategories },
  ] as const

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Translations</h1>
        <p className="mt-1 text-ink-soft">
          Add English text for the storefront. Translate from Japanese with one click, review it, then save.
        </p>
      </header>

      <div className="flex gap-2 border-b border-leaf-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.key
                ? 'border-leaf-600 text-leaf-800'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {t.label}
            {t.missing > 0 && (
              <span className="rounded-full bg-carrot-100 px-2 py-0.5 text-xs font-bold text-carrot-700">
                {t.missing} missing
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <ProductsTab
          products={products}
          page={page}
          limit={limit}
          onPage={(p) => setPaging({ page: p })}
          onLimit={(l) => setPaging({ limit: l, page: 1 })}
        />
      ) : (
        <CategoriesTab categories={categories} />
      )}
    </div>
  )
}

function ProductsTab({
  products,
  page,
  limit,
  onPage,
  onLimit,
}: {
  products: Product[]
  page: number
  limit: number
  onPage: (page: number) => void
  onLimit: (limit: number) => void
}) {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, Draft | undefined>>({})
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('missing')
  const [busyRows, setBusyRows] = useState<Set<string>>(new Set())
  const [savingAll, setSavingAll] = useState(false)
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)
  const cancelBulk = useRef(false)
  const isCancelled = () => cancelBulk.current

  const valueOf = (p: Product): Draft => drafts[p.id] ?? savedDraft(p)
  const isDirty = (p: Product) => {
    const d = drafts[p.id]
    if (!d) return false
    const s = savedDraft(p)
    return d.title_en !== s.title_en || d.description_en !== s.description_en
  }
  const dirtyProducts = products.filter(isDirty)
  const missingCount = products.filter(productMissing).length
  const statusTabs: { key: Status; label: string; count: number }[] = [
    { key: 'missing', label: 'Missing', count: missingCount },
    { key: 'translated', label: 'Translated', count: products.length - missingCount },
    { key: 'all', label: 'All', count: products.length },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      // Keep a row on screen while it has unsaved edits, even once it's no
      // longer "missing", so it doesn't vanish under the admin mid-review.
      if (status === 'missing' && !productMissing(p) && !drafts[p.id]) return false
      if (status === 'translated' && productMissing(p)) return false
      if (!q) return true
      return p.title.toLowerCase().includes(q) || (p.title_en ?? '').toLowerCase().includes(q)
    })
  }, [products, query, status])

  const pages = Math.max(1, Math.ceil(filtered.length / limit))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * limit, current * limit)

  const setField = (p: Product, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [p.id]: { ...(d[p.id] ?? savedDraft(p)), ...patch } }))

  const setBusy = (id: string, on: boolean) =>
    setBusyRows((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })

  // Translates the product's Japanese fields into its draft. `onlyEmpty` keeps
  // anything already written in English (used by the bulk run).
  const translateProduct = async (p: Product, onlyEmpty: boolean) => {
    const cur = valueOf(p)
    const patch: Partial<Draft> = {}
    if (p.title.trim() && !(onlyEmpty && cur.title_en.trim())) {
      patch.title_en = (await translateToEnglish({ data: { text: p.title, kind: 'title' } })).text
    }
    if (plain(p.description) && !(onlyEmpty && cur.description_en.trim())) {
      patch.description_en = (
        await translateToEnglish({ data: { text: p.description ?? '', kind: 'description' } })
      ).text
    }
    if (Object.keys(patch).length) setField(p, patch)
  }

  const translateOne = async (p: Product) => {
    setBusy(p.id, true)
    try {
      await translateProduct(p, false)
      toast.success('Translated — review it, then save')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setBusy(p.id, false)
    }
  }

  const persist = async (list: Product[]) => {
    const items = list.map((p) => ({ id: p.id, ...valueOf(p) }))
    await saveProductTranslations({ data: { items } })
    setDrafts((d) => {
      const n = { ...d }
      for (const p of list) delete n[p.id]
      return n
    })
    await qc.invalidateQueries({ queryKey: ['products'] })
  }

  const saveOne = async (p: Product) => {
    setBusy(p.id, true)
    try {
      await persist([p])
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(p.id, false)
    }
  }

  const saveAll = async () => {
    setSavingAll(true)
    try {
      // Chunked to stay under the server's per-request cap.
      for (let i = 0; i < dirtyProducts.length; i += 100) await persist(dirtyProducts.slice(i, i + 100))
      toast.success(`Saved ${dirtyProducts.length} product${dirtyProducts.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingAll(false)
    }
  }

  // Fills drafts for every product still missing English text, a few at a
  // time. Nothing is saved — the admin reviews, then uses "Save all".
  const translateMissing = async () => {
    const queue = products.filter(productMissing)
    if (queue.length === 0) return
    cancelBulk.current = false
    setBulk({ done: 0, total: queue.length })
    let next = 0
    let failures = 0
    const worker = async () => {
      while (!isCancelled()) {
        if (next >= queue.length) return
        const p = queue[next++]
        try {
          await translateProduct(p, true)
        } catch {
          failures++
        }
        setBulk((b) => (b ? { ...b, done: b.done + 1 } : b))
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    setBulk(null)
    if (isCancelled()) toast('Stopped — translated products are ready to review')
    else if (failures) toast.error(`${failures} product(s) failed — run it again to retry them`)
    else toast.success('Done — review the translations, then press "Save all"')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (page !== 1) onPage(1)
            }}
            placeholder="Search products…"
            className={cn(inputCls, 'w-64 pl-9')}
          />
        </div>
        <div className="flex rounded-lg border border-leaf-200 bg-white p-0.5" role="group" aria-label="Filter by translation status">
          {statusTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key)
                if (page !== 1) onPage(1)
              }}
              aria-pressed={status === t.key}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                status === t.key ? 'bg-leaf-600 text-white' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.label} <span className="opacity-70">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {bulk ? (
            <>
              <span className="text-sm text-ink-soft">
                Translating {bulk.done}/{bulk.total}…
              </span>
              <ActionButton onClick={() => (cancelBulk.current = true)}>
                <Square className="h-3.5 w-3.5" /> Stop
              </ActionButton>
            </>
          ) : (
            <ActionButton onClick={translateMissing} disabled={products.every((p) => !productMissing(p))}>
              <Languages className="h-3.5 w-3.5" /> Translate all missing
            </ActionButton>
          )}
          <ActionButton
            primary
            onClick={saveAll}
            busy={savingAll}
            disabled={dirtyProducts.length === 0 || savingAll || !!bulk}
          >
            <Save className="h-3.5 w-3.5" /> Save all{dirtyProducts.length > 0 && ` (${dirtyProducts.length})`}
          </ActionButton>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((p) => {
          const v = valueOf(p)
          const dirty = isDirty(p)
          const busy = busyRows.has(p.id)
          return (
            <div
              key={p.id}
              className={cn(
                'grid gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-2',
                dirty ? 'border-carrot-300' : 'border-leaf-100',
              )}
            >
              <div className="flex gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-leaf-50" />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Japanese</p>
                  <p className="font-semibold text-ink">{p.title}</p>
                  {plain(p.description) && (
                    <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-ink-soft">{plain(p.description)}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">English</p>
                  <Chip ok={titleDone(p)}>Title {titleDone(p) ? 'translated' : 'missing'}</Chip>
                  {descriptionState(p) !== 'none' && (
                    <Chip ok={descriptionState(p) === 'done'}>
                      Description {descriptionState(p) === 'done' ? 'translated' : 'missing'}
                    </Chip>
                  )}
                </div>
                <input
                  value={v.title_en}
                  onChange={(e) => setField(p, { title_en: e.target.value })}
                  placeholder="English title"
                  className={inputCls}
                />
                {(plain(p.description) || v.description_en) && (
                  <textarea
                    value={v.description_en}
                    onChange={(e) => setField(p, { description_en: e.target.value })}
                    placeholder="English description"
                    className={cn(inputCls, 'min-h-24')}
                  />
                )}
                <div className="flex justify-end gap-2">
                  <ActionButton onClick={() => translateOne(p)} busy={busy} disabled={busy || !!bulk}>
                    <Languages className="h-3.5 w-3.5" /> Translate
                  </ActionButton>
                  <ActionButton primary onClick={() => saveOne(p)} disabled={!dirty || busy || !!bulk}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </ActionButton>
                </div>
              </div>
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-leaf-100 bg-white p-10 text-center text-ink-soft">
            {status === 'missing' && !query ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-leaf-600" /> Every product has English text.
              </span>
            ) : status === 'translated' && !query ? (
              'No product is fully translated yet.'
            ) : (
              'No products match.'
            )}
          </div>
        )}
      </div>

      <Pagination
        page={current}
        limit={limit}
        total={filtered.length}
        limits={LIMITS}
        onPage={onPage}
        onLimit={onLimit}
        noun="products"
      />
    </div>
  )
}

function CategoriesTab({ categories }: { categories: Category[] }) {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({})
  const [busyRows, setBusyRows] = useState<Set<string>>(new Set())

  const valueOf = (c: Category) => drafts[c.id] ?? c.name_en ?? ''
  const isDirty = (c: Category) => c.id in drafts && drafts[c.id] !== (c.name_en ?? '')

  const setBusy = (id: string, on: boolean) =>
    setBusyRows((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })

  const translate = async (c: Category) => {
    setBusy(c.id, true)
    try {
      const { text } = await translateToEnglish({ data: { text: c.name, kind: 'title' } })
      setDrafts((d) => ({ ...d, [c.id]: text }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setBusy(c.id, false)
    }
  }

  const save = async (c: Category) => {
    setBusy(c.id, true)
    try {
      await updateCategory({ data: { id: c.id, name_en: valueOf(c).trim() || null } })
      setDrafts((d) => {
        const n = { ...d }
        delete n[c.id]
        return n
      })
      await qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(c.id, false)
    }
  }

  return (
    <div className="space-y-3">
      {categories.map((c) => {
        const busy = busyRows.has(c.id)
        return (
          <div
            key={c.id}
            className={cn(
              'grid items-center gap-4 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1.4fr_auto]',
              isDirty(c) ? 'border-carrot-300' : 'border-leaf-100',
            )}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Japanese</p>
              <p className="font-semibold text-ink">{c.name}</p>
            </div>
            <input
              value={valueOf(c)}
              onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
              placeholder="English name"
              className={inputCls}
            />
            <div className="flex gap-2">
              <ActionButton onClick={() => translate(c)} busy={busy} disabled={busy}>
                <Languages className="h-3.5 w-3.5" /> Translate
              </ActionButton>
              <ActionButton primary onClick={() => save(c)} disabled={!isDirty(c) || busy}>
                <Save className="h-3.5 w-3.5" /> Save
              </ActionButton>
            </div>
          </div>
        )
      })}
      {categories.length === 0 && (
        <div className="rounded-2xl border border-leaf-100 bg-white p-10 text-center text-ink-soft">
          No categories yet.
        </div>
      )}
    </div>
  )
}
