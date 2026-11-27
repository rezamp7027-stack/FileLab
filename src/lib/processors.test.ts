import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createZipFromFiles, extractZip, extractPdfPages, mergePdfs, rotatePdf } from './processors'

const makeFile = (name: string, content: string, type = 'application/octet-stream') =>
  new File([content], name, { type })

describe('PDF processors', () => {
  it('merges two PDFs and preserves all pages', async () => {
    const a = await PDFDocument.create(); a.addPage()
    const b = await PDFDocument.create(); b.addPage(); b.addPage()
    const merged = await mergePdfs([
      new File([await a.save()], 'a.pdf', { type: 'application/pdf' }),
      new File([await b.save()], 'b.pdf', { type: 'application/pdf' }),
    ])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3)
  })

  it('extracts a selected page range', async () => {
    const source = await PDFDocument.create()
    source.addPage(); source.addPage(); source.addPage()
    const file = new File([await source.save()], 'source.pdf', { type: 'application/pdf' })
    const result = await extractPdfPages(file, '1,3')
    expect((await PDFDocument.load(result)).getPageCount()).toBe(2)
    await expect(extractPdfPages(file, '0-2')).rejects.toThrow()
  })

  it('rotates every page by the requested amount', async () => {
    const source = await PDFDocument.create(); source.addPage()
    const file = new File([await source.save()], 'source.pdf', { type: 'application/pdf' })
    const rotated = await PDFDocument.load(await rotatePdf(file, 90))
    expect(rotated.getPage(0).getRotation().angle).toBe(90)
  })
})

describe('ZIP processors', () => {
  it('creates and extracts an archive with file bytes intact', async () => {
    const archive = await createZipFromFiles([makeFile('hello.txt', 'hello world')])
    const entries = extractZip(archive)
    expect(entries).toHaveLength(1)
    expect(new TextDecoder().decode(entries[0].data)).toBe('hello world')
  })

  it('rejects an empty archive', () => {
    expect(() => extractZip(new Uint8Array())).toThrow()
  })
})