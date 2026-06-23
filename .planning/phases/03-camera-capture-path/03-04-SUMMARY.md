# 03-04: Moments screen — grouped timeline, layout toggle, face annotation

**Status:** Complete

## What was built

- **MomentGroupCarousel** (Layout A) — horizontal photo carousel per group. Shows date range, photo count, location badge, face chips. Pure presentational (no DB imports).
- **MomentLocationCards** (Layout B) — location-clustered cards per group. Sub-clusters moments by place_name and renders one card per location with photo count + thumbnails. Pure presentational.
- **MomentsScreen** — full replacement of stub. Reads `moment_groups` + members on focus, hydrates groups with moment + face data. Layout mode persisted via `app_settings` key `moments_layout` (default 'carousel'). Toggle switches between carousel/location views. Re-group button calls `RegroupService.regroup()` with spinner reflecting idle/running/queued state. Face chip tap navigates to `EntryDetail` (known person) or `NewEntry` (anonymous).

## Deviations

None.

## Files created

- `src/components/moments/MomentGroupCarousel.tsx`
- `src/components/moments/MomentLocationCards.tsx`

## Files modified

- `src/screens/MomentsScreen.tsx` — full rewrite

## Verification

- Layout preference round-trips through app_settings
- Layout components are presentational (props only, no DB imports)
- Re-group reflects RegroupService status via subscription
- `tsc --noEmit` passes clean
