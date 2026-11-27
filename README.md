# FileLab

A bilingual Persian/English, local-first file workspace built with React, TypeScript and Vite.

## Working tools

- **PDF:** merge files, extract selected page ranges, rotate all pages.
- **Images:** resize/compress/convert JPG, PNG and WEBP; convert images to PDF.
- **Documents:** extract plain text from DOCX; create a basic DOCX from TXT.
- **Spreadsheets:** convert XLSX worksheets to CSV files (delivered as a ZIP); convert CSV to XLSX.
- **Archives:** create ZIP archives and extract ZIP entries as individual downloads.

Video processing is intentionally marked as coming soon. A robust FFmpeg WebAssembly engine needs a separately loaded, large runtime and device-memory safeguards; the UI does not pretend this is already available.

## Privacy and limits

All current file operations run in the browser. Files are not sent to a FileLab server. Each input file is limited to 100 MB; ZIP extraction is capped at 500 entries and 250 MB total expanded size. Browser download policies may ask permission when extracting multiple files.

DOCX text extraction preserves text, not the original layout. TXT-to-DOCX creates a simple paragraph-based document. XLSX-to-CSV exports each worksheet into a CSV file inside one ZIP.

## Stack

- React 19, TypeScript, Vite
- pdf-lib for PDF operations
- Canvas / createImageBitmap for image operations
- Mammoth and docx for basic DOCX workflows
- ExcelJS and Papa Parse for spreadsheet workflows
- fflate for ZIP archives
- Vitest for unit tests

No server or credentials are required for the current client-only release. Never put Supabase service-role keys in frontend code.

## Development

Requires Node.js 22.12+.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Deploy

Cloudflare Pages:
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22

GitHub Actions runs type checking, tests and a production build on pushes and pull requests.
