import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Check, Tag, X, Zap, CalendarClock, Minus, Plus, Trash2, ShoppingBasket, Truck, Store } from 'lucide-react'
import { useCart, itemKey, itemUnitPrice } from '@/hooks/use-cart'
import { useAuth } from '@/hooks/use-auth'
import { useMyAddresses } from '@/hooks/use-products'
import { LocationPicker } from '@/components/location-picker'
import { createOrder } from '@/data/orders'
import { saveAddress } from '@/data/addresses'
import { validatePromoCode } from '@/data/promo-codes'
import { promoCodeDiscount } from '@/lib/promo-code'
import { useI18n, localizedProductTitle } from '@/lib/i18n'
import { formatPrice, cn } from '@/lib/utils'
import type { Address } from '@/lib/types'

// Flat delivery fee — mirrors SHIPPING_FEE in src/data/orders.ts (server is the
// source of truth for the actual charge; this is just the checkout preview).
const SHIPPING_FEE = 1.5

const LEAD_MINUTES = 30
// Matches the site-wide "order before 4pm for same-day delivery" cutoff —
// ASAP delivery only makes sense while same-day is still fulfillable.
const SAME_DAY_CUTOFF_HOUR = 16
const localDate = (dayOffset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Fixed 2-hour delivery windows — today's remaining afternoon slots, then
// tomorrow morning through mid-afternoon. This is the store's actual fixed
// delivery schedule (replaces free-form date + half-hour-time picking).
const FIXED_SLOTS: { dayOffset: 0 | 1; startHour: number }[] = [
  { dayOffset: 0, startHour: 13 },
  { dayOffset: 0, startHour: 14 },
  { dayOffset: 0, startHour: 15 },
  { dayOffset: 0, startHour: 16 },
  { dayOffset: 0, startHour: 17 },
  { dayOffset: 1, startHour: 9 },
  { dayOffset: 1, startHour: 10 },
  { dayOffset: 1, startHour: 11 },
  { dayOffset: 1, startHour: 12 },
  { dayOffset: 1, startHour: 13 },
  { dayOffset: 1, startHour: 14 },
  { dayOffset: 1, startHour: 15 },
]
const hour12Label = (h: number) => {
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:00${h < 12 ? 'AM' : 'PM'}`
}
const fixedSlotWindows = (dayLabel: (dayOffset: 0 | 1) => string) => {
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  return FIXED_SLOTS.filter((w) => w.dayOffset !== 0 || w.startHour * 60 >= nowMinutes + LEAD_MINUTES).map(
    (w) => ({
      value: `${localDate(w.dayOffset)}T${String(w.startHour).padStart(2, '0')}:00`,
      label: `${dayLabel(w.dayOffset)} ${hour12Label(w.startHour)}-${hour12Label(w.startHour + 2)}`,
    }),
  )
}

export const Route = createFileRoute('/_store/checkout')({ component: Checkout })

function Checkout() {
  const { items, subtotal, clear, setQty, remove } = useCart()
  const { user } = useAuth()
  const { data: addresses = [] } = useMyAddresses(!!user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { t, locale } = useI18n()

  const [submitting, setSubmitting] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; type: string; value: number } | null>(null)
  const [checking, setChecking] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const customerNumberRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const asapAvailable = new Date().getHours() < SAME_DAY_CUTOFF_HOUR
  const [schedMode, setSchedMode] = useState<'asap' | 'schedule'>(() => (asapAvailable ? 'asap' : 'schedule'))
  const [scheduleSlot, setScheduleSlot] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery')
  const appliedDefault = useRef(false)
  const scheduledAt =
    fulfillmentMethod === 'delivery' && schedMode === 'schedule' ? scheduleSlot || null : null

  const availableFixedSlots = fixedSlotWindows((dayOffset) =>
    dayOffset === 0 ? t('checkout.today') : t('checkout.tomorrow'),
  )

  useEffect(() => {
    if (scheduleSlot && !availableFixedSlots.some((w) => w.value === scheduleSlot)) setScheduleSlot('')
  }, [scheduleSlot, availableFixedSlots])

  useEffect(() => {
    if (!asapAvailable && schedMode === 'asap') setSchedMode('schedule')
  }, [asapAvailable, schedMode])

  const applyAddress = (a: Address) => {
    if (nameRef.current) nameRef.current.value = a.recipient_name || user?.name || ''
    if (phoneRef.current) phoneRef.current.value = a.phone || ''
    if (addressRef.current) addressRef.current.value = a.address || ''
    if (cityRef.current) cityRef.current.value = a.city || ''
    setCoords(a.location_lat != null && a.location_lng != null ? { lat: a.location_lat, lng: a.location_lng } : null)
  }
  const clearAddressFields = () => {
    if (phoneRef.current) phoneRef.current.value = ''
    if (addressRef.current) addressRef.current.value = ''
    if (cityRef.current) cityRef.current.value = ''
    setCoords(null)
  }

  useEffect(() => {
    if (appliedDefault.current || !user || addresses.length === 0) return
    appliedDefault.current = true
    const a = addresses.find((x) => x.is_default) ?? addresses[0]
    setSelectedAddressId(a.id)
    if (nameRef.current) nameRef.current.value = a.recipient_name || user.name || ''
    if (phoneRef.current) phoneRef.current.value = a.phone || ''
    if (addressRef.current) addressRef.current.value = a.address || ''
    if (cityRef.current) cityRef.current.value = a.city || ''
    if (a.location_lat != null && a.location_lng != null) setCoords({ lat: a.location_lat, lng: a.location_lng })
  }, [user, addresses])

  const discount = applied ? promoCodeDiscount(applied.type, applied.value, subtotal) : 0
  const discountedSubtotal = Math.max(0, subtotal - discount)
  const shipping = fulfillmentMethod === 'pickup' || discountedSubtotal === 0 ? 0 : SHIPPING_FEE
  const total = discountedSubtotal + shipping

  const applyCode = async () => {
    const c = code.trim()
    if (!c) return
    setChecking(true)
    try {
      const r = await validatePromoCode({ data: { code: c, subtotal } })
      if (!r.valid) {
        setApplied(null)
        toast.error(r.message)
      } else if (r.discount <= 0) {
        setApplied(null)
        toast.error("This code doesn't apply to your cart.")
      } else {
        setApplied({ code: r.code, type: r.type, value: r.value })
        toast.success(`Code ${r.code} applied`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't apply code")
    } finally {
      setChecking(false)
    }
  }

  // Shared by the GPS button and dragging/clicking the map pin — keeps the
  // typed address in sync with wherever the pin actually ends up.
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
      )
      const data: {
        display_name?: string
        address?: { city?: string; town?: string; village?: string; suburb?: string; county?: string }
      } = await res.json()
      if (data.display_name && addressRef.current) addressRef.current.value = data.display_name
      const a = data.address ?? {}
      const city = a.city || a.town || a.village || a.suburb || a.county
      if (city && cityRef.current) cityRef.current.value = city
    } catch {
      // Geocoding failed — coordinates are still saved; customer can type the address.
    }
  }

  const handlePinMoved = (lat: number, lng: number) => {
    setCoords({ lat, lng })
    reverseGeocode(lat, lng)
  }

  const captureLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        await reverseGeocode(lat, lng)
        setLocating(false)
        toast.success(t('checkout.locationSuccess'))
      },
      (err) => {
        setLocating(false)
        toast.error(err.code === err.PERMISSION_DENIED ? t('checkout.locationDenied') : t('checkout.locationError'))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    if (fulfillmentMethod === 'delivery' && schedMode === 'schedule' && !scheduleSlot) {
      toast.error(t('checkout.pickASlot'))
      return
    }
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) {
      toast.error(t('checkout.pastTime'))
      return
    }
    setSubmitting(true)
    const orderItems = items.map((i) => ({
      id: i.variation?.id ?? i.product.id,
      title: i.variation
        ? `${localizedProductTitle(i.product, locale)} (${i.variation.weight})`
        : localizedProductTitle(i.product, locale),
      qty: i.qty,
    }))
    const customerName = nameRef.current?.value.trim() || (user?.name ?? '')
    const customerEmail = emailRef.current?.value.trim() ?? ''
    let res
    try {
      res = await createOrder({
        data: {
          items: orderItems,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: phoneRef.current?.value ?? '',
          customer_number: customerNumberRef.current?.value.trim() || null,
          address: fulfillmentMethod === 'pickup' ? '' : (addressRef.current?.value ?? ''),
          city: fulfillmentMethod === 'pickup' ? '' : (cityRef.current?.value ?? ''),
          location_lat: fulfillmentMethod === 'pickup' ? null : (coords?.lat ?? null),
          location_lng: fulfillmentMethod === 'pickup' ? null : (coords?.lng ?? null),
          promo_code: applied?.code ?? null,
          scheduled_at: scheduledAt,
          payment_method: 'cod',
          fulfillment_method: fulfillmentMethod,
        },
      })
    } catch (err) {
      setSubmitting(false)
      toast.error(err instanceof Error ? err.message : 'Failed to place order')
      return
    }
    setSubmitting(false)

    if (fulfillmentMethod === 'delivery' && user && selectedAddressId === null && saveNewAddress) {
      try {
        await saveAddress({
          data: {
            recipient_name: customerName,
            phone: phoneRef.current?.value ?? '',
            address: addressRef.current?.value ?? '',
            city: cityRef.current?.value ?? '',
            location_lat: coords?.lat ?? null,
            location_lng: coords?.lng ?? null,
            is_default: addresses.length === 0,
          },
        })
        qc.invalidateQueries({ queryKey: ['my-addresses'] })
      } catch {
        // Non-fatal: the order is already placed; saving the address is a convenience.
      }
    }

    try {
      sessionStorage.setItem(
        'phsar-ichiba:last-order',
        JSON.stringify({
          id: res.id,
          total: res.total,
          items: orderItems.map((i) => ({ ...i, price: itemUnitPrice(items.find((x) => (x.variation?.id ?? x.product.id) === i.id)!) })),
          customer_name: customerName,
          customer_email: customerEmail,
          created_at: new Date().toISOString(),
        }),
      )
    } catch {
      // sessionStorage unavailable — the thank-you page falls back to a generic message.
    }
    clear()
    navigate({ to: '/thank-you' })
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingBasket className="h-16 w-16 text-leaf-300" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-bold text-ink">{t('checkout.emptyCart')}</h1>
        <Link to="/shop" className="mt-2 rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={placeOrder} className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t('checkout.title')}</h1>

        <section className="space-y-4 rounded-2xl bg-leaf-50 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">{t('checkout.deliveryDetails')}</h2>

          <div>
            <label className={labelCls}>{t('checkout.fulfillmentMethod')}</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'delivery', label: t('checkout.delivery'), icon: Truck },
                  { key: 'pickup', label: t('checkout.pickup'), icon: Store },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFulfillmentMethod(opt.key)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                    fulfillmentMethod === opt.key
                      ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                      : 'border-leaf-200 text-ink-soft hover:bg-white',
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
            {fulfillmentMethod === 'pickup' && (
              <p className="mt-2 text-xs text-ink-soft">{t('checkout.pickupNote')}</p>
            )}
          </div>

          {fulfillmentMethod === 'delivery' && user && addresses.length > 0 && (
            <div className="space-y-2">
              <label className={labelCls}>{t('checkout.savedAddresses')}</label>
              <div className="flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddressId(a.id)
                      applyAddress(a)
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition',
                      selectedAddressId === a.id
                        ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                        : 'border-leaf-200 text-ink-soft hover:bg-white',
                    )}
                  >
                    {a.label || a.address.slice(0, 24)}
                    {a.is_default ? ' · Default' : ''}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAddressId(null)
                    clearAddressFields()
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition',
                    selectedAddressId === null
                      ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                      : 'border-leaf-200 text-ink-soft hover:bg-white',
                  )}
                >
                  {t('checkout.newAddress')}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('checkout.fullName')}</label>
              <input ref={nameRef} required defaultValue={user?.name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('checkout.email')}</label>
              <input ref={emailRef} required type="email" defaultValue={user?.email ?? ''} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('checkout.phone')}</label>
              <input ref={phoneRef} required type="tel" placeholder={t('checkout.phonePlaceholder')} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('checkout.customerNumber')}</label>
              <input
                ref={customerNumberRef}
                required
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '')
                  if (digitsOnly !== e.target.value) e.target.value = digitsOnly
                }}
                placeholder={t('checkout.customerNumberPlaceholder')}
                className={inputCls}
              />
            </div>
            {fulfillmentMethod === 'delivery' && (
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('checkout.address')}</label>
                <div className="flex gap-2">
                  <input
                    ref={addressRef}
                    required
                    placeholder={t('checkout.addressPlaceholder')}
                    className={cn(inputCls, 'min-w-0 flex-1')}
                  />
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={locating}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-leaf-200 px-3.5 py-2 text-sm font-medium text-ink hover:bg-leaf-100 disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" />
                    {locating ? t('checkout.locating') : coords ? t('checkout.pinned') : t('checkout.pinLocation')}
                  </button>
                </div>
                {coords && (
                  <a
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-leaf-700 hover:underline"
                  >
                    <Check className="h-4 w-4" /> {t('checkout.viewOnMap')}
                  </a>
                )}
                <p className="mt-2 text-xs text-ink-soft">{t('checkout.dragPinHint')}</p>
                <div className="mt-2">
                  <LocationPicker lat={coords?.lat ?? null} lng={coords?.lng ?? null} onChange={handlePinMoved} />
                </div>
              </div>
            )}
            {fulfillmentMethod === 'delivery' && (
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('checkout.city')}</label>
                <input ref={cityRef} required className={inputCls} />
              </div>
            )}
            {fulfillmentMethod === 'delivery' && user && selectedAddressId === null && (
              <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={saveNewAddress}
                  onChange={(e) => setSaveNewAddress(e.target.checked)}
                  className="h-4 w-4 rounded border-leaf-300 text-leaf-600 focus:ring-leaf-500"
                />
                {t('checkout.saveAddress')}
              </label>
            )}

            {fulfillmentMethod === 'delivery' && (
              <div className="sm:col-span-2">
                <label className={labelCls}>{t('checkout.deliveryTime')}</label>
                <div className={cn('mt-1.5 grid gap-2', asapAvailable ? 'grid-cols-2' : 'grid-cols-1')}>
                  {(
                    [
                      ...(asapAvailable ? [{ key: 'asap', label: t('checkout.asap'), icon: Zap }] as const : []),
                      { key: 'schedule', label: t('checkout.schedule'), icon: CalendarClock },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSchedMode(opt.key)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                        schedMode === opt.key
                          ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                          : 'border-leaf-200 text-ink-soft hover:bg-white',
                      )}
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {schedMode === 'schedule' && (
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableFixedSlots.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => setScheduleSlot(w.value)}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-xs font-medium transition',
                            scheduleSlot === w.value
                              ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                              : 'border-leaf-200 text-ink-soft hover:bg-white',
                          )}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                    {!scheduleSlot && <p className="mt-2 text-xs text-ink-soft">{t('checkout.pickASlot')}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-leaf-50 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">{t('checkout.paymentMethod')}</h2>
          <div className="flex items-start gap-3 rounded-xl border border-leaf-600 bg-leaf-100 px-4 py-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-leaf-700" />
            <span>
              <span className="block text-sm font-semibold text-ink">
                {fulfillmentMethod === 'pickup' ? t('checkout.cashOnPickup') : t('checkout.cod')}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {fulfillmentMethod === 'pickup' ? t('checkout.cashOnPickupDesc') : t('checkout.codDesc')}
              </span>
            </span>
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-leaf-600 py-3.5 text-sm font-semibold text-white transition hover:bg-leaf-700 disabled:opacity-60"
        >
          {submitting ? t('checkout.placingOrder') : t('checkout.placeOrder', { total: formatPrice(total) })}
        </button>
      </form>

      <aside className="h-fit space-y-4 rounded-2xl bg-leaf-50 p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-ink">{t('cart.orderSummary')}</h2>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {items.map((item) => {
            const key = itemKey(item)
            const unit = itemUnitPrice(item)
            const title = localizedProductTitle(item.product, locale)
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={title}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-leaf-100">
                    <ShoppingBasket className="h-4 w-4 text-leaf-400" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {title}
                    {item.variation ? ` (${item.variation.weight})` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">{t('cart.priceEach', { price: formatPrice(unit) })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-leaf-200 bg-white">
                  <button type="button" onClick={() => setQty(key, item.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-leaf-50">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-semibold">{item.qty}</span>
                  <button type="button" onClick={() => setQty(key, item.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-leaf-50">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right font-bold text-leaf-700">{formatPrice(unit * item.qty)}</span>
                <button type="button" onClick={() => remove(key)} className="shrink-0 text-ink-soft/60 hover:text-tomato-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="border-t border-leaf-200 pt-4">
          {applied ? (
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-leaf-700">
                <Tag className="h-4 w-4" /> {applied.code}
              </span>
              <button
                type="button"
                onClick={() => {
                  setApplied(null)
                  setCode('')
                }}
                className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-tomato-500"
              >
                <X className="h-3.5 w-3.5" /> {t('checkout.remove')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyCode()
                  }
                }}
                placeholder={t('checkout.promoCode')}
                className={cn(inputCls, 'min-w-0 flex-1 uppercase')}
              />
              <button
                type="button"
                onClick={applyCode}
                disabled={checking || !code.trim()}
                className="shrink-0 rounded-full border border-leaf-200 px-4 py-2 text-sm font-medium text-ink hover:bg-white disabled:opacity-60"
              >
                {checking ? '…' : t('checkout.apply')}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-leaf-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">{t('cart.subtotal')}</span>
            <span className="text-ink">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-leaf-700">
              <span>
                {t('checkout.discount')}
                {applied ? ` (${applied.code})` : ''}
              </span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink-soft">{t('checkout.shipping')}</span>
            <span className="text-ink">{formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-leaf-200 pt-2 font-display text-lg font-bold text-ink">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft'
const inputCls =
  'w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500'
