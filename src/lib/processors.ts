import { PDFDocument, degrees } from 'pdf-lib'
import { unzipSync, zipSync, strToU8 } from 'fflate'

export type ImageOptions = {
  format: 'image/jpeg' | 'image/png' | 'image/webp'
  quality: number
  maxWidth: number
}
export type ExtractedEntry = { name: string; data: Uint8Array }

const MAX_FILE_BYTES = 100 * 1024 * 1024
const MAX_ARCHIVE_OUTPUT_BYTES = 250 * 1024 * 1024
const MAX_ARCHIVE_ENTRIES = 500

function assertFileSize(file: File, max = MAX_FILE_BYTES) {
  if (file.size > max) throw new Error('حجم فایل از سقف مجاز این ابزار بیشتر است (۱۰۰ مگابایت).')
  if (file.size === 0) throw new Error('فایل انتخاب‌شده خالی است.')
}

export async function processImage(file: File, options: ImageOptions): Promise<Blob> {
  assertFileSize(file)
  if (!file.type.startsWith('image/')) throw new Error('فایل انتخاب‌شده تصویر معتبر نیست.')
  if (!Number.isFinite(options.maxWidth) || options.maxWidth < 1) throw new Error('حداکثر عرض تصویر معتبر نیست.')
  const bitmap = await createImageBitmap(file)
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('ابعاد تصویر معتبر نیست.')
    const scale = Math.min(1, options.maxWidth / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('مرورگر امکان پردازش تصویر را فراهم نکرد.')
    if (options.format === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('ساخت خروجی تصویر ناموفق بود.')), options.format, options.quality)
    })
    if (blob.type !== options.format) throw new Error('مرورگر از فرمت خروجی انتخاب‌شده پشتیبانی نمی‌کند.')
    return blob
  } finally {
    bitmap.close()
  }
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error('برای ادغام PDF حداقل دو فایل انتخاب کن.')
  const merged = await PDFDocument.create()
  for (const file of files) {
    assertFileSize(file)
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') throw new Error('یکی از فایل‌ها PDF نیست.')
    const source = await PDFDocument.load(await file.arrayBuffer())
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach(page => merged.addPage(page))
  }
  if (merged.getPageCount() === 0) throw new Error('هیچ صفحه‌ای برای ادغام پیدا نشد.')
  return merged.save()
}

export async function extractPdfPages(file: File, rangeText: string): Promise<Uint8Array> {
  assertFileSize(file)
  const source = await PDFDocument.load(await file.arrayBuffer())
  const total = source.getPageCount()
  const indices = new Set<number>()
  for (const segment of rangeText.split(',')) {
    const match = segment.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!match) throw new Error('بازه صفحات نامعتبر است. نمونه: 1-3,5')
    const start = Number(match[1]), end = Number(match[2] || match[1])
    if (start < 1 || end < start || end > total) throw new Error('شماره صفحه باید بین ۱ و ' + total + ' باشد.')
    for (let page = start; page <= end; page++) indices.add(page - 1)
  }
  if (!indices.size) throw new Error('هیچ صفحه‌ای انتخاب نشده است.')
  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, [...indices].sort((a, b) => a - b))
  pages.forEach(page => output.addPage(page))
  return output.save()
}

export async function rotatePdf(file: File, angle: 90 | 180 | 270): Promise<Uint8Array> {
  assertFileSize(file)
  const pdf = await PDFDocument.load(await file.arrayBuffer())
  for (const page of pdf.getPages()) {
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  }
  return pdf.save()
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  if (!files.length) throw new Error('انتخاب حداقل یک تصویر الزامی است.')
  const pdf = await PDFDocument.create()
  for (const file of files) {
    const blob = await processImage(file, { format: 'image/png', quality: 1, maxWidth: 6000 })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const image = await pdf.embedPng(bytes)
    const page = pdf.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return pdf.save()
}

export function extractZip(fileBytes: Uint8Array): ExtractedEntry[] {
  if (fileBytes.byteLength > MAX_FILE_BYTES) throw new Error('حجم ZIP بیش از ۱۰۰ مگابایت است.')
  const entries = unzipSync(fileBytes)
  const output: ExtractedEntry[] = []
  let totalBytes = 0
  for (const [rawName, data] of Object.entries(entries)) {
    if (rawName.endsWith('/')) continue
    const normalized = rawName.replace(/\\/g, '/')
    if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized)) continue
    const parts = normalized.split('/')
    if (parts.some(part => part === '..' || part === '.')) continue
    const name = parts.filter(Boolean).join('/')
    if (!name) continue
    totalBytes += data.byteLength
    if (output.length >= MAX_ARCHIVE_ENTRIES) throw new Error('آرشیو بیش از ۵۰۰ فایل دارد.')
    if (totalBytes > MAX_ARCHIVE_OUTPUT_BYTES) throw new Error('حجم فایل‌های استخراج‌شده بیش از ۲۵۰ مگابایت است.')
    output.push({ name, data })
  }
  if (!output.length) throw new Error('فایل ZIP خالی یا فاقد فایل قابل استخراج است.')
  return output
}

function uniqueArchiveName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  let candidate = name
  let index = 2
  while (used.has(candidate.toLowerCase())) candidate = base + ' (' + index++ + ')' + extension
  used.add(candidate.toLowerCase())
  return candidate
}

export async function createZipFromFiles(files: File[]): Promise<Uint8Array> {
  if (!files.length) throw new Error('برای ساخت ZIP حداقل یک فایل انتخاب کن.')
  if (files.length > MAX_ARCHIVE_ENTRIES) throw new Error('حداکثر ۵۰۰ فایل در هر ZIP مجاز است.')
  const entries: Record<string, Uint8Array> = {}
  let total = 0
  const used = new Set<string>()
  for (const file of files) {
    assertFileSize(file)
    const rawName = file.name.replace(/[\\/]/g, '_').replace(/^\\.+/, '').trim()
    if (!rawName) continue
    const name = uniqueArchiveName(rawName, used)
    total += file.size
    if (total > MAX_ARCHIVE_OUTPUT_BYTES) throw new Error('حجم مجموع فایل‌ها از ۲۵۰ مگابایت بیشتر است.')
    entries[name] = new Uint8Array(await file.arrayBuffer())
  }
  return zipSync(entries, { level: 6 })
}

export async function docxToText(file: File): Promise<string> {
  assertFileSize(file)
  if (!file.name.toLowerCase().endsWith('.docx')) throw new Error('فقط فایل DOCX پشتیبانی می‌شود.')
  const mammoth = (await import('mammoth')).default
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value.trim() || 'متنی در سند پیدا نشد.'
}

export async function textToDocx(file: File): Promise<Blob> {
  assertFileSize(file)
  const text = await file.text()
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n').map(line =>
    new Paragraph({ children: [new TextRun(line)] }),
  )
  const document = new Document({ sections: [{ properties: {}, children: paragraphs }] })
  return Packer.toBlob(document)
}

export async function xlsxToCsvZip(file: File): Promise<Uint8Array> {
  assertFileSize(file)
  const ExcelJS = (await import('exceljs')).default
  const Papa = (await import('papaparse')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const entries: Record<string, Uint8Array> = {}
  for (const sheet of workbook.worksheets) {
    const rows: unknown[][] = []
    sheet.eachRow({ includeEmpty: false }, row => {
      const values = Array.from({ length: row.cellCount }, (_, index) => row.getCell(index + 1).value)
      rows.push(values.map(value => {
        if (value && typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text)
        if (value instanceof Date) return value.toISOString()
        return value == null ? '' : String(value)
      }))
    })
    const csv = Papa.unparse(rows, { newline: '\r\n' })
    entries[(sheet.name || 'sheet').replace(/[^\p{L}\p{N}_-]/gu, '_') + '.csv'] = strToU8('\uFEFF' + csv)
  }
  if (!Object.keys(entries).length) throw new Error('هیچ برگه‌ای در فایل Excel پیدا نشد.')
  return zipSync(entries, { level: 6 })
}

export async function csvToXlsx(file: File): Promise<Blob> {
  assertFileSize(file)
  const Papa = (await import('papaparse')).default
  const ExcelJS = (await import('exceljs')).default
  const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: 'greedy' })
  if (parsed.errors.length) throw new Error('خطا در خواندن CSV: ' + parsed.errors[0].message)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sheet1')
  for (const row of parsed.data) sheet.addRow(row)
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([new Uint8Array(buffer).buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(blob: Blob | Uint8Array, filename: string, mime = 'application/octet-stream') {
  const output = blob instanceof Blob
    ? blob
    : new Blob([new Uint8Array(blob).buffer as ArrayBuffer], { type: mime })
  const url = URL.createObjectURL(output)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadExtracted(entries: ExtractedEntry[]) {
  entries.forEach((entry, index) => {
    window.setTimeout(() => downloadBlob(entry.data, entry.name), index * 350)
  })
}

type VideoOptions = { quality: number; maxWidth: number; onProgress?: (progress: number) => void }
let ffmpegInstance: import('@ffmpeg/ffmpeg').FFmpeg | null = null
let ffmpegLoadPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null

async function getVideoEngine() {
  if (ffmpegInstance) return ffmpegInstance
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ])
      const engine = new FFmpeg()
      const coreBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
      await engine.load({
        coreURL: await toBlobURL(coreBase + '/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL(coreBase + '/ffmpeg-core.wasm', 'application/wasm'),
      })
      ffmpegInstance = engine
      return engine
    })().catch(error => {
      ffmpegLoadPromise = null
      throw error
    })
  }
  return ffmpegLoadPromise
}

export async function processVideo(file: File, options: VideoOptions): Promise<Blob> {
  if (file.size === 0 || file.size > 50 * 1024 * 1024) throw new Error('برای پردازش ویدئو، حجم فایل باید حداکثر ۵۰ مگابایت باشد.')
  const extension = file.name.match(/\\.(mp4|mov|webm|mkv|avi|m4v)$/i)?.[1]?.toLowerCase()
  if (!extension) throw new Error('فرمت ویدئو پشتیبانی نمی‌شود.')
  if (options.maxWidth < 240 || options.maxWidth > 3840) throw new Error('عرض خروجی نامعتبر است.')
  if (options.quality < 18 || options.quality > 35) throw new Error('تنظیم کیفیت نامعتبر است.')
  const engine = await getVideoEngine()
  const inputName = 'filelab-input.' + extension
  const outputName = 'filelab-output.mp4'
  try { await engine.deleteFile(inputName) } catch { /* no previous input */ }
  try { await engine.deleteFile(outputName) } catch { /* no previous output */ }
  const onProgress = ({ progress }: { progress: number }) => {
    options.onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))))
  }
  engine.on('progress', onProgress)
  try {
    await engine.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))
    const exitCode = await engine.exec([
      '-i', inputName,
      '-vf', 'scale=min(' + options.maxWidth + ',iw):-2',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', String(options.quality),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', outputName,
    ])
    if (exitCode !== 0) throw new Error('موتور ویدئو نتوانست فایل را تبدیل کند. ممکن است کدک ورودی پشتیبانی نشود.')
    const result = await engine.readFile(outputName)
    if (typeof result === 'string') throw new Error('خروجی ویدئو معتبر نیست.')
    const bytes = new Uint8Array(result)
    if (!bytes.length) throw new Error('فایل خروجی ویدئو خالی است.')
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' })
  } finally {
    engine.off('progress', onProgress)
    try { await engine.deleteFile(inputName) } catch { /* cleanup best effort */ }
    try { await engine.deleteFile(outputName) } catch { /* cleanup best effort */ }
  }
}
