/**
 * Destination KPI model for the "Explore universes" table.
 * Values are normalized where useful (e.g. 1–5 or 0–100) for filtering/sorting.
 */

export type TravelMode = "flight" | "train" | "car" | "ferry" | "mixed";

export type Destination = {
  id: string;
  name: string;
  country: string;
  /** Approx one-way travel time in hours from a reference origin (e.g. London). Mock: from "Europe" origin. */
  travelTimeHours: number;
  travelMode: TravelMode;
  /** Average historical temp in °C for target date range (e.g. month). */
  avgTempC: number;
  /** Average historical rainfall mm. */
  avgRainfallMm: number;
  /** Average humidity %. */
  avgHumidityPct: number;
  /** Average UV index (0–11+). */
  avgUvIndex: number;
  /** 1–5 beauty/scenery. */
  beautyScore: number;
  /** 1–5 culture/history. */
  cultureScore: number;
  /** 1–5 nightlife/vibe. */
  partyScore: number;
  /** 1–5 safety / kid-friendly. */
  safetyScore: number;
  /** 1–5 high-end luxury vs popular. */
  luxuryScore: number;
  /** 1–5 priciness (1 = budget, 5 = splurge). */
  pricinessScore: number;
  /** Optional: distance in km (if we have origin). */
  distanceKm?: number;
};

/** Static destination list with plausible mock KPIs. Replace with DB or real APIs later. */
export const DESTINATIONS: Destination[] = [
  { id: "paris", name: "Paris", country: "France", travelTimeHours: 2, travelMode: "flight", avgTempC: 18, avgRainfallMm: 55, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 4, luxuryScore: 5, pricinessScore: 4 },
  { id: "barcelona", name: "Barcelona", country: "Spain", travelTimeHours: 2, travelMode: "flight", avgTempC: 22, avgRainfallMm: 45, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 3 },
  { id: "rome", name: "Rome", country: "Italy", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 24, avgRainfallMm: 35, avgHumidityPct: 62, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 4, luxuryScore: 4, pricinessScore: 3 },
  { id: "lisbon", name: "Lisbon", country: "Portugal", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 23, avgRainfallMm: 25, avgHumidityPct: 65, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 4, safetyScore: 5, luxuryScore: 3, pricinessScore: 2 },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", travelTimeHours: 1, travelMode: "flight", avgTempC: 17, avgRainfallMm: 65, avgHumidityPct: 78, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 4 },
  { id: "berlin", name: "Berlin", country: "Germany", travelTimeHours: 2, travelMode: "flight", avgTempC: 19, avgRainfallMm: 50, avgHumidityPct: 70, avgUvIndex: 5, beautyScore: 4, cultureScore: 5, partyScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 3 },
  { id: "london", name: "London", country: "UK", travelTimeHours: 0, travelMode: "flight", avgTempC: 18, avgRainfallMm: 55, avgHumidityPct: 75, avgUvIndex: 4, beautyScore: 4, cultureScore: 5, partyScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 5 },
  { id: "dublin", name: "Dublin", country: "Ireland", travelTimeHours: 1.5, travelMode: "flight", avgTempC: 15, avgRainfallMm: 70, avgHumidityPct: 82, avgUvIndex: 3, beautyScore: 4, cultureScore: 4, partyScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 4 },
  { id: "madrid", name: "Madrid", country: "Spain", travelTimeHours: 2, travelMode: "flight", avgTempC: 24, avgRainfallMm: 30, avgHumidityPct: 45, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 3 },
  { id: "vienna", name: "Vienna", country: "Austria", travelTimeHours: 2, travelMode: "flight", avgTempC: 20, avgRainfallMm: 55, avgHumidityPct: 68, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 3, safetyScore: 5, luxuryScore: 5, pricinessScore: 4 },
  { id: "prague", name: "Prague", country: "Czech Republic", travelTimeHours: 2, travelMode: "flight", avgTempC: 19, avgRainfallMm: 55, avgHumidityPct: 70, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 5, luxuryScore: 3, pricinessScore: 2 },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", travelTimeHours: 2, travelMode: "flight", avgTempC: 18, avgRainfallMm: 50, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 4, partyScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 5 },
  { id: "athens", name: "Athens", country: "Greece", travelTimeHours: 3.5, travelMode: "flight", avgTempC: 28, avgRainfallMm: 10, avgHumidityPct: 50, avgUvIndex: 9, beautyScore: 4, cultureScore: 5, partyScore: 4, safetyScore: 4, luxuryScore: 3, pricinessScore: 2 },
  { id: "istanbul", name: "Istanbul", country: "Turkey", travelTimeHours: 3.5, travelMode: "flight", avgTempC: 22, avgRainfallMm: 40, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 4, luxuryScore: 4, pricinessScore: 2 },
  { id: "tokyo", name: "Tokyo", country: "Japan", travelTimeHours: 12, travelMode: "flight", avgTempC: 25, avgRainfallMm: 165, avgHumidityPct: 78, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 5, luxuryScore: 5, pricinessScore: 5 },
  { id: "newyork", name: "New York", country: "USA", travelTimeHours: 8, travelMode: "flight", avgTempC: 24, avgRainfallMm: 95, avgHumidityPct: 65, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 5, safetyScore: 4, luxuryScore: 5, pricinessScore: 5 },
  { id: "marrakech", name: "Marrakech", country: "Morocco", travelTimeHours: 3.5, travelMode: "flight", avgTempC: 32, avgRainfallMm: 15, avgHumidityPct: 45, avgUvIndex: 10, beautyScore: 5, cultureScore: 5, partyScore: 3, safetyScore: 4, luxuryScore: 4, pricinessScore: 2 },
  { id: "reykjavik", name: "Reykjavik", country: "Iceland", travelTimeHours: 3, travelMode: "flight", avgTempC: 11, avgRainfallMm: 85, avgHumidityPct: 80, avgUvIndex: 4, beautyScore: 5, cultureScore: 4, partyScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 5 },
  { id: "budapest", name: "Budapest", country: "Hungary", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 22, avgRainfallMm: 55, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 2 },
  { id: "split", name: "Split", country: "Croatia", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 26, avgRainfallMm: 45, avgHumidityPct: 60, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 4, safetyScore: 5, luxuryScore: 3, pricinessScore: 3 },
  { id: "edinburgh", name: "Edinburgh", country: "UK", travelTimeHours: 1.5, travelMode: "flight", avgTempC: 15, avgRainfallMm: 75, avgHumidityPct: 80, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 4 },
  { id: "porto", name: "Porto", country: "Portugal", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 22, avgRainfallMm: 35, avgHumidityPct: 68, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 2 },
  { id: "nice", name: "Nice", country: "France", travelTimeHours: 2, travelMode: "flight", avgTempC: 24, avgRainfallMm: 40, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 3, safetyScore: 5, luxuryScore: 5, pricinessScore: 4 },
  { id: "santorini", name: "Santorini", country: "Greece", travelTimeHours: 4, travelMode: "flight", avgTempC: 26, avgRainfallMm: 5, avgHumidityPct: 55, avgUvIndex: 9, beautyScore: 5, cultureScore: 3, partyScore: 3, safetyScore: 5, luxuryScore: 5, pricinessScore: 5 },
  { id: "dubrovnik", name: "Dubrovnik", country: "Croatia", travelTimeHours: 2.5, travelMode: "flight", avgTempC: 26, avgRainfallMm: 50, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 3, safetyScore: 5, luxuryScore: 4, pricinessScore: 4 },
];

export type DestinationsSortKey =
  | "name"
  | "country"
  | "travelTimeHours"
  | "avgTempC"
  | "avgRainfallMm"
  | "avgHumidityPct"
  | "avgUvIndex"
  | "beautyScore"
  | "cultureScore"
  | "partyScore"
  | "safetyScore"
  | "luxuryScore"
  | "pricinessScore";

export function filterAndSortDestinations(
  options: {
    maxTravelTimeHours?: number;
    minTemp?: number;
    maxTemp?: number;
    maxRainfall?: number;
    minSafety?: number;
    maxPriciness?: number;
    travelMode?: string;
    sortBy?: DestinationsSortKey;
    sortOrder?: "asc" | "desc";
  }
): Destination[] {
  let list = [...DESTINATIONS];
  const {
    maxTravelTimeHours,
    minTemp,
    maxTemp,
    maxRainfall,
    minSafety,
    maxPriciness,
    travelMode,
    sortBy = "name",
    sortOrder = "asc",
  } = options;

  if (maxTravelTimeHours != null && maxTravelTimeHours < 24) {
    list = list.filter((d) => d.travelTimeHours <= maxTravelTimeHours);
  }
  if (minTemp != null) list = list.filter((d) => d.avgTempC >= minTemp);
  if (maxTemp != null) list = list.filter((d) => d.avgTempC <= maxTemp);
  if (maxRainfall != null) list = list.filter((d) => d.avgRainfallMm <= maxRainfall);
  if (minSafety != null) list = list.filter((d) => d.safetyScore >= minSafety);
  if (maxPriciness != null) list = list.filter((d) => d.pricinessScore <= maxPriciness);
  if (travelMode && travelMode !== "any") {
    list = list.filter((d) => d.travelMode === travelMode || (travelMode === "mixed" && ["flight", "train"].includes(d.travelMode)));
  }

  list.sort((a, b) => {
    const aVal = a[sortBy] as number | string;
    const bVal = b[sortBy] as number | string;
    const cmp = typeof aVal === "string" ? (aVal as string).localeCompare(bVal as string) : (aVal as number) - (bVal as number);
    return sortOrder === "asc" ? cmp : -cmp;
  });
  return list;
}
