# Room Home Lantern

- Output: `app/assets/ui/bg/room-home-lantern.webp` (858×1830, opaque WebP)
- Method: built-in `image_gen`, using `room-deai-full.png` and `screen-zukan.png` as style references. `room-home-full.png` was used only in the before/after preview.
- Prompt: Create a warm dusk-time Japanese home zashiki in the existing amber, softly painted game-art style, with shoji, a paw-print noren, lantern, a little cherry blossom and a quiet alcove. Keep the top beam dark and calm, leave the upper-right button area quiet, and align the rear wall above a broad medium-light empty plank floor. No cats, text, logos or watermark.
- Processing: The opaque 860×1829 RGB generation was divided at y=219 and y=845. The 219px beam strip stayed the same height; the 626px wall section was scaled to 531px; the 984px floor section was scaled to 1080px. The sections were stacked and encoded as 858×1830 WebP at quality 91.
- Measured `top`: the wall/floor boundary is at y=750 of 1830px (0.4098), registered as `0.41`.
- SHA-256: `e861fdca93b44b27c13f90d594d25f6cdcc0e5ded44c4a286211633afa64b7b5`
- Bytes: 143266
- Review previews: `assets/ui-records/previews/home-bg-with-ui.png`, `assets/ui-records/previews/home-bg-vs-deai-vs-zukan.png`, and `assets/ui-records/previews/home-bg-before-after.png`.
