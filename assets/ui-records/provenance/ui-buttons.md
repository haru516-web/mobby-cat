# UI buttons and collection background — 2026-10-29

Branch: `codex/ui-buttons`; checkout: `.worktrees/ui-buttons`. Five assets only: four additions and one replacement. All artwork generated with built-in image_gen. Exact prompts and source paths are in `ui-buttons-jobs.json`; final hashes, dimensions, alpha and slice values are in the manifest and `ui-buttons-validation.json`.

## Decisions and processing

- Settings uses bell-round as the image reference. Home cats uses login-record-round. Cream plate, fine brown rim and upper-left light are matched; each final alpha footprint is fitted to its corresponding existing reference. Cats have asymmetric normal/lens eyes; no body controls are needed for face-only icons.
- Track is generated artwork, cropped to alpha>8 bounds and divided into top/middle/bottom segments. End caps including the minimum dot are resampled into fixed 42px bands; only the middle stretches. Channel alpha is multiplied by 0.72, then a soft dark backing derived from the generated alpha is composited underneath for bright-scene contrast; idle 0.4 opacity belongs to the consuming app and is demonstrated in previews, not permanently baked into all components.
- Thumb preserves generated white circle, orange paw and shadow, with 3px clearance.
- Background references room-home-full and old screen-zukan. It is one room with bookcases, cat pictures and uninterrupted wooden flooring, including bottom edge. Full bleed RGB, 1179×2556. No text is baked into any delivered asset.
- Resize/crop/composite only via Sharp; no artwork redrawn in code. `build-ui-buttons.cjs` records the processing and preview recipe. Generated originals remain at the tool-reported local paths.
- Manifest top-level counts were stale (215 vs 154 actual entries before this batch). Recomputed from the final 158 entries; no unrelated entries removed or changed.
- Registry regenerated with `tools/build-ui-registry.ps1`. Existing entry order is preserved afterwards to avoid unrelated sorting changes, as authorized in UI_BUTTONS_PROMPT.md.

## Previews and validation

- `ui-buttons-home.png`: home background, cat/calendar 52pt circles with 12pt spacing; bell/settings side by side.
- `ui-buttons-camera.png`: bundled Windows landscape img29.jpg used solely as preview scenery. Left to right: bright idle/bottom, bright active/middle, dark idle/bottom, dark active/middle. Idle alpha40%, active100%; track14×220pt and thumb30×30pt.
- `ui-buttons-zukan.png`: real card-cream asset using its64px nine-slice, covering lower three quarters. Background remains visible along the edges and behind the top/notch.
- Final dimensions, PNG alpha and SHA-256 verified independently against manifest; preview composites visually inspected. These are asset compositing checks, not device/runtime interaction checks.
- Typecheck and lint attempted using existing read-only tools in primary checkout. Both are blocked by missing worktree dependencies (`expo/tsconfig.base`, React modules; `eslint/config`). No app code or dependency files changed.

Slice order is top/right/bottom/left: track42/0/42/0; all other four assets0/0/0/0 (not nine-slice components).
