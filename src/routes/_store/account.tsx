import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/lib/i18n'

export const Route = createFileRoute('/_store/account')({ component: AccountPage })

type Step = 'form' | 'verify' | 'reset-request' | 'reset-verify'

const inputCls =
  'w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500'
const labelCls = 'mb-1 block text-sm font-medium text-ink'
const otpCls =
  'w-full rounded-lg border border-leaf-200 px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-ink outline-none focus:border-leaf-500'
const primaryBtnCls =
  'w-full rounded-full bg-leaf-600 py-3 text-sm font-bold text-white transition hover:bg-leaf-700 disabled:opacity-60'

function AccountPage() {
  const { user, loading, signIn, signUp, signOut, signInWithGoogle, verifyEmailOtp, resendOtp, requestPasswordReset, resetPasswordWithOtp } =
    useAuth()
  const { t } = useI18n()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const result = await signInWithGoogle()
    if (result.error) {
      setError(result.error)
      setGoogleLoading(false)
    }
    // On success the browser is redirected to Google, so no further local state change needed.
  }

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
    if (mode === 'signin') {
      const result = await signIn(email, password)
      if (result.error) {
        // Unverified accounts can't sign in yet — send a fresh code and go verify.
        if (/verif/i.test(result.error)) {
          setPendingEmail(email)
          const resend = await resendOtp(email)
          setStep('verify')
          if (resend.error) setError(resend.error)
        } else {
          setError(result.error)
        }
      }
    } else {
      const result = await signUp(email, password, name)
      if (result.error) setError(result.error)
      else {
        setPendingEmail(email)
        setStep('verify')
      }
    }
    setSubmitting(false)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await verifyEmailOtp(pendingEmail, code.trim())
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    // verify-email confirms the address but doesn't create a session — sign in to land them in.
    const signInRes = await signIn(pendingEmail, password)
    if (signInRes.error) {
      setStep('form')
      setMode('signin')
    }
    setSubmitting(false)
  }

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return
    setSubmitting(true)
    const result = await requestPasswordReset(email)
    setSubmitting(false)
    if (result.error) return setError(result.error)
    setPendingEmail(email)
    setCode('')
    setNewPassword('')
    setStep('reset-verify')
  }

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await resetPasswordWithOtp(pendingEmail, code.trim(), newPassword)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    // Reset verifies the email too, so signing in straight away works.
    const signInRes = await signIn(pendingEmail, newPassword)
    if (signInRes.error) {
      setStep('form')
      setMode('signin')
      setCode('')
      setNewPassword('')
    }
    setSubmitting(false)
  }

  if (step === 'verify') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-center font-display text-2xl font-bold text-ink">{t('account.verifyTitle')}</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">{t('account.verifySub', { email: pendingEmail })}</p>
        <form onSubmit={verify} className="mt-6 space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
          <div>
            <label className={labelCls}>{t('account.verificationCode')}</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={otpCls}
            />
          </div>
          {error && <p className="text-sm text-tomato-600">{error}</p>}
          <button type="submit" disabled={submitting || code.length < 6} className={primaryBtnCls}>
            {submitting ? t('account.verifying') : t('account.verifyBtn')}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={async () => {
              const result = await resendOtp(pendingEmail)
              setError(result.error)
            }}
            className="font-semibold text-leaf-700 hover:underline"
          >
            {t('account.resendCode')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form')
              setCode('')
            }}
            className="text-ink-soft hover:text-ink"
          >
            {t('account.useDifferentEmail')}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'reset-request') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-center font-display text-2xl font-bold text-ink">{t('account.resetTitle')}</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">{t('account.resetSub')}</p>
        <form onSubmit={requestReset} className="mt-6 space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
          <div>
            <label className={labelCls}>{t('account.email')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="text-sm text-tomato-600">{error}</p>}
          <button type="submit" disabled={submitting} className={primaryBtnCls}>
            {submitting ? t('account.sending') : t('account.sendResetCode')}
          </button>
        </form>
        <button type="button" onClick={() => setStep('form')} className="mt-4 text-sm text-ink-soft hover:text-ink">
          {t('account.backToSignIn')}
        </button>
      </div>
    )
  }

  if (step === 'reset-verify') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-center font-display text-2xl font-bold text-ink">{t('account.resetVerifyTitle')}</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">{t('account.resetVerifySub', { email: pendingEmail })}</p>
        <form onSubmit={doReset} className="mt-6 space-y-4 rounded-2xl border border-leaf-100 bg-white p-6">
          <div>
            <label className={labelCls}>{t('account.verificationCode')}</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={otpCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('account.newPassword')}</label>
            <input
              type="password"
              required
              placeholder="8+ characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          {error && <p className="text-sm text-tomato-600">{error}</p>}
          <button type="submit" disabled={submitting || code.length < 6} className={primaryBtnCls}>
            {submitting ? t('account.resetting') : t('account.resetBtn')}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={async () => {
              const result = await requestPasswordReset(pendingEmail)
              setError(result.error)
            }}
            className="font-semibold text-leaf-700 hover:underline"
          >
            {t('account.resendCode')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form')
              setCode('')
              setNewPassword('')
            }}
            className="text-ink-soft hover:text-ink"
          >
            {t('account.backToSignIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-display text-2xl font-bold text-ink">
        {mode === 'signin' ? t('account.welcomeBack') : t('account.createAccount')}
      </h1>
      <p className="mt-1 text-center text-sm text-ink-soft">
        {mode === 'signin' ? t('account.signInSub') : t('account.signUpSub')}
      </p>

      <div className="mt-6 rounded-2xl border border-leaf-100 bg-white p-6">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-leaf-200 py-3 text-sm font-semibold text-ink transition hover:bg-leaf-50 disabled:opacity-60"
        >
          <GoogleIcon className="h-4 w-4" />
          {t('account.continueWithGoogle')}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-leaf-100" />
          {t('account.orDivider')}
          <span className="h-px flex-1 bg-leaf-100" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className={labelCls}>{t('account.fullName')}</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>{t('account.email')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('account.password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>

          {mode === 'signin' && (
            <div className="text-right text-sm">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep('reset-request')
                }}
                className="font-semibold text-leaf-700 hover:underline"
              >
                {t('account.forgotPassword')}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-tomato-600">{error}</p>}

          <button type="submit" disabled={submitting} className={primaryBtnCls}>
            {submitting ? t('account.pleaseWait') : mode === 'signin' ? t('account.signIn') : t('account.createAccountBtn')}
          </button>
        </form>
      </div>

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A11.999 11.999 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}
