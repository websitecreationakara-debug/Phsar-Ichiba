import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Default center: Phnom Penh — used when no coordinates are set yet.
const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282];

// A small custom pin (not Leaflet's default marker image, which needs asset-path
// workarounds under bundlers) — matches the storefront's leaf-green brand color.
const PIN_HTML = `
  <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="#3b7d20"/>
    <circle cx="16" cy="16" r="7" fill="#f0f9e8"/>
  </svg>
`;

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  // Keep the latest onChange without re-running map setup on every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
      const map = L.map(containerRef.current, {
        center,
        zoom: lat != null && lng != null ? 16 : 12,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: PIN_HTML,
        className: "",
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });
      const marker = L.marker(center, { icon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Map is created once; lat/lng updates are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center the map and marker when coordinates change from outside
  // (e.g. the GPS button), without tearing down the map.
  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 16));
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      // relative + z-0 gives this its own stacking context, so Leaflet's
      // internal panes/controls (which use z-index up to 1000 internally)
      // stay contained here instead of escaping to paint over the sticky
      // header (z-40) once the page scrolls.
      className="relative z-0 h-56 w-full overflow-hidden rounded-xl border border-leaf-200"
      // Leaflet needs an explicit non-zero size before it initializes correctly.
      style={{ minHeight: 224 }}
    />
  );
}
