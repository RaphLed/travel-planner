/** Trip input dimensions for generation and cache key */
export type TripPreferences = {
  vibes: string;
  days: number;
  priciness: number; // 1 = budget, 5 = splurge
  origin: string;
  maxTravelTimeHours: number;
  transportation: string;
  constraints: string;
  emphasis: string[]; // culture, history, fun, relax, adventure, food, nature
  theme: string;
  weather: string;
};

export const DEFAULT_PREFERENCES: TripPreferences = {
  vibes: "relaxed, discovery",
  days: 5,
  priciness: 3,
  origin: "",
  maxTravelTimeHours: 12,
  transportation: "any",
  constraints: "",
  emphasis: [],
  theme: "none",
  weather: "any",
};

export const PRICINESS_LABELS = ["Budget", "Moderate", "Comfort", "Upscale", "Splurge"] as const;
export const TRANSPORT_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "flight", label: "Flight" },
  { value: "train", label: "Train" },
  { value: "car", label: "Car" },
  { value: "mixed", label: "Mixed" },
  { value: "ferry", label: "Ferry" },
] as const;
export const EMPHASIS_OPTIONS = [
  "culture",
  "history",
  "fun",
  "relax",
  "adventure",
  "food",
  "nature",
  "nightlife",
] as const;
export const THEME_OPTIONS = [
  { value: "none", label: "No theme" },
  { value: "wedding", label: "Wedding" },
  { value: "stag", label: "Stag do" },
  { value: "hens", label: "Girls weekend" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "family", label: "Family" },
  { value: "solo", label: "Solo" },
] as const;
export const WEATHER_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "avoid_rain", label: "Avoid rain" },
  { value: "sun", label: "Sunny" },
] as const;

export function normalizePreferences(body: unknown): TripPreferences {
  const b = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    vibes: typeof b.vibes === "string" ? b.vibes : DEFAULT_PREFERENCES.vibes,
    days: typeof b.days === "number" && b.days >= 1 && b.days <= 60 ? b.days : DEFAULT_PREFERENCES.days,
    priciness: typeof b.priciness === "number" && b.priciness >= 1 && b.priciness <= 5 ? b.priciness : DEFAULT_PREFERENCES.priciness,
    origin: typeof b.origin === "string" ? b.origin : DEFAULT_PREFERENCES.origin,
    maxTravelTimeHours: typeof b.maxTravelTimeHours === "number" && b.maxTravelTimeHours >= 1 && b.maxTravelTimeHours <= 24 ? b.maxTravelTimeHours : DEFAULT_PREFERENCES.maxTravelTimeHours,
    transportation: typeof b.transportation === "string" ? b.transportation : DEFAULT_PREFERENCES.transportation,
    constraints: typeof b.constraints === "string" ? b.constraints : DEFAULT_PREFERENCES.constraints,
    emphasis: Array.isArray(b.emphasis) ? (b.emphasis as unknown[]).filter((e): e is string => typeof e === "string") : DEFAULT_PREFERENCES.emphasis,
    theme: typeof b.theme === "string" ? b.theme : DEFAULT_PREFERENCES.theme,
    weather: typeof b.weather === "string" ? b.weather : DEFAULT_PREFERENCES.weather,
  };
}
