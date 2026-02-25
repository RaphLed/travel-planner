/**
 * Distance and travel time from origin. Geocode (Nominatim, free) once per origin;
 * then haversine for distance, rule-of-thumb for travel time. No paid APIs.
 */

const GEOCODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const geocodeCache = new Map<string, { lat: number; lng: number; ts: number }>();

export async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  const key = place.trim().toLowerCase();
  const hit = geocodeCache.get(key);
  if (hit && Date.now() - hit.ts < GEOCODE_CACHE_TTL_MS) {
    return { lat: hit.lat, lng: hit.lng };
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TravelPlanner/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data?.[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    geocodeCache.set(key, { lat, lng, ts: Date.now() });
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Haversine distance in km. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Approximate travel time in hours: flight ~800 km/h, else ~100 km/h. */
export function travelTimeHours(distanceKm: number, preferFlight: boolean): number {
  if (distanceKm <= 0) return 0;
  if (preferFlight && distanceKm > 400) return distanceKm / 800;
  return Math.min(distanceKm / 100, 24);
}
