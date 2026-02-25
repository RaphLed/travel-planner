import {
  filterAndSortDestinations,
  type Destination,
  type DestinationsSortKey,
} from "@/lib/destinations";
import { geocode, haversineKm, travelTimeHours } from "@/lib/distance";
import { getWeatherForDateRange } from "@/lib/weather-openmeteo";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const maxTravelTimeHours = sp.get("maxTravelTimeHours");
    const minTemp = sp.get("minTemp");
    const maxTemp = sp.get("maxTemp");
    const maxRainfall = sp.get("maxRainfall");
    const minSafety = sp.get("minSafety");
    const maxPriciness = sp.get("maxPriciness");
    const travelMode = sp.get("travelMode");
    const region = sp.get("region");
    const sortBy = sp.get("sortBy");
    const sortOrder = sp.get("sortOrder");
    const origin = sp.get("origin")?.trim() || undefined;
    const dateFrom = sp.get("date_from")?.trim() || undefined;
    const dateTo = sp.get("date_to")?.trim() || undefined;

    let list = filterAndSortDestinations({
      maxTravelTimeHours: maxTravelTimeHours ? Number(maxTravelTimeHours) : undefined,
      minTemp: minTemp != null && minTemp !== "" ? Number(minTemp) : undefined,
      maxTemp: maxTemp != null && maxTemp !== "" ? Number(maxTemp) : undefined,
      maxRainfall: maxRainfall != null && maxRainfall !== "" ? Number(maxRainfall) : undefined,
      minSafety: minSafety != null && minSafety !== "" ? Number(minSafety) : undefined,
      maxPriciness: maxPriciness != null && maxPriciness !== "" ? Number(maxPriciness) : undefined,
      travelMode: travelMode || undefined,
      region: region && region !== "all" ? region : undefined,
      sortBy: (sortBy as DestinationsSortKey) || "name",
      sortOrder: sortOrder === "desc" ? "desc" : "asc",
    });

    // Optional: weather for date range (Open-Meteo, free; cached)
    if (dateFrom && dateTo && list.some((d) => d.lat != null && d.lng != null)) {
      const withCoords = list.filter((d): d is Destination & { lat: number; lng: number } => typeof d.lat === "number" && typeof d.lng === "number");
      if (withCoords.length > 0) {
        const weatherMap = await getWeatherForDateRange(
          withCoords.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng })),
          dateFrom,
          dateTo
        );
        list = list.map((d) => {
          const w = weatherMap.get(d.id);
          if (!w) return d;
          return { ...d, avgTempC: Math.round(w.avgTempC * 10) / 10, avgRainfallMm: Math.round(w.avgRainfallMm * 10) / 10, avgHumidityPct: Math.round(w.avgHumidityPct) };
        });
      }
    }

    // Optional: distance and travel time from origin (geocode once, then haversine)
    if (origin && list.some((d) => d.lat != null && d.lng != null)) {
      const originCoords = await geocode(origin);
      if (originCoords) {
        list = list.map((d) => {
          if (d.lat == null || d.lng == null) return d;
          const distanceKm = Math.round(haversineKm(originCoords.lat, originCoords.lng, d.lat, d.lng));
          const hours = travelTimeHours(distanceKm, (d.transport_modes ?? [d.travelMode]).includes("flight"));
          return {
            ...d,
            distanceKm,
            travelTimeHours: Math.round(hours * 10) / 10,
            travelMode: distanceKm > 400 ? "flight" : "train",
          };
        });
      }
    }

    return new Response(JSON.stringify({ destinations: list }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
