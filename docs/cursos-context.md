# Travel Planner Project Context

This is a Next.js 15 App Router project.

Purpose:
Build an AI-powered travel planning platform with:

- AI-generated itineraries
- Editable activity blocks
- Drag-and-drop timeline
- Accessibility-first design
- Future database persistence
- Eventually public deployment

Stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Responses API
- Local development currently

API route:
src/app/api/plan/route.ts

UI:
src/app/page.tsx

Current schema:
{
  trip: {...},
  itinerary: [
    {
      day,
      base_location,
      blocks: [...]
    }
  ]
}

Goals (priority order):
1. Drag-and-drop itinerary editing
2. Editable activity blocks
3. Save/load trips
4. Multi-trip browsing
5. Eventually deploy publicly

Constraints:
- Clean architecture
- Maintainable code
- Accessibility compliance
- Professional-grade UX