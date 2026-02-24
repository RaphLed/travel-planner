import {
  filterAndSortDestinations,
  type DestinationsSortKey,
} from "@/lib/destinations";
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
    const sortBy = sp.get("sortBy");
    const sortOrder = sp.get("sortOrder");

    const list = filterAndSortDestinations({
      maxTravelTimeHours: maxTravelTimeHours ? Number(maxTravelTimeHours) : undefined,
      minTemp: minTemp != null && minTemp !== "" ? Number(minTemp) : undefined,
      maxTemp: maxTemp != null && maxTemp !== "" ? Number(maxTemp) : undefined,
      maxRainfall: maxRainfall != null && maxRainfall !== "" ? Number(maxRainfall) : undefined,
      minSafety: minSafety != null && minSafety !== "" ? Number(minSafety) : undefined,
      maxPriciness: maxPriciness != null && maxPriciness !== "" ? Number(maxPriciness) : undefined,
      travelMode: travelMode || undefined,
      sortBy: (sortBy as DestinationsSortKey) || "name",
      sortOrder: sortOrder === "desc" ? "desc" : "asc",
    });

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
