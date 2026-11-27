import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { docxToText, textToDocx, csvToXlsx, xlsxToCsvZip, processVideo, createZipFromFiles, extractZip, extractPdfPages, mergePdfs, rotatePdf } from './processors'

const makeFile = (name: string, content: string, type = 'application/octet-stream') =>
  new File([content], name, { type })

describe('PDF processors', () => {
  it('rejects a single input instead of silently creating a one-file merge', async () => {
    await expect(mergePdfs([makeFile('one.pdf', 'not a pdf')])).rejects.toThrow()
  })

  it('merges two PDFs and preserves all pages', async () => {
    const a = await PDFDocument.create(); a.addPage()
    const b = await PDFDocument.create(); b.addPage(); b.addPage()
    const merged = await mergePdfs([
      new File([new Uint8Array(await a.save()).buffer as ArrayBuffer], 'a.pdf', { type: 'application/pdf' }),
      new File([new Uint8Array(await b.save()).buffer as ArrayBuffer], 'b.pdf', { type: 'application/pdf' }),
    ])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3)
  })

  it('extracts a selected page range', async () => {
    const source = await PDFDocument.create()
    source.addPage(); source.addPage(); source.addPage()
    const file = new File([new Uint8Array(await source.save()).buffer as ArrayBuffer], 'source.pdf', { type: 'application/pdf' })
    const result = await extractPdfPages(file, '1,3')
    expect((await PDFDocument.load(result)).getPageCount()).toBe(2)
    await expect(extractPdfPages(file, '0-2')).rejects.toThrow()
  })

  it('rotates every page by the requested amount', async () => {
    const source = await PDFDocument.create(); source.addPage()
    const file = new File([new Uint8Array(await source.save()).buffer as ArrayBuffer], 'source.pdf', { type: 'application/pdf' })
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

  it('keeps duplicate filenames distinct when creating ZIP archives', async () => {
    const archive = await createZipFromFiles([
      makeFile('same.txt', 'first'),
      makeFile('same.txt', 'second'),
      makeFile('__proto__', 'prototype-safe'),
    ])
    const entries = extractZip(archive)
    expect(entries.map(entry => entry.name)).toEqual(['same.txt', 'same (2).txt', '_proto_'])
  })

  it('filters path traversal entries during extraction', () => {
    const archive = zipSync({
      '../outside.txt': strToU8('unsafe'),
      'folder/../../escape.txt': strToU8('unsafe too'),
      'safe.txt': strToU8('safe'),
    })
    const entries = extractZip(archive)
    expect(entries.map(entry => entry.name)).toEqual(['safe.txt'])
  })

})

describe('Document and spreadsheet processors', () => {
  it('extracts text from a generated DOCX file', async () => {
    const { Document, Packer, Paragraph } = await import('docx')
    const doc = new Document({ sections: [{ children: [new Paragraph('FileLab DOCX test')] }] })
    const blob = await Packer.toBlob(doc)
    const file = new File([await blob.arrayBuffer()], 'test.docx')
    expect(await docxToText(file)).toContain('FileLab DOCX test')
  })

  it('converts TXT to DOCX and preserves its text on re-read', async () => {
    const textFile = makeFile('notes.txt', 'First line\\nSecond line', 'text/plain')
    const docx = await textToDocx(textFile)
    const docxFile = new File([await docx.arrayBuffer()], 'notes.docx')
    const extracted = await docxToText(docxFile)
    expect(extracted).toContain('First line')
    expect(extracted).toContain('Second line')
  })

  it('converts CSV to XLSX and exports worksheets back to CSV', async () => {
    const csv = new File([`name,score\nAda,10\nLinus,20`], 'scores.csv', { type: 'text/csv' })
    const xlsx = await csvToXlsx(csv)
    const xlsxFile = new File([await xlsx.arrayBuffer()], 'scores.xlsx')
    const archive = await xlsxToCsvZip(xlsxFile)
    const entries = unzipSync(archive)
    const csvOutput = new TextDecoder().decode(entries['Sheet1.csv'])
    expect(csvOutput).toContain('Ada')
    expect(csvOutput).toContain('20')
  })
})

describe('Video validation', () => {
  it('rejects unsupported extensions before loading the WebAssembly engine', async () => {
    await expect(processVideo(makeFile('not-a-video.txt', 'hello'), { quality: 28, maxWidth: 1920 }))
      .rejects.toThrow('فرمت ویدئو پشتیبانی نمی‌شود.')
  })
})
