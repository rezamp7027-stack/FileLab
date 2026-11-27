import { PDFDocument } from 'pdf-lib'
import { unzipSync, zipSync, strToU8 } from 'fflate'

export type ImageOptions = {
  format: 'image/jpeg' | 'image/png' | 'image/webp'
  quality: number
  maxWidth: number
}

export async function processImage(file: File, options: ImageOptions): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, options.maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('مرورگر امکان پردازش تصویر را فراهم نکرد.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('ساخت خروجی تصویر ناموفق بود.')),
      options.format,
      options.quality,
    )
  })
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error('برای ادغام PDF حداقل دو فایل انتخاب کن.')
  const merged = await PDFDocument.create()
  for (const file of files) {
    const source = await PDFDocument.load(await file.arrayBuffer())
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach(page => merged.addPage(page))
  }
  return merged.save()
}

export function extractZip(fileBytes: Uint8Array): Uint8Array {
  const entries = unzipSync(fileBytes)
  const output: Record<string, Uint8Array> = {}
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('/')) continue
    const safeName = name.replace(/^\/+/, '').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
    if (safeName) output[safeName] = data
  }
  if (Object.keys(output).length === 0) throw new Error('فایل ZIP خالی است یا محتوای قابل استخراج ندارد.')
  return zipSync(output, { level: 6 })
}

export function makeTextFile(text: string): Blob {
  return new Blob([strToU8(text)], { type: 'text/plain;charset=utf-8' })
}

export function downloadBlob(blob: Blob | Uint8Array, filename: string, mime = 'application/octet-stream') {
  const output = blob instanceof Blob ? blob : new Blob([blob], { type: mime })
  const url = URL.createObjectURL(output)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
