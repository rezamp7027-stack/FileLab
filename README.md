# FileLab

A bilingual Persian/English, local-first file workspace built with React, TypeScript and Vite.

## Working tools

- **PDF:** merge files, extract selected page ranges, rotate all pages.
- **Images:** resize/compress/convert JPG, PNG and WEBP; convert images to PDF.
- **Documents:** extract plain text from DOCX; create a basic DOCX from TXT.
- **Spreadsheets:** convert XLSX worksheets to CSV files (delivered as a ZIP); convert CSV to XLSX.
- **Archives:** create ZIP archives and extract ZIP entries as individual downloads.
- **Video:** transcode supported video inputs to MP4 with FFmpeg WebAssembly; maximum input size is 50 MB.

## Privacy and limits

All file operations run in the browser. Files are not sent to a FileLab server. Each ordinary input file is limited to 100 MB; video inputs are limited to 50 MB. ZIP extraction is capped at 500 entries and 250 MB total expanded size. Browser download policies may ask permission when extracting multiple files.

Video processing downloads the FFmpeg WebAssembly core (about 30 MB) on first use from jsDelivr. This requires an internet connection for that first run and adequate device memory/CPU. Progress is approximate because FFmpeg's progress event is not reliable for every operation.

DOCX text extraction preserves text, not the original layout. TXT-to-DOCX creates a simple paragraph-based document. XLSX-to-CSV exports each worksheet into a CSV file inside one ZIP.

## Stack

- React 19, TypeScript, Vite
- pdf-lib for PDF operations
- Canvas / createImageBitmap for image operations
- Mammoth and docx for basic DOCX workflows
- ExcelJS and Papa Parse for spreadsheet workflows
- fflate for ZIP archives
- FFmpeg.wasm for video transcoding
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
