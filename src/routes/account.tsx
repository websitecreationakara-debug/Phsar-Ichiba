import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/lib/i18n'

export const Route = createFileRoute('/account')({ component: AccountPage })

function AccountPage() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-ink-soft">{t('shop.loading')}</div>
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl border border-leaf-100 bg-white p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
            <User className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-ink">{user.name || user.email}</h1>
          <p className="text-sm text-ink-soft">{user.email}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-leaf-200 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-leaf-50"
          >
            <LogOut className="h-4 w-4" /> {t('account.signOut')}
          </button>
        </div>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password, name)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-display text-2xl font-bold text-ink">
        {mode === 'signin' ? t('account.welcomeBack') : t('account.createAccount')}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-soft">
        {mode === 'signin' ? t('account.signInSub') : t('account.signUpSub')}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
        {mode === 'signup' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">{t('account.fullName')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm outline-none focus:border-leaf-500"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">{t('account.email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm outline-none focus:border-leaf-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">{t('account.password')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm outline-none focus:border-leaf-500"
          />
        </div>

        {error && <p className="text-sm text-tomato-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-leaf-600 py-3 text-sm font-bold text-white transition hover:bg-leaf-700 disabled:opacity-60"
        >
          {submitting ? t('account.pleaseWait') : mode === 'signin' ? t('account.signIn') : t('account.createAccountBtn')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {mode === 'signin' ? t('account.noAccount') : t('account.haveAccount')}
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-semibold text-leaf-700 hover:underline"
        >
          {mode === 'signin' ? t('account.signUp') : t('account.signIn')}
        </button>
      </p>
    </div>
  )
}
