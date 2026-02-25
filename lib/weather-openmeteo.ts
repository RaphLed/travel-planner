/**
 * Open-Meteo Climate API (free, no key) for monthly weather by lat/lng.
 * Used when user provides date range; results cached in memory to limit calls.
 * @see https://open-meteo.com/en/docs/climate-api
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CLIMATE_BASE = "https://climate-api.open-meteo.com/v1/climate";
const BATCH_SIZE = 10; // locations per request to stay under rate limits

type CachedRow = { avgTempC: number; avgRainfallMm: number; avgHumidityPct: number; ts: number };

const cache = new Map<string, CachedRow>();

function cacheKey(lat: number, lng: number, yearMonth: string): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)},${yearMonth}`;
}

export type WeatherSlice = {
  avgTempC: number;
  avgRainfallMm: number;
  avgHumidityPct: number;
};

export type DestWithCoords = { id: string; lat: number; lng: number };

/**
 * Fetch climate for a date range for multiple destinations. Uses one batched request
 * per BATCH_SIZE locations; results cached by (lat, lng, yearMonth).
 */
export async function getWeatherForDateRange(
  destinations: DestWithCoords[],
  dateFrom: string,
  dateTo: string
): Promise<Map<string, WeatherSlice>> {
  const out = new Map<string, WeatherSlice>();
  const withCoords = destinations.filter((d) => d.lat != null && d.lng != null);
  if (withCoords.length === 0) return out;

  const yearMonth = dateFrom.slice(0, 7);
  const toFetch: DestWithCoords[] = [];
  const now = Date.now();

  for (const d of withCoords) {
    const key = cacheKey(d.lat, d.lng, yearMonth);
    const hit = cache.get(key);
    if (hit && now - hit.ts < CACHE_TTL_MS) {
      out.set(d.id, { avgTempC: hit.avgTempC, avgRainfallMm: hit.avgRainfallMm, avgHumidityPct: hit.avgHumidityPct });
    } else {
      toFetch.push(d);
    }
  }

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const lats = batch.map((b) => b.lat).join(",");
    const lngs = batch.map((b) => b.lng).join(",");
    const url = `${CLIMATE_BASE}?latitude=${lats}&longitude=${lngs}&start_date=${dateFrom}&end_date=${dateTo}&daily=temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum&models=EC_Earth3P_HR`;
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{
        latitude: number;
        longitude: number;
        daily?: {
          temperature_2m_mean?: number[];
          relative_humidity_2m_mean?: number[];
          precipitation_sum?: number[];
        };
      }>;
      const list = Array.isArray(data) ? data : [data];
      for (let j = 0; j < batch.length && j < list.length; j++) {
        const dest = batch[j];
        const loc = list[j];
        const daily = loc?.daily;
        if (!daily?.temperature_2m_mean?.length) continue;
        const temps = daily.temperature_2m_mean;
        const hum = daily.relative_humidity_2m_mean ?? [];
        const precip = daily.precipitation_sum ?? [];
        const avgTempC = temps.reduce((a, b) => a + b, 0) / temps.length;
        const avgHumidityPct = hum.length ? hum.reduce((a, b) => a + b, 0) / hum.length : 0;
        const avgRainfallMm = precip.length ? precip.reduce((a, b) => a + b, 0) : 0;
        const slice: WeatherSlice = { avgTempC, avgRainfallMm, avgHumidityPct };
        out.set(dest.id, slice);
        cache.set(cacheKey(dest.lat, dest.lng, yearMonth), { ...slice, ts: now });
      }
    } catch {
      // skip batch on error
    }
  }

  return out;
}
