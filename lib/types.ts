export type Block = {
  id: string;
  time: "morning" | "afternoon" | "evening";
  title: string;
  type: "food" | "nature" | "culture" | "nightlife" | "relax" | "logistics";
  notes: string;
};

export type Day = {
  day: number;
  base_location: string;
  blocks: Block[];
};

export type PlanResponse = {
  trip: {
    title: string;
    summary: string;
    vibe_tags: string[];
    recommended_region: string;
    best_season: string;
    pace: "slow" | "moderate" | "fast";
  };
  itinerary: Day[];
};
