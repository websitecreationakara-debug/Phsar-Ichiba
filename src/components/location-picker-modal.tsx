import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Search, Crosshair, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/admin/modal'
import { reverseGeocode, searchAddress } from '@/lib/geocode'
import type { ReverseGeocodeResult, GeocodeSearchResult } from '@/lib/geocode'
import { useI18n } from '@/lib/i18n'

export type Coords = { lat: number; lng: number }

// Phnom Penh — sensible default center when the customer has no existing pin.
const DEFAULT_CENTER: Coords = { lat: 11.5564, lng: 104.9282 }

let iconsPatched = false

export function LocationPickerModal({
  open,
  initialCoords,
  onClose,
  onConfirm,
}: {
  open: boolean
  initialCoords: Coords | null
  onClose: () => void
  onConfirm: (coords: Coords, info: ReverseGeocodeResult) => void
}) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [ready, setReady] = useState(false)
  const [coords, setCoords] = useState<Coords>(initialCoords ?? DEFAULT_CENTER)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [locating, setLocating] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Reset transient state each time the picker is opened.
  useEffect(() => {
    if (!open) return
    setCoords(initialCoords ?? DEFAULT_CENTER)
    setResults([])
    setQuery('')
    setSearched(false)
  }, [open, initialCoords])

  // Leaflet touches `window` at import time, so it must load only on the client,
  // once the modal (and its container div) actually exists in the DOM.
  useEffect(() => {
    if (!open) return
    let disposed = false
    const start = initialCoords ?? DEFAULT_CENTER

    import('leaflet').then((mod) => {
      if (disposed || !containerRef.current) return
      const L = mod.default

      if (!iconsPatched) {
        delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
        L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })
        iconsPatched = true
      }

      const map = L.map(containerRef.current).setView([start.lat, start.lng], initialCoords ? 16 : 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        setCoords({ lat: pos.lat, lng: pos.lng })
      })
      map.on('click', (e: LeafletMouseEvent) => {
        marker.setLatLng(e.latlng)
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
      })

      mapRef.current = map
      markerRef.current = marker
      setReady(true)
      requestAnimationFrame(() => map.invalidateSize())
    })

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      setReady(false)
    }
  }, [open, initialCoords])

  const flyTo = (next: Coords) => {
    setCoords(next)
    markerRef.current?.setLatLng([next.lat, next.lng])
    mapRef.current?.setView([next.lat, next.lng], 16)
  }

  const runSearch = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults([])
    try {
      setResults(await searchAddress(q))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }

  const useMyLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        toast.error(err.code === err.PERMISSION_DENIED ? t('checkout.locationDenied') : t('checkout.locationError'))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const pickResult = (r: GeocodeSearchResult) => {
    flyTo({ lat: r.lat, lng: r.lng })
    setResults([])
    setQuery(r.display_name)
  }

  const confirm = async () => {
    setConfirming(true)
    const info = await reverseGeocode(coords.lat, coords.lng)
    setConfirming(false)
    onConfirm(coords, info)
  }

  return (
    <Modal open={open} onClose={onClose} title={t('checkout.pinLocationTitle')} maxWidth="max-w-2xl">
      <div className="space-y-3">
        <form onSubmit={runSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearched(false)
            }}
            placeholder={t('checkout.mapSearchPlaceholder')}
            className="w-full min-w-0 flex-1 rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-leaf-200 px-3.5 py-2 text-sm font-medium text-ink hover:bg-leaf-100 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {searching ? t('checkout.searching') : t('checkout.mapSearch')}
          </button>
        </form>

        {results.length > 0 && (
          <ul className="max-h-40 overflow-y-auto rounded-lg border border-leaf-100">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full truncate px-3 py-2 text-left text-sm text-ink hover:bg-leaf-50"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searched && !searching && results.length === 0 && (
          <p className="text-sm text-ink-soft">{t('checkout.noResults')}</p>
        )}

        <div className="relative h-72 w-full overflow-hidden rounded-xl border border-leaf-200 sm:h-96">
          <div ref={containerRef} className="h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-leaf-50">
              <Loader2 className="h-6 w-6 animate-spin text-leaf-500" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 hover:underline disabled:opacity-60"
          >
            <Crosshair className="h-4 w-4" />
            {locating ? t('checkout.locating') : t('checkout.useMyLocation')}
          </button>
          <p className="text-xs text-ink-soft">{t('checkout.mapHint')}</p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={confirm}
            disabled={confirming}
            className="inline-flex items-center gap-1.5 rounded-full bg-leaf-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {confirming ? t('checkout.confirming') : t('checkout.confirmPin')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
