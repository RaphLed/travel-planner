/**
 * Destination KPI model for the "Explore universes" table.
 * Fixed backbone: values from established travel sources (climate norms, general ratings).
 * Dimensions normalized (e.g. 1–5) for filtering/sorting; no runtime API calls.
 */

export type TravelMode = "flight" | "train" | "car" | "ferry" | "mixed";

export type Destination = {
  id: string;
  name: string;
  country: string;
  /** Region for filtering. */
  region?: string;
  /** WGS84; used for weather and distance when user provides dates/origin. */
  lat?: number;
  lng?: number;
  /** Approx one-way travel time in hours (fallback when no origin). */
  travelTimeHours: number;
  travelMode: TravelMode;
  /** Modes typically available (e.g. flight + ferry). */
  transport_modes?: TravelMode[];
  avgTempC: number;
  avgRainfallMm: number;
  avgHumidityPct: number;
  avgUvIndex: number;
  beautyScore: number;
  cultureScore: number;
  partyScore: number;
  /** 1–5 serenity/relaxation vs energetic. */
  relaxScore?: number;
  /** 1–5 access to beach / coastal quality. */
  beachAccessScore?: number;
  safetyScore: number;
  luxuryScore: number;
  pricinessScore: number;
  foodScore?: number;
  familyScore?: number;
  accessibilityScore?: number;
  bestMonths?: number[];
  distanceKm?: number;
};

/** Fixed backbone: destinations with KPIs from climate and travel norms (no runtime API). */
const EUROPE = "Europe";
const ASIA = "Asia";
const AMERICAS = "Americas";
const AFRICA = "Africa";
const OCEANIA = "Oceania";
const MIDDLE_EAST = "Middle East";

export const DESTINATIONS: Destination[] = [
  { id: "paris", name: "Paris", country: "France", region: EUROPE, lat: 48.86, lng: 2.35, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 18, avgRainfallMm: 55, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 1, safetyScore: 4, luxuryScore: 5, pricinessScore: 4, accessibilityScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "barcelona", name: "Barcelona", country: "Spain", region: EUROPE, lat: 41.39, lng: 2.17, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 22, avgRainfallMm: 45, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 3, accessibilityScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "rome", name: "Rome", country: "Italy", region: EUROPE, lat: 41.90, lng: 12.50, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 35, avgHumidityPct: 62, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 2, safetyScore: 4, luxuryScore: 4, pricinessScore: 3, accessibilityScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "lisbon", name: "Lisbon", country: "Portugal", region: EUROPE, lat: 38.72, lng: -9.14, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 23, avgRainfallMm: 25, avgHumidityPct: 65, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 4, relaxScore: 4, beachAccessScore: 4, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, accessibilityScore: 2, familyScore: 4, foodScore: 5, bestMonths: [3, 4, 5, 9, 10] },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", region: EUROPE, lat: 52.37, lng: 4.89, travelTimeHours: 1, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 17, avgRainfallMm: 65, avgHumidityPct: 78, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 2, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, accessibilityScore: 4, familyScore: 5, foodScore: 4, bestMonths: [4, 5, 9] },
  { id: "berlin", name: "Berlin", country: "Germany", region: EUROPE, lat: 52.52, lng: 13.41, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 50, avgHumidityPct: 70, avgUvIndex: 5, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 3, accessibilityScore: 4, familyScore: 4, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "london", name: "London", country: "UK", region: EUROPE, lat: 51.51, lng: -0.13, travelTimeHours: 0, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 18, avgRainfallMm: 55, avgHumidityPct: 75, avgUvIndex: 4, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 1, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, accessibilityScore: 4, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "dublin", name: "Dublin", country: "Ireland", region: EUROPE, lat: 53.35, lng: -6.26, travelTimeHours: 1.5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 15, avgRainfallMm: 70, avgHumidityPct: 82, avgUvIndex: 3, beautyScore: 4, cultureScore: 4, partyScore: 5, relaxScore: 4, beachAccessScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 4, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "madrid", name: "Madrid", country: "Spain", region: EUROPE, lat: 40.42, lng: -3.70, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 30, avgHumidityPct: 45, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "vienna", name: "Vienna", country: "Austria", region: EUROPE, lat: 48.21, lng: 16.37, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 20, avgRainfallMm: 55, avgHumidityPct: 68, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 5, pricinessScore: 4, accessibilityScore: 4, familyScore: 4, foodScore: 4, bestMonths: [4, 5, 9, 10] },
  { id: "prague", name: "Prague", country: "Czech Republic", region: EUROPE, lat: 50.08, lng: 14.44, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 55, avgHumidityPct: 70, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 4, bestMonths: [4, 5, 9, 10] },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", region: EUROPE, lat: 55.68, lng: 12.57, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 18, avgRainfallMm: 50, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 4, partyScore: 4, relaxScore: 5, beachAccessScore: 3, safetyScore: 5, luxuryScore: 4, pricinessScore: 5, accessibilityScore: 5, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "athens", name: "Athens", country: "Greece", region: EUROPE, lat: 37.98, lng: 23.73, travelTimeHours: 3.5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 10, avgHumidityPct: 50, avgUvIndex: 9, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 2, beachAccessScore: 4, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, accessibilityScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "istanbul", name: "Istanbul", country: "Turkey", region: MIDDLE_EAST, lat: 41.01, lng: 28.95, travelTimeHours: 3.5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 40, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 3, safetyScore: 4, luxuryScore: 4, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "tokyo", name: "Tokyo", country: "Japan", region: ASIA, lat: 35.68, lng: 139.69, travelTimeHours: 12, travelMode: "flight", transport_modes: ["flight"], avgTempC: 25, avgRainfallMm: 165, avgHumidityPct: 78, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 2, beachAccessScore: 3, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, accessibilityScore: 4, familyScore: 4, foodScore: 5, bestMonths: [3, 4, 10, 11] },
  { id: "newyork", name: "New York", country: "USA", region: AMERICAS, lat: 40.71, lng: -74.01, travelTimeHours: 8, travelMode: "flight", transport_modes: ["flight"], avgTempC: 24, avgRainfallMm: 95, avgHumidityPct: 65, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 2, beachAccessScore: 3, safetyScore: 4, luxuryScore: 5, pricinessScore: 5, accessibilityScore: 4, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "marrakech", name: "Marrakech", country: "Morocco", region: AFRICA, lat: 31.63, lng: -7.99, travelTimeHours: 3.5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 32, avgRainfallMm: 15, avgHumidityPct: 45, avgUvIndex: 10, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 4, beachAccessScore: 1, safetyScore: 4, luxuryScore: 4, pricinessScore: 2, familyScore: 3, foodScore: 5, bestMonths: [3, 4, 5, 9, 10, 11] },
  { id: "reykjavik", name: "Reykjavik", country: "Iceland", region: EUROPE, lat: 64.15, lng: -21.94, travelTimeHours: 3, travelMode: "flight", transport_modes: ["flight"], avgTempC: 11, avgRainfallMm: 85, avgHumidityPct: 80, avgUvIndex: 4, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 5, familyScore: 4, foodScore: 3, bestMonths: [6, 7, 8] },
  { id: "budapest", name: "Budapest", country: "Hungary", region: EUROPE, lat: 47.50, lng: 19.04, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 22, avgRainfallMm: 55, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 5, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "split", name: "Split", country: "Croatia", region: EUROPE, lat: 43.51, lng: 16.44, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 45, avgHumidityPct: 60, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 3, familyScore: 4, foodScore: 4, bestMonths: [5, 6, 9] },
  { id: "edinburgh", name: "Edinburgh", country: "UK", region: EUROPE, lat: 55.95, lng: -3.19, travelTimeHours: 1.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 15, avgRainfallMm: 75, avgHumidityPct: 80, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 5, beachAccessScore: 3, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "porto", name: "Porto", country: "Portugal", region: EUROPE, lat: 41.16, lng: -8.63, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 22, avgRainfallMm: 35, avgHumidityPct: 68, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "nice", name: "Nice", country: "France", region: EUROPE, lat: 43.71, lng: 7.26, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 40, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [5, 6, 9] },
  { id: "santorini", name: "Santorini", country: "Greece", region: EUROPE, lat: 36.39, lng: 25.46, travelTimeHours: 4, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 5, avgHumidityPct: 55, avgUvIndex: 9, beautyScore: 5, cultureScore: 3, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 3, foodScore: 4, bestMonths: [5, 6, 9, 10] },
  { id: "dubrovnik", name: "Dubrovnik", country: "Croatia", region: EUROPE, lat: 42.65, lng: 18.09, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 50, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 4, foodScore: 4, bestMonths: [5, 6, 9] },
  { id: "milan", name: "Milan", country: "Italy", region: EUROPE, lat: 45.46, lng: 9.19, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 22, avgRainfallMm: 65, avgHumidityPct: 65, avgUvIndex: 6, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 1, safetyScore: 5, luxuryScore: 5, pricinessScore: 4, accessibilityScore: 4, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "florence", name: "Florence", country: "Italy", region: EUROPE, lat: 43.77, lng: 11.25, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 55, avgHumidityPct: 62, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "oslo", name: "Oslo", country: "Norway", region: EUROPE, lat: 59.91, lng: 10.75, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight"], avgTempC: 18, avgRainfallMm: 70, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 3, safetyScore: 5, luxuryScore: 4, pricinessScore: 5, accessibilityScore: 5, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "stockholm", name: "Stockholm", country: "Sweden", region: EUROPE, lat: 59.33, lng: 18.07, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight"], avgTempC: 18, avgRainfallMm: 55, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 5, beachAccessScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 5, accessibilityScore: 5, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8] },
  { id: "krakow", name: "Krakow", country: "Poland", region: EUROPE, lat: 50.06, lng: 19.94, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 55, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 4, bestMonths: [4, 5, 6, 9, 10] },
  { id: "seville", name: "Seville", country: "Spain", region: EUROPE, lat: 37.39, lng: -5.98, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 28, avgRainfallMm: 25, avgHumidityPct: 50, avgUvIndex: 9, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 2, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [3, 4, 5, 9, 10] },
  { id: "lyon", name: "Lyon", country: "France", region: EUROPE, lat: 45.76, lng: 4.84, travelTimeHours: 1.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 20, avgRainfallMm: 70, avgHumidityPct: 70, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  // Asia
  { id: "singapore", name: "Singapore", country: "Singapore", region: ASIA, lat: 1.35, lng: 103.82, travelTimeHours: 13, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 170, avgHumidityPct: 82, avgUvIndex: 8, beautyScore: 4, cultureScore: 4, partyScore: 4, relaxScore: 3, beachAccessScore: 3, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 5, foodScore: 5, bestMonths: [1, 2, 3, 11, 12] },
  { id: "bangkok", name: "Bangkok", country: "Thailand", region: ASIA, lat: 13.76, lng: 100.50, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 30, avgRainfallMm: 180, avgHumidityPct: 78, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 2, beachAccessScore: 1, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [11, 12, 1, 2] },
  { id: "hongkong", name: "Hong Kong", country: "Hong Kong", region: ASIA, lat: 22.32, lng: 114.17, travelTimeHours: 12, travelMode: "flight", transport_modes: ["flight"], avgTempC: 26, avgRainfallMm: 220, avgHumidityPct: 78, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 2, beachAccessScore: 4, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 5, foodScore: 5, bestMonths: [10, 11, 3, 4] },
  { id: "seoul", name: "Seoul", country: "South Korea", region: ASIA, lat: 37.57, lng: 126.98, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 24, avgRainfallMm: 140, avgHumidityPct: 72, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 2, beachAccessScore: 2, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "bali", name: "Bali", country: "Indonesia", region: ASIA, lat: -8.41, lng: 115.19, travelTimeHours: 16, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 120, avgHumidityPct: 78, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 5, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "kyoto", name: "Kyoto", country: "Japan", region: ASIA, lat: 35.01, lng: 135.77, travelTimeHours: 12, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 25, avgRainfallMm: 160, avgHumidityPct: 75, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [3, 4, 10, 11] },
  { id: "hanoi", name: "Hanoi", country: "Vietnam", region: ASIA, lat: 21.03, lng: 105.85, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 27, avgRainfallMm: 180, avgHumidityPct: 80, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 4, beachAccessScore: 1, safetyScore: 4, luxuryScore: 2, pricinessScore: 1, familyScore: 4, foodScore: 5, bestMonths: [10, 11, 3, 4] },
  { id: "taipei", name: "Taipei", country: "Taiwan", region: ASIA, lat: 25.03, lng: 121.56, travelTimeHours: 12, travelMode: "flight", transport_modes: ["flight"], avgTempC: 26, avgRainfallMm: 240, avgHumidityPct: 78, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [10, 11, 3, 4] },
  { id: "kualalumpur", name: "Kuala Lumpur", country: "Malaysia", region: ASIA, lat: 3.14, lng: 101.69, travelTimeHours: 13, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 200, avgHumidityPct: 80, avgUvIndex: 8, beautyScore: 4, cultureScore: 4, partyScore: 4, relaxScore: 3, beachAccessScore: 2, safetyScore: 5, luxuryScore: 4, pricinessScore: 2, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8] },
  { id: "delhi", name: "Delhi", country: "India", region: ASIA, lat: 28.61, lng: 77.21, travelTimeHours: 8, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 80, avgHumidityPct: 55, avgUvIndex: 9, beautyScore: 4, cultureScore: 5, partyScore: 3, relaxScore: 2, beachAccessScore: 1, safetyScore: 3, luxuryScore: 4, pricinessScore: 2, familyScore: 3, foodScore: 5, bestMonths: [10, 11, 2, 3] },
  // Americas
  { id: "mexicocity", name: "Mexico City", country: "Mexico", region: AMERICAS, lat: 19.43, lng: -99.13, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 70, avgHumidityPct: 60, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 2, beachAccessScore: 1, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [11, 12, 1, 2, 3, 4] },
  { id: "buenosaires", name: "Buenos Aires", country: "Argentina", region: AMERICAS, lat: -34.60, lng: -58.38, travelTimeHours: 14, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 95, avgHumidityPct: 72, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 2, safetyScore: 4, luxuryScore: 4, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [3, 4, 9, 10, 11] },
  { id: "riodejaneiro", name: "Rio de Janeiro", country: "Brazil", region: AMERICAS, lat: -22.91, lng: -43.17, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 26, avgRainfallMm: 110, avgHumidityPct: 78, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 5, safetyScore: 3, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "vancouver", name: "Vancouver", country: "Canada", region: AMERICAS, lat: 49.28, lng: -123.12, travelTimeHours: 10, travelMode: "flight", transport_modes: ["flight"], avgTempC: 18, avgRainfallMm: 115, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 4, partyScore: 4, relaxScore: 5, beachAccessScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "montreal", name: "Montreal", country: "Canada", region: AMERICAS, lat: 45.50, lng: -73.57, travelTimeHours: 8, travelMode: "flight", transport_modes: ["flight"], avgTempC: 21, avgRainfallMm: 95, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "losangeles", name: "Los Angeles", country: "USA", region: AMERICAS, lat: 34.05, lng: -118.24, travelTimeHours: 11, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 35, avgHumidityPct: 58, avgUvIndex: 8, beautyScore: 4, cultureScore: 4, partyScore: 5, relaxScore: 4, beachAccessScore: 5, safetyScore: 4, luxuryScore: 5, pricinessScore: 5, familyScore: 5, foodScore: 5, bestMonths: [3, 4, 5, 9, 10, 11] },
  { id: "miami", name: "Miami", country: "USA", region: AMERICAS, lat: 25.76, lng: -80.19, travelTimeHours: 9, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 155, avgHumidityPct: 75, avgUvIndex: 9, beautyScore: 4, cultureScore: 4, partyScore: 5, relaxScore: 3, beachAccessScore: 5, safetyScore: 4, luxuryScore: 5, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [11, 12, 1, 2, 3, 4] },
  { id: "cartagena", name: "Cartagena", country: "Colombia", region: AMERICAS, lat: 10.40, lng: -75.51, travelTimeHours: 10, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 95, avgHumidityPct: 82, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [12, 1, 2, 3] },
  { id: "lima", name: "Lima", country: "Peru", region: AMERICAS, lat: -12.05, lng: -77.04, travelTimeHours: 13, travelMode: "flight", transport_modes: ["flight"], avgTempC: 20, avgRainfallMm: 15, avgHumidityPct: 85, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 4, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10, 11] },
  // Africa
  { id: "capetown", name: "Cape Town", country: "South Africa", region: AFRICA, lat: -33.92, lng: 18.42, travelTimeHours: 12, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 55, avgHumidityPct: 68, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 5, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [10, 11, 12, 1, 2, 3] },
  { id: "zanzibar", name: "Zanzibar", country: "Tanzania", region: AFRICA, lat: -6.17, lng: 39.19, travelTimeHours: 10, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 75, avgHumidityPct: 78, avgUvIndex: 9, beautyScore: 5, cultureScore: 4, partyScore: 2, relaxScore: 5, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 4, bestMonths: [6, 7, 8, 9, 10] },
  { id: "cairo", name: "Cairo", country: "Egypt", region: AFRICA, lat: 30.04, lng: 31.24, travelTimeHours: 5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 28, avgRainfallMm: 5, avgHumidityPct: 50, avgUvIndex: 10, beautyScore: 4, cultureScore: 5, partyScore: 3, relaxScore: 2, beachAccessScore: 1, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 3, foodScore: 4, bestMonths: [10, 11, 2, 3, 4] },
  // Oceania
  { id: "sydney", name: "Sydney", country: "Australia", region: OCEANIA, lat: -33.87, lng: 151.21, travelTimeHours: 22, travelMode: "flight", transport_modes: ["flight"], avgTempC: 22, avgRainfallMm: 105, avgHumidityPct: 68, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 5, familyScore: 5, foodScore: 5, bestMonths: [9, 10, 11, 12, 1, 2, 3] },
  { id: "auckland", name: "Auckland", country: "New Zealand", region: OCEANIA, lat: -36.85, lng: 174.76, travelTimeHours: 24, travelMode: "flight", transport_modes: ["flight"], avgTempC: 18, avgRainfallMm: 115, avgHumidityPct: 78, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 4, familyScore: 5, foodScore: 4, bestMonths: [12, 1, 2, 3] },
  // Middle East
  { id: "dubai", name: "Dubai", country: "UAE", region: MIDDLE_EAST, lat: 25.20, lng: 55.27, travelTimeHours: 7, travelMode: "flight", transport_modes: ["flight"], avgTempC: 33, avgRainfallMm: 10, avgHumidityPct: 55, avgUvIndex: 10, beautyScore: 4, cultureScore: 3, partyScore: 5, relaxScore: 2, beachAccessScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 5, foodScore: 5, bestMonths: [11, 12, 1, 2, 3] },
  { id: "telaviv", name: "Tel Aviv", country: "Israel", region: MIDDLE_EAST, lat: 32.09, lng: 34.78, travelTimeHours: 5, travelMode: "flight", transport_modes: ["flight"], avgTempC: 26, avgRainfallMm: 45, avgHumidityPct: 65, avgUvIndex: 9, beautyScore: 4, cultureScore: 5, partyScore: 5, relaxScore: 3, beachAccessScore: 5, safetyScore: 4, luxuryScore: 4, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  // Major accessible destinations (granularity: Taormina yes, small towns no)
  { id: "taormina", name: "Taormina", country: "Italy", region: EUROPE, lat: 37.85, lng: 15.29, travelTimeHours: 3, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 26, avgRainfallMm: 25, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "positano", name: "Positano", country: "Italy", region: EUROPE, lat: 40.63, lng: 14.48, travelTimeHours: 3, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 25, avgRainfallMm: 55, avgHumidityPct: 65, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 2, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 3, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "amalfi", name: "Amalfi", country: "Italy", region: EUROPE, lat: 40.63, lng: 14.60, travelTimeHours: 3, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 25, avgRainfallMm: 60, avgHumidityPct: 65, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 2, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 4, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "cinqueterre", name: "Cinque Terre", country: "Italy", region: EUROPE, lat: 44.12, lng: 9.72, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 75, avgHumidityPct: 68, avgUvIndex: 7, beautyScore: 5, cultureScore: 4, partyScore: 2, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "mykonos", name: "Mykonos", country: "Greece", region: EUROPE, lat: 37.45, lng: 25.38, travelTimeHours: 4, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 10, avgHumidityPct: 58, avgUvIndex: 9, beautyScore: 5, cultureScore: 3, partyScore: 5, relaxScore: 2, beachAccessScore: 5, safetyScore: 5, luxuryScore: 5, pricinessScore: 5, familyScore: 3, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "malaga", name: "Málaga", country: "Spain", region: EUROPE, lat: 36.72, lng: -4.42, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 40, avgHumidityPct: 62, avgUvIndex: 8, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "valencia", name: "Valencia", country: "Spain", region: EUROPE, lat: 39.47, lng: -0.38, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 23, avgRainfallMm: 35, avgHumidityPct: 65, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "bilbao", name: "Bilbao", country: "Spain", region: EUROPE, lat: 43.26, lng: -2.93, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 95, avgHumidityPct: 72, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 4, beachAccessScore: 4, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "sansebastian", name: "San Sebastián", country: "Spain", region: EUROPE, lat: 43.32, lng: -1.98, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 130, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "palermo", name: "Palermo", country: "Italy", region: EUROPE, lat: 38.12, lng: 13.37, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 25, avgRainfallMm: 50, avgHumidityPct: 68, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 4, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "naples", name: "Naples", country: "Italy", region: EUROPE, lat: 40.85, lng: 14.27, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 65, avgHumidityPct: 68, avgUvIndex: 7, beautyScore: 4, cultureScore: 5, partyScore: 4, relaxScore: 2, beachAccessScore: 4, safetyScore: 4, luxuryScore: 3, pricinessScore: 2, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "verona", name: "Verona", country: "Italy", region: EUROPE, lat: 45.44, lng: 10.99, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 22, avgRainfallMm: 75, avgHumidityPct: 68, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "siena", name: "Siena", country: "Italy", region: EUROPE, lat: 43.32, lng: 11.33, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 23, avgRainfallMm: 55, avgHumidityPct: 62, avgUvIndex: 7, beautyScore: 5, cultureScore: 5, partyScore: 2, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [4, 5, 9, 10] },
  { id: "bologna", name: "Bologna", country: "Italy", region: EUROPE, lat: 44.49, lng: 11.34, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 23, avgRainfallMm: 60, avgHumidityPct: 65, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 1, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "marseille", name: "Marseille", country: "France", region: EUROPE, lat: 43.30, lng: 5.37, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 24, avgRainfallMm: 45, avgHumidityPct: 58, avgUvIndex: 8, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 3, beachAccessScore: 5, safetyScore: 4, luxuryScore: 3, pricinessScore: 3, familyScore: 4, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "bordeaux", name: "Bordeaux", country: "France", region: EUROPE, lat: 44.84, lng: -0.58, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 21, avgRainfallMm: 75, avgHumidityPct: 72, avgUvIndex: 6, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 3, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 7, 8, 9] },
  { id: "bruges", name: "Bruges", country: "Belgium", region: EUROPE, lat: 51.21, lng: 3.22, travelTimeHours: 1.5, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 17, avgRainfallMm: 65, avgHumidityPct: 78, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 2, relaxScore: 5, beachAccessScore: 2, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 5, bestMonths: [4, 5, 6, 9, 10] },
  { id: "salzburg", name: "Salzburg", country: "Austria", region: EUROPE, lat: 47.81, lng: 13.04, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 19, avgRainfallMm: 115, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 5, partyScore: 3, relaxScore: 5, beachAccessScore: 1, safetyScore: 5, luxuryScore: 4, pricinessScore: 4, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "interlaken", name: "Interlaken", country: "Switzerland", region: EUROPE, lat: 46.69, lng: 7.86, travelTimeHours: 2, travelMode: "flight", transport_modes: ["flight", "train"], avgTempC: 18, avgRainfallMm: 120, avgHumidityPct: 75, avgUvIndex: 5, beautyScore: 5, cultureScore: 3, partyScore: 2, relaxScore: 5, beachAccessScore: 2, safetyScore: 5, luxuryScore: 4, pricinessScore: 5, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "tallinn", name: "Tallinn", country: "Estonia", region: EUROPE, lat: 59.44, lng: 24.75, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 17, avgRainfallMm: 55, avgHumidityPct: 78, avgUvIndex: 4, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 3, safetyScore: 5, luxuryScore: 3, pricinessScore: 2, familyScore: 5, foodScore: 4, bestMonths: [5, 6, 7, 8, 9] },
  { id: "rhodes", name: "Rhodes", country: "Greece", region: EUROPE, lat: 36.44, lng: 28.22, travelTimeHours: 3.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 15, avgHumidityPct: 62, avgUvIndex: 9, beautyScore: 5, cultureScore: 5, partyScore: 4, relaxScore: 4, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 9, 10] },
  { id: "corfu", name: "Corfu", country: "Greece", region: EUROPE, lat: 39.62, lng: 19.92, travelTimeHours: 2.5, travelMode: "flight", transport_modes: ["flight", "ferry"], avgTempC: 26, avgRainfallMm: 95, avgHumidityPct: 68, avgUvIndex: 8, beautyScore: 5, cultureScore: 4, partyScore: 3, relaxScore: 5, beachAccessScore: 5, safetyScore: 5, luxuryScore: 4, pricinessScore: 3, familyScore: 5, foodScore: 5, bestMonths: [5, 6, 9, 10] },
];

export type DestinationsSortKey =
  | "name"
  | "country"
  | "region"
  | "distanceKm"
  | "travelTimeHours"
  | "avgTempC"
  | "avgRainfallMm"
  | "avgHumidityPct"
  | "avgUvIndex"
  | "beautyScore"
  | "cultureScore"
  | "partyScore"
  | "relaxScore"
  | "beachAccessScore"
  | "safetyScore"
  | "luxuryScore"
  | "pricinessScore"
  | "foodScore"
  | "familyScore";

export function filterAndSortDestinations(
  options: {
    maxTravelTimeHours?: number;
    minTemp?: number;
    maxTemp?: number;
    maxRainfall?: number;
    minSafety?: number;
    maxPriciness?: number;
    travelMode?: string;
    region?: string;
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
    region,
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
  if (region && region !== "all") {
    list = list.filter((d) => d.region === region);
  }

  list.sort((a, b) => {
    const aVal = a[sortBy] as number | string | undefined;
    const bVal = b[sortBy] as number | string | undefined;
    const aSafe = aVal ?? (typeof aVal === "string" ? "" : 0);
    const bSafe = bVal ?? (typeof bVal === "string" ? "" : 0);
    const cmp = typeof aSafe === "string" ? (aSafe as string).localeCompare(bSafe as string) : (aSafe as number) - (bSafe as number);
    return sortOrder === "asc" ? cmp : -cmp;
  });
  return list;
}
