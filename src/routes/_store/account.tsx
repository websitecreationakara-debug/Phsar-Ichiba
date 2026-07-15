import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { User, LogOut, Mail, Lock, KeyRound, MapPin, Package, FileDown } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { authClient } from '@/lib/auth-client'
import { useMyOrders } from '@/hooks/use-products'
import { downloadInvoice } from '@/lib/invoice'
import { useI18n } from '@/lib/i18n'
import { formatPrice, cn } from '@/lib/utils'

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
    return <SignedInAccount user={user} onSignOut={signOut} requestPasswordReset={requestPasswordReset} resetPasswordWithOtp={resetPasswordWithOtp} />
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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-carrot-100 text-carrot-700',
  processing: 'bg-carrot-100 text-carrot-700',
  shipped: 'bg-leaf-100 text-leaf-800',
  completed: 'bg-leaf-100 text-leaf-800',
  cancelled: 'bg-tomato-100 text-tomato-700',
  awaiting_payment: 'bg-carrot-100 text-carrot-700',
}

function SignedInAccount({
  user,
  onSignOut,
  requestPasswordReset,
  resetPasswordWithOtp,
}: {
  user: { id: string; name: string | null; email: string }
  onSignOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  resetPasswordWithOtp: (email: string, otp: string, password: string) => Promise<{ error: string | null }>
}) {
  const { t } = useI18n()
  const { data: orders = [], isLoading: ordersLoading } = useMyOrders(true)

  const [name, setName] = useState(user.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Whether the account has a password (credential provider). Google-only
  // accounts don't, so they can't "change" a password — they set one via a code.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [resetCode, setResetCode] = useState('')

  useEffect(() => {
    let active = true
    authClient
      .listAccounts()
      .then((res) => {
        if (active) setHasPassword((res.data ?? []).some((a) => a.providerId === 'credential'))
      })
      .catch(() => {
        if (active) setHasPassword(false)
      })
    return () => {
      active = false
    }
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t('account.nameRequired'))
      return
    }
    setSavingProfile(true)
    const { error } = await authClient.updateUser({ name: trimmed })
    setSavingProfile(false)
    if (error) toast.error(error.message ?? t('account.profileUpdateFailed'))
    else toast.success(t('account.profileUpdated'))
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('account.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordMismatch'))
      return
    }
    setChangingPw(true)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    })
    setChangingPw(false)
    if (error) {
      toast.error(error.message ?? t('account.passwordUpdateFailed'))
      return
    }
    toast.success(t('account.passwordUpdated'))
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const sendResetCode = async () => {
    setSendingCode(true)
    const { error } = await requestPasswordReset(user.email)
    setSendingCode(false)
    if (error) {
      toast.error(error)
      return
    }
    setCodeSent(true)
    toast.success(t('account.codeSent', { email: user.email }))
  }

  const setPasswordViaCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('account.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('account.passwordMismatch'))
      return
    }
    setChangingPw(true)
    const { error } = await resetPasswordWithOtp(user.email, resetCode.trim(), newPassword)
    setChangingPw(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success(t('account.passwordSet'))
    setHasPassword(true)
    setCodeSent(false)
    setResetCode('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 md:py-12">
      <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">{t('account.title')}</h1>

      {/* Profile */}
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-5 md:p-6">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">{t('account.profile')}</h2>
        </div>
        <div>
          <label className={labelCls}>{t('account.displayName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('account.email')}</label>
          <div className="flex items-center gap-2 rounded-lg border border-leaf-100 bg-leaf-50 px-3 py-2 text-sm text-ink-soft">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">{t('account.emailLocked')}</p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingProfile} className="rounded-full bg-leaf-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60">
            {savingProfile ? t('account.saving') : t('account.saveChanges')}
          </button>
        </div>
      </form>

      {/* Password */}
      <div className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">{t('account.password')}</h2>
        </div>

        {hasPassword === null ? (
          <p className="text-sm text-ink-soft">{t('shop.loading')}</p>
        ) : hasPassword ? (
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className={labelCls}>{t('account.currentPassword')}</label>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{t('account.newPassword')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('account.confirmNewPassword')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-ink-soft">{t('account.passwordHint')}</p>
            <div className="flex justify-end">
              <button type="submit" disabled={changingPw} className="rounded-full bg-leaf-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60">
                {changingPw ? t('account.updating') : t('account.changePassword')}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-leaf-50 p-4 text-sm">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" />
              <p className="text-ink-soft">
                {t('account.googleOnlyNotice', { email: user.email })}
              </p>
            </div>
            {!codeSent ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={sendResetCode}
                  disabled={sendingCode}
                  className="rounded-full bg-leaf-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
                >
                  {sendingCode ? t('account.sending') : t('account.sendCodeToSetPassword')}
                </button>
              </div>
            ) : (
              <form onSubmit={setPasswordViaCode} className="space-y-4">
                <div>
                  <label className={labelCls}>{t('account.verificationCode')}</label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-ink-soft">{t('account.enterCodeSentTo', { email: user.email })}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t('account.newPassword')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('account.confirmNewPassword')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={sendResetCode} className="text-sm font-semibold text-leaf-700 hover:underline">
                    {t('account.resendCode')}
                  </button>
                  <button type="submit" disabled={changingPw} className="rounded-full bg-leaf-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60">
                    {changingPw ? t('account.updating') : t('account.setPassword')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="flex items-center justify-between rounded-2xl border border-leaf-100 bg-white p-5 md:p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">{t('account.addresses')}</h2>
        </div>
        <Link to="/addresses" className="rounded-full border border-leaf-200 px-4 py-2 text-sm font-semibold text-ink hover:bg-leaf-50">
          {t('account.manageAddresses')}
        </Link>
      </div>

      {/* Order history */}
      <div className="space-y-4 rounded-2xl border border-leaf-100 bg-white p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">{t('account.orderHistory')}</h2>
        </div>
        {ordersLoading ? (
          <p className="text-sm text-ink-soft">{t('shop.loading')}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('account.noOrders')}</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-leaf-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm text-ink">#{o.id.slice(0, 8).toUpperCase()}</span>
                    <span className="ml-2 text-xs text-ink-soft">{new Date(o.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={cn('rounded px-2 py-0.5 text-xs font-bold uppercase', STATUS_STYLES[o.status] ?? 'bg-leaf-50 text-ink-soft')}>
                    {o.status}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm text-ink-soft">
                  {o.items.map((it) => `${it.title} ×${it.qty}`).join(', ')}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-leaf-100 pt-3">
                  <span className="font-display text-base font-bold text-ink">{formatPrice(o.total)}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await downloadInvoice(o)
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : t('account.invoiceFailed'))
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-leaf-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-leaf-50"
                  >
                    <FileDown className="h-3.5 w-3.5" /> {t('thankyou.invoice')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => onSignOut()}
          className="inline-flex items-center gap-2 rounded-full border border-leaf-200 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-leaf-50"
        >
          <LogOut className="h-4 w-4" /> {t('account.signOut')}
        </button>
      </div>
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
