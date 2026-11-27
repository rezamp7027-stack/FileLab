# FileLab

A bilingual (Persian/English) file-processing workspace with a dark premium interface. The first release prioritizes local, in-browser processing: files handled by active tools are not uploaded to a server.

## Current status

### Working in the browser
- Merge multiple PDF files into one PDF.
- Compress/resize/convert images to JPG, PNG, or WEBP.
- Repackage the contents of a ZIP archive into a clean ZIP output.
- Persian RTL / English LTR interface, responsive layout, tool search and category filters.

### Planned
- PDF split, reorder, rotate, extract pages and protected-PDF workflows.
- DOCX read/convert/edit workflows.
- XLSX/CSV conversion and sheet operations.
- Video conversion/compression (requires a dedicated WebAssembly or remote processing strategy).
- 7z/RAR support, accounts, job history, storage and usage controls.

The interface marks unfinished tools as "Coming soon"; it does not simulate successful processing.

## Stack
- React + TypeScript + Vite
- pdf-lib for PDF assembly
- fflate for ZIP handling
- Canvas / createImageBitmap for image processing
- Cloudflare Pages for static hosting (recommended)
- Supabase is reserved for a later account/metadata layer. Do not place service-role keys in frontend code.

## Development

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

## Continuous integration

GitHub Actions runs the production build on pushes to `main` and pull requests.

## Quality checks

```bash
npm run typecheck
npm run build
```

## Deploy

Connect this repository to Cloudflare Pages:
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`

No environment variables are required for the current client-only release.

## Security notes
- Active operations run in the user's browser.
- Never upload private files without a clear user action and an explicit privacy notice.
- Validate actual file content and enforce limits before adding any future server-side processing.
- Keep Supabase service-role credentials server-side only.
