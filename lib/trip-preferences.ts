/** Trip input dimensions for generation and cache key */
export type TripPreferences = {
  vibes: string;
  days: number;
  priciness: number; // 1 = budget, 5 = splurge
  origin: string;
  maxTravelTimeHours: number;
  transportation: string;
  constraints: string;
  /** Structured activity/experience tags — distinct from vibes (keywords) and tripStory (free text). */
  emphasis: string[];
  theme: string;
  /** Simple weather preference for quick selection. */
  weather: string;
  /** Optional detailed weather: only used when user expands "Weather details". */
  weatherDetail?: {
    tempMinC?: number;
    tempMaxC?: number;
    maxRainfallMm?: number;
    maxUvIndex?: number;
  };
  /** Single base vs multi-location (e.g. one city vs Tanzania + Zanzibar + lodges). */
  tripStructure: "single" | "multi";
  /** Free-form story, vibe, or specific preferences (used in prompt). */
  tripStory: string;
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
  tripStructure: "single",
  tripStory: "",
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

/** Emphasis = activity/experience types. Not overlapping with "vibes" (mood keywords) or "trip story" (free text). */
export const EMPHASIS_OPTIONS = [
  "museums",
  "beaches",
  "hiking",
  "gastronomy",
  "nightlife",
  "wellness",
  "family activities",
  "photography",
  "shopping",
  "architecture",
  "wildlife",
  "wine",
  "festivals",
  "road trips",
  "islands",
  "mountains",
  "cities",
  "countryside",
  "art & design",
  "local culture",
  "adventure sports",
  "quiet & retreats",
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

/** Simple weather toggle — minimal, elegant options. */
export const WEATHER_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "avoid_rain", label: "Dry / avoid rain" },
  { value: "sun", label: "Sunny" },
] as const;

export const TRIP_STRUCTURE_OPTIONS = [
  { value: "single", label: "Single location", description: "One city or region (e.g. 3 days in Milan)" },
  { value: "multi", label: "Multi-location", description: "Several stops (e.g. safari + Zanzibar, or city hop)" },
] as const;

/** Quick-add constraint presets; appending to constraints field. */
export const CONSTRAINT_PRESETS = [
  { label: "Wheelchair accessible", value: "wheelchair accessible; step-free or ramp access preferred" },
  { label: "Baby-friendly", value: "baby-friendly; stroller access, changing facilities, quiet spots" },
  { label: "Blind / low vision", value: "blind or low vision; audio guides, tactile options, clear signage" },
  { label: "Reduced mobility", value: "reduced mobility; minimal stairs, short walking distances" },
  { label: "Vegetarian", value: "vegetarian dining options essential" },
  { label: "Vegan", value: "vegan dining options essential" },
  { label: "Halal", value: "halal food options preferred or essential" },
  { label: "Kosher", value: "kosher food options preferred or essential" },
  { label: "Nut allergy", value: "severe nut allergy; nut-free or clearly labelled options" },
  { label: "Gluten-free", value: "gluten-free dining options essential" },
  { label: "Kid-friendly", value: "kid-friendly; activities and pacing suitable for children" },
  { label: "Elder-friendly", value: "elder-friendly; rest breaks, seating, gentle pace" },
] as const;

export function normalizePreferences(body: unknown): TripPreferences {
  const b = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const wd = b.weatherDetail && typeof b.weatherDetail === "object" ? b.weatherDetail as Record<string, unknown> : undefined;
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
    weatherDetail: wd ? {
      tempMinC: typeof wd.tempMinC === "number" ? wd.tempMinC : undefined,
      tempMaxC: typeof wd.tempMaxC === "number" ? wd.tempMaxC : undefined,
      maxRainfallMm: typeof wd.maxRainfallMm === "number" ? wd.maxRainfallMm : undefined,
      maxUvIndex: typeof wd.maxUvIndex === "number" ? wd.maxUvIndex : undefined,
    } : undefined,
    tripStructure: b.tripStructure === "multi" ? "multi" : "single",
    tripStory: typeof b.tripStory === "string" ? b.tripStory : DEFAULT_PREFERENCES.tripStory,
  };
}
