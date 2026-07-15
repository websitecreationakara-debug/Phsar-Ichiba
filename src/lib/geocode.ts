export type ReverseGeocodeResult = { display_name?: string; city?: string }

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`,
    )
    const data: {
      display_name?: string
      address?: { city?: string; town?: string; village?: string; suburb?: string; county?: string }
    } = await res.json()
    const a = data.address ?? {}
    return { display_name: data.display_name, city: a.city || a.town || a.village || a.suburb || a.county }
  } catch {
    return {}
  }
}

export type GeocodeSearchResult = { lat: number; lng: number; display_name: string }

export async function searchAddress(query: string): Promise<GeocodeSearchResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&accept-language=en`,
  )
  const data: { lat: string; lon: string; display_name: string }[] = await res.json()
  return data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), display_name: d.display_name }))
}
