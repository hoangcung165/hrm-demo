# Checking the component library

The component library lives in the HRM design system on Claude Design (https://claude.ai/artifact/U45PfXfN1gjbT5VTXZzAQp). Render every preview to PNG after each library change and look at each image.

1. Save the system locally with the `Artifact` tool (`action: read`): `project/tokens.json`, `project/fonts/*.woff2`, `project/components/bundle.css`, and each `project/components/<Comp>/preview.html`. Keep the `project/` layout under one folder.
2. Render:
   ```bash
   node docs/design/tools/render-previews.mjs <folder> <out-dir>
   ```
   The script generates `tokens.css` from `tokens.json` (`tokens-to-css.mjs`), injects it with `bundle.css` into each preview, and screenshots it with headless Chrome (`CHROME=<path>` to override).
3. Check every PNG: text not clipped, Vietnamese diacritics intact, numbers right-aligned, every state visible, nothing relies on colour alone, text contrast at least 4.5:1 and control borders and icons at least 3:1.

`docs/design/tokens.json` mirrors the artifact's `project/tokens.json`. Update both in the same change; `web/` generates its CSS variables from the mirror (`npm run tokens`).
