# AI Studio UI Replacement Design

## Goal

Replace the current frontend UI/UX with the design language from `C:\Users\lenovo\Downloads\ai软装设计工作台.zip` while preserving all backend routes, Prisma models, validation, persistence, and existing content categories.

## Scope

The replacement applies to every visible frontend route in the dashboard:

- Workbench flow at `/`.
- Materials library at `/materials`.
- Customer plans at `/plans`.
- Prompt templates at `/prompts`.
- Generation records at `/records`.

The backend remains unchanged:

- No edits to `app/api/*`.
- No edits to `lib/*` service, auth, validation, database, AI, or storage logic.
- No edits to `prisma/*`.
- Existing category fields and values remain the source of truth.

## UI Direction

The imported UI standard is a mobile-first, studio-like interface with:

- Linen background, sage primary color, sand accent color, soft white glass panels, and refined stone neutrals.
- Rounded mobile frame on desktop and full-screen app feel on small screens.
- Serif display headings, compact tracked labels, and quiet operational body text.
- Motion transitions between workbench steps and subtle card entrance animation.
- Lucide icon controls instead of text-only or handmade symbolic controls where practical.

## Architecture

The Next.js app structure stays intact. The workbench remains a client component because it owns the generation flow state and calls existing API endpoints. Library pages remain server components that query the current merchant's data and render styled list cards.

Shared presentation components should carry the new visual system:

- `AppShell` owns the studio background and dashboard navigation.
- Cards for materials and plans adopt the same glass/studio treatment.
- `globals.css` carries the UI tokens, frame styles, animation utilities, and any generated room-scene styles still needed for local image placeholders.

The zip's Vite app is not copied wholesale because it would break Next routing and disconnect the existing API/data flow. Its visual layout, motion behavior, component styling, and interaction feel are ported into the existing app instead.

## Data Flow

The workbench continues to call:

- `/api/ai/optimize-prompt`.
- `/api/ai/generate-image`.
- `/api/ai/generate-marketing`.
- `/api/plans`.

The library pages continue to read:

- `Material.category`, `Material.color`, `Material.fabric`.
- `PromptTemplate.category`.
- `CustomerPlan.status`.
- `GenerationRecord.type`, `status`, and `usageUnits`.

No categories from the zip replace these values.

## Testing

Tests should verify that:

- The workbench still calls all existing backend APIs.
- Prompt library insertion/replacement still works.
- Customer display tabs still work.
- Dashboard shell still requires a merchant session.
- Visual copy and labels are updated only where they reflect the new UI, not where they are persisted category data.
