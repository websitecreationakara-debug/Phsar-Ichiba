import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { products } from '@/db/schema'
import { requireCatalogManager } from './_auth'

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const MAX_CHARS = 8000

const PROMPTS = {
  // Product names are short labels — keep them short and natural.
  title:
    'You translate grocery product names from Japanese to English for an online food market in Cambodia. ' +
    'Reply with ONLY the English product name — no quotes, notes, or explanations. ' +
    'Keep brand names, sizes, weights and numbers as they are.',
  // Descriptions are admin-authored HTML (some with <p>, <br>, <strong> …).
  description:
    'You translate grocery product descriptions from Japanese to English for an online food market in Cambodia. ' +
    'Reply with ONLY the English translation — no preface, notes, or explanations. ' +
    'The text may contain HTML: keep every HTML tag and attribute exactly as it is and translate only the text between tags. ' +
    'Keep brand names, sizes, weights and numbers as they are. Use natural, appetising English.',
} as const

// Admin-only helper behind the "Translate to English" buttons in the product
// form. It only returns text — the admin reviews/edits it and saves it
// themselves, so nothing is written to the database here.
export const translateToEnglish = createServerFn({ method: 'POST' })
  .inputValidator((d: { text: string; kind: 'title' | 'description' }) => d)
  .handler(async ({ data }) => {
    await requireCatalogManager()

    const text = data.text.trim()
    if (!text) throw new Error('Nothing to translate')
    if (text.length > MAX_CHARS) throw new Error('Text is too long to translate in one go')

    const res = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: PROMPTS[data.kind] },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 2048,
    })

    const out = typeof res === 'object' && 'response' in res ? res.response : null
    if (typeof out !== 'string' || !out.trim()) throw new Error('Translation failed — please try again')
    return { text: out.trim() }
  })

// Saves only the English fields (title_en / description_en) for products, so
// the Translations page never has to round-trip the whole product payload —
// and can't overwrite price/stock edits made elsewhere in the meantime.
export const saveProductTranslations = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      items: { id: string; title_en: string | null; description_en: string | null }[]
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireCatalogManager()
    if (data.items.length > 200) throw new Error('Too many products in one save')
    const db = getDb()
    const now = new Date().toISOString()
    await Promise.all(
      data.items.map((i) =>
        db
          .update(products)
          .set({
            title_en: i.title_en?.trim() || null,
            description_en: i.description_en?.trim() || null,
            updated_at: now,
          })
          .where(eq(products.id, i.id)),
      ),
    )
    return { ok: true, saved: data.items.length }
  })
