import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Plus, Pencil, Trash2, Star, User, Check } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useMyAddresses } from '@/hooks/use-products'
import { saveAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/data/addresses'
import { Modal } from '@/components/admin/modal'
import { LocationPicker } from '@/components/location-picker'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Address } from '@/lib/types'

export const Route = createFileRoute('/_store/addresses')({ component: MyAddresses })

type AddressForm = {
  label: string
  recipient_name: string
  phone: string
  address: string
  city: string
  is_default: boolean
  location_lat: number | null
  location_lng: number | null
}

const emptyForm: AddressForm = {
  label: '',
  recipient_name: '',
  phone: '',
  address: '',
  city: '',
  is_default: false,
  location_lat: null,
  location_lng: null,
}

const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft'
const inputCls =
  'w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500'

function MyAddresses() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const { user, loading: authLoading } = useAuth()
  const { data: addresses = [], isLoading } = useMyAddresses(!!user)
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-addresses'] })

  const openNew = () => {
    setForm({ ...emptyForm, recipient_name: user?.name ?? '', is_default: addresses.length === 0 })
    setEditing('new')
  }
  const openEdit = (a: Address) => {
    setForm({
      label: a.label ?? '',
      recipient_name: a.recipient_name ?? '',
      phone: a.phone ?? '',
      address: a.address ?? '',
      city: a.city ?? '',
      is_default: a.is_default,
      location_lat: a.location_lat,
      location_lng: a.location_lng,
    })
    setEditing(a)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.address.trim()) {
      toast.error(t('addresses.addressRequired'))
      return
    }
    setSaving(true)
    try {
      if (editing && editing !== 'new') {
        await updateAddress({ data: { id: editing.id, ...form } })
      } else {
        await saveAddress({ data: { ...form } })
      }
      await invalidate()
      setEditing(null)
      toast.success(t('addresses.saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('addresses.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (id: string) => {
    try {
      await setDefaultAddress({ data: { id } })
      await invalidate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('addresses.updateFailed'))
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteAddress({ data: { id } })
      await invalidate()
      toast.success(t('addresses.removed'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('addresses.removeFailed'))
    }
  }

  // Shared by the GPS button and dragging/clicking the map pin.
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
      )
      const data: {
        display_name?: string
        address?: { city?: string; town?: string; village?: string; suburb?: string; county?: string }
      } = await res.json()
      const addr = data.address ?? {}
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county
      setForm((f) => ({
        ...f,
        location_lat: lat,
        location_lng: lng,
        address: data.display_name || f.address,
        city: city || f.city,
      }))
    } catch {
      // Geocoding failed — coordinates are still saved; the typed address stands.
      setForm((f) => ({ ...f, location_lat: lat, location_lng: lng }))
    }
  }

  const handlePinMoved = (lat: number, lng: number) => {
    reverseGeocode(lat, lng)
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('checkout.locationUnsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
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

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink-soft">{t('shop.loading')}</div>
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <User className="h-16 w-16 text-leaf-300" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-bold text-ink">{t('addresses.signInTitle')}</h1>
        <p className="text-ink-soft">{t('addresses.signInSub')}</p>
        <Link to="/account" className="mt-2 rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700">
          {t('account.signIn')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">{t('addresses.title')}</h1>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-leaf-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700"
        >
          <Plus className="h-4 w-4" /> {t('addresses.add')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-ink-soft">{t('shop.loading')}</p>
      ) : addresses.length === 0 ? (
        <div className="rounded-3xl bg-leaf-50 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <MapPin className="h-7 w-7 text-ink-soft" />
          </div>
          <p className="font-display text-xl font-semibold text-ink">{t('addresses.empty')}</p>
          <p className="mt-1 text-sm text-ink-soft">{t('addresses.emptySub')}</p>
          <button
            type="button"
            onClick={openNew}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-leaf-600 px-6 py-3 text-sm font-semibold text-white hover:bg-leaf-700"
          >
            <Plus className="h-4 w-4" /> {t('addresses.addFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-leaf-100 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{a.label || t('addresses.defaultLabel')}</p>
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-800">
                    <Star className="h-3 w-3 fill-current" /> {t('addresses.default')}
                  </span>
                )}
              </div>
              {a.recipient_name && <p className="mt-1 text-sm text-ink-soft">{a.recipient_name}</p>}
              {a.phone && <p className="text-sm text-ink-soft">{a.phone}</p>}
              <p className="mt-2 text-sm text-ink">{a.address}</p>
              {a.city && <p className="text-sm text-ink-soft">{a.city}</p>}
              {a.location_lat != null && a.location_lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${a.location_lat},${a.location_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-leaf-700 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" /> {t('addresses.viewOnMap')}
                </a>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-leaf-100 pt-4">
                {!a.is_default && (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-leaf-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-leaf-50"
                  >
                    <Star className="h-4 w-4" /> {t('addresses.setDefault')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-leaf-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-leaf-50"
                >
                  <Pencil className="h-4 w-4" /> {t('addresses.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-tomato-600"
                >
                  <Trash2 className="h-4 w-4" /> {t('addresses.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing && editing !== 'new' ? t('addresses.editTitle') : t('addresses.addTitle')}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('addresses.label')}</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={t('addresses.labelPlaceholder')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('checkout.fullName')}</label>
              <input
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('checkout.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t('checkout.phonePlaceholder')}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('checkout.address')}</label>
              <div className="flex gap-2">
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  {locating ? t('checkout.locating') : form.location_lat != null ? t('checkout.pinned') : t('checkout.pinLocation')}
                </button>
              </div>
              {form.location_lat != null && (
                <a
                  href={`https://www.google.com/maps?q=${form.location_lat},${form.location_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-leaf-700 hover:underline"
                >
                  <Check className="h-4 w-4" /> {t('checkout.viewOnMap')}
                </a>
              )}
              <p className="mt-2 text-xs text-ink-soft">{t('checkout.dragPinHint')}</p>
              <div className="mt-2">
                <LocationPicker lat={form.location_lat} lng={form.location_lng} onChange={handlePinMoved} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t('checkout.city')}</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-leaf-300 text-leaf-600 focus:ring-leaf-500"
            />
            {t('addresses.setAsDefault')}
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-leaf-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
            >
              {saving ? t('addresses.saving') : t('addresses.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
