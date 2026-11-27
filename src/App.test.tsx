// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

afterEach(cleanup)

describe('FileLab interface', () => {
  it('renders the Persian homepage and active tool catalog', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /همه فایل‌هایت/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'ادغام PDF' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'فشرده‌سازی ویدئو' })).toBeTruthy()
  })

  it('searches tools using their English names', () => {
    render(<App />)
    const search = screen.getByPlaceholderText('جست‌وجوی ابزار...')
    fireEvent.change(search, { target: { value: 'Compress video' } })
    expect(screen.getByRole('heading', { name: 'فشرده‌سازی ویدئو' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'ادغام PDF' })).toBeNull()
  })

  it('opens a PDF tool and accepts a selected file', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /ادغام PDF/ }))
    expect(screen.getByText('چند فایل PDF را در یک سند ترکیب کن.')).toBeTruthy()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'sample.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('sample.pdf')).toBeTruthy()
  })

  it('switches the interface to English', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }))
    expect(screen.getByRole('heading', { name: /Your files/ })).toBeTruthy()
    expect(screen.getByText('Compress video')).toBeTruthy()
  })
})