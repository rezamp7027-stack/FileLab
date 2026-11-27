// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function renderApp() {
  act(() => root.render(<App />))
}

function click(element: Element | null | undefined) {
  if (!element) throw new Error('Expected clickable element was not found')
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

describe('FileLab interface', () => {
  it('renders the Persian homepage and active tool catalog', () => {
    renderApp()
    expect(host.querySelector('h1')?.textContent).toContain('همه فایل‌هایت')
    const titles = [...host.querySelectorAll('.tool-card h3')].map(element => element.textContent)
    expect(titles).toContain('ادغام PDF')
    expect(titles).toContain('فشرده‌سازی ویدئو')
  })

  it('searches tools using their English names', () => {
    renderApp()
    const search = host.querySelector('input[placeholder="جست‌وجوی ابزار..."]') as HTMLInputElement
    act(() => {
      search.value = 'Compress video'
      search.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const titles = [...host.querySelectorAll('.tool-card h3')].map(element => element.textContent)
    expect(titles).toContain('فشرده‌سازی ویدئو')
    expect(titles).not.toContain('ادغام PDF')
  })

  it('opens a PDF tool and accepts a selected file', () => {
    renderApp()
    const mergeCard = [...host.querySelectorAll('.tool-card')].find(element => element.textContent?.includes('ادغام PDF'))
    click(mergeCard)
    expect(host.textContent).toContain('چند فایل PDF را در یک سند ترکیب کن.')
    const input = host.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'sample.pdf', { type: 'application/pdf' })
    act(() => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(host.textContent).toContain('sample.pdf')
  })

  it('switches the interface to English', () => {
    renderApp()
    click(host.querySelector('[aria-label="Change language"]'))
    expect(host.querySelector('h1')?.textContent).toContain('Your files')
    expect(host.textContent).toContain('Compress video')
  })
})