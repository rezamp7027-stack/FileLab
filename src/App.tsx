import { useMemo, useRef, useState } from 'react'
import {
  Archive, ArrowDownToLine, ArrowLeft, ArrowRight, Check, FileImage, FileSpreadsheet,
  FileText, Film, FolderOpen, Globe2, Layers3, LockKeyhole, Menu, Search, ShieldCheck,
  Sparkles, UploadCloud, X, Zap, RotateCw, Scissors,
} from 'lucide-react'
import {
  createZipFromFiles, csvToXlsx, docxToText, downloadBlob, downloadExtracted, processVideo,
  extractPdfPages, extractZip, imagesToPdf, mergePdfs, processImage, rotatePdf,
  textToDocx, xlsxToCsvZip,
} from './lib/processors'

type Category = 'all' | 'pdf' | 'document' | 'spreadsheet' | 'image' | 'video' | 'archive'
type Tool = { id: string; category: Exclude<Category, 'all'>; title: string; description: string; titleEn: string; descriptionEn: string; status: 'ready' | 'soon'; icon: typeof FileText; formats: string; multiple?: boolean; accept?: string }
const tools: Tool[] = [
  { id: 'merge-pdf', category: 'pdf', title: 'ادغام PDF', description: 'چند فایل PDF را در یک سند ترکیب کن.', titleEn: 'Merge PDFs', descriptionEn: 'Combine multiple PDF files into one document.', status: 'ready', icon: Layers3, formats: 'PDF', multiple: true, accept: '.pdf,application/pdf' },
  { id: 'extract-pdf', category: 'pdf', title: 'استخراج صفحات PDF', description: 'صفحات دلخواه را در یک PDF جدا ذخیره کن.', titleEn: 'Extract PDF pages', descriptionEn: 'Save selected pages as a separate PDF.', status: 'ready', icon: Scissors, formats: 'PDF', accept: '.pdf,application/pdf' },
  { id: 'rotate-pdf', category: 'pdf', title: 'چرخاندن PDF', description: 'تمام صفحات سند را ۹۰، ۱۸۰ یا ۲۷۰ درجه بچرخان.', titleEn: 'Rotate PDF', descriptionEn: 'Rotate every page by 90, 180 or 270 degrees.', status: 'ready', icon: RotateCw, formats: 'PDF', accept: '.pdf,application/pdf' },
  { id: 'image-compress', category: 'image', title: 'فشرده‌سازی و تبدیل تصویر', description: 'حجم، ابعاد و فرمت خروجی تصویر را تنظیم کن.', titleEn: 'Compress & convert image', descriptionEn: 'Adjust image size, dimensions and output format.', status: 'ready', icon: FileImage, formats: 'JPG · PNG · WEBP', accept: 'image/*' },
  { id: 'image-pdf', category: 'image', title: 'تصویر به PDF', description: 'یک یا چند تصویر را به سند PDF تبدیل کن.', titleEn: 'Images to PDF', descriptionEn: 'Combine one or more images into a PDF document.', status: 'ready', icon: FileImage, formats: 'JPG · PNG · WEBP', multiple: true, accept: 'image/*' },
  { id: 'docx-text', category: 'document', title: 'استخراج متن Word', description: 'متن فایل DOCX را به TXT تبدیل کن.', titleEn: 'Extract Word text', descriptionEn: 'Extract plain text from a DOCX document.', status: 'ready', icon: FileText, formats: 'DOCX · TXT', accept: '.docx' },
  { id: 'txt-docx', category: 'document', title: 'TXT به Word', description: 'فایل متنی را به سند DOCX تبدیل کن.', titleEn: 'TXT to Word', descriptionEn: 'Create a basic DOCX document from a text file.', status: 'ready', icon: FileText, formats: 'TXT · DOCX', accept: '.txt,.text' },
  { id: 'xlsx-csv', category: 'spreadsheet', title: 'Excel به CSV', description: 'تمام برگه‌های Excel را به فایل‌های CSV تبدیل کن.', titleEn: 'Excel to CSV', descriptionEn: 'Export each Excel worksheet as a CSV file.', status: 'ready', icon: FileSpreadsheet, formats: 'XLSX · CSV', accept: '.xlsx' },
  { id: 'csv-xlsx', category: 'spreadsheet', title: 'CSV به Excel', description: 'فایل CSV را به workbook اکسل تبدیل کن.', titleEn: 'CSV to Excel', descriptionEn: 'Convert a CSV file into an Excel workbook.', status: 'ready', icon: FileSpreadsheet, formats: 'CSV · XLSX', accept: '.csv,text/csv' },
  { id: 'zip-extract', category: 'archive', title: 'استخراج ZIP', description: 'فایل‌های داخل آرشیو ZIP را جداگانه دریافت کن.', titleEn: 'Extract ZIP', descriptionEn: 'Extract files from a ZIP archive as individual downloads.', status: 'ready', icon: Archive, formats: 'ZIP', accept: '.zip,application/zip' },
  { id: 'zip-create', category: 'archive', title: 'ساخت ZIP', description: 'چند فایل را در یک آرشیو فشرده قرار بده.', titleEn: 'Create ZIP', descriptionEn: 'Pack multiple files into one ZIP archive.', status: 'ready', icon: Archive, formats: 'ZIP', multiple: true },
  { id: 'video-compress', category: 'video', title: 'فشرده‌سازی ویدئو', description: 'تبدیل و فشرده‌سازی با موتور FFmpeg در مرورگر.', titleEn: 'Compress video', descriptionEn: 'Convert and compress video using an in-browser FFmpeg engine.', status: 'ready', icon: Film, formats: 'MP4 · MOV · WEBM · MKV', accept: 'video/*' },
]
const categories: { id: Category; label: string; en: string; icon: typeof FileText }[] = [
  { id: 'all', label: 'همه ابزارها', en: 'All tools', icon: Layers3 },
  { id: 'pdf', label: 'PDF', en: 'PDF', icon: FileText },
  { id: 'document', label: 'اسناد', en: 'Documents', icon: FileText },
  { id: 'spreadsheet', label: 'صفحه‌گسترده', en: 'Spreadsheets', icon: FileSpreadsheet },
  { id: 'image', label: 'تصویر', en: 'Images', icon: FileImage },
  { id: 'video', label: 'ویدئو', en: 'Video', icon: Film },
  { id: 'archive', label: 'فشرده', en: 'Archives', icon: Archive },
]
const MAX_INPUT = 100 * 1024 * 1024

function App() {
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [language, setLanguage] = useState<'fa' | 'en'>('fa')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp')
  const [quality, setQuality] = useState(78)
  const [maxWidth, setMaxWidth] = useState(2400)
  const [pageRange, setPageRange] = useState('1-3')
  const [rotation, setRotation] = useState<90 | 180 | 270>(90)
  const [videoQuality, setVideoQuality] = useState(28)
  const [videoWidth, setVideoWidth] = useState(1920)
  const [videoProgress, setVideoProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTools = useMemo(() => tools.filter(tool =>
    (category === 'all' || tool.category === category) &&
    (tool.title.toLowerCase().includes(search.toLowerCase()) || tool.description.toLowerCase().includes(search.toLowerCase()) || tool.titleEn.toLowerCase().includes(search.toLowerCase()) || tool.descriptionEn.toLowerCase().includes(search.toLowerCase()) || tool.formats.toLowerCase().includes(search.toLowerCase())),
  ), [category, search])

  const chooseTool = (tool: Tool) => {
    if (tool.status !== 'ready') return
    setSelectedTool(tool); setFiles([]); setMessage(''); setMessageError(false)
  }
  const showMessage = (value: string, error = false) => { setMessage(value); setMessageError(error) }
  const handleFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    if (!list.length || !selectedTool) return
    if (list.some(file => file.size === 0 || file.size > (selectedTool.id === 'video-compress' ? 50 * 1024 * 1024 : MAX_INPUT))) return showMessage(selectedTool.id === 'video-compress' ? 'حجم هر ویدئو حداکثر ۵۰ مگابایت است.' : 'هر فایل باید بین ۱ بایت تا ۱۰۰ مگابایت باشد.', true)
    if (!selectedTool.multiple && list.length > 1) return showMessage('این ابزار در هر بار فقط یک فایل می‌پذیرد.', true)
    const ext = (file: File) => file.name.split('.').pop()?.toLowerCase() || ''
    const valid = (file: File) => {
      switch (selectedTool.id) {
        case 'merge-pdf': case 'extract-pdf': case 'rotate-pdf': return ext(file) === 'pdf' || file.type === 'application/pdf'
        case 'image-compress': case 'image-pdf': return (!file.type || file.type.startsWith('image/')) && ['png','jpg','jpeg','webp'].includes(ext(file))
        case 'docx-text': return ext(file) === 'docx'
        case 'txt-docx': return ext(file) === 'txt' || file.type === 'text/plain'
        case 'xlsx-csv': return ext(file) === 'xlsx'
        case 'csv-xlsx': return ext(file) === 'csv' || file.type === 'text/csv'
        case 'zip-extract': return ext(file) === 'zip'
        case 'video-compress': return (!file.type || file.type.startsWith('video/')) && ['mp4','mov','webm','mkv','avi','m4v'].includes(ext(file))
        default: return true
      }
    }
    if (list.some(file => !valid(file))) return showMessage('نوع یکی از فایل‌ها با ابزار انتخاب‌شده سازگار نیست.', true)
    setFiles(list); showMessage('')
  }

  const runTool = async () => {
    if (!selectedTool || !files.length || busy) return
    setBusy(true); showMessage('')
    try {
      const first = files[0]
      switch (selectedTool.id) {
        case 'merge-pdf': {
          const out = await mergePdfs(files); downloadBlob(out, 'filelab-merged.pdf', 'application/pdf')
          showMessage('فایل‌های PDF با موفقیت ادغام شدند.')
          break
        }
        case 'extract-pdf': {
          const out = await extractPdfPages(first, pageRange); downloadBlob(out, 'filelab-pages.pdf', 'application/pdf')
          showMessage('صفحات انتخاب‌شده در فایل PDF جدید ذخیره شدند.')
          break
        }
        case 'rotate-pdf': {
          const out = await rotatePdf(first, rotation); downloadBlob(out, 'filelab-rotated.pdf', 'application/pdf')
          showMessage('چرخش صفحات PDF انجام شد.')
          break
        }
        case 'image-compress': {
          const out = await processImage(first, { format, quality: quality / 100, maxWidth })
          const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'
          downloadBlob(out, first.name.replace(/\.[^.]+$/, '') + '-filelab.' + ext)
          const saved = Math.round((1 - out.size / first.size) * 100)
          showMessage(saved >= 0 ? 'حجم خروجی ' + saved + '٪ کمتر است.' : 'خروجی آماده شد؛ حجم آن ' + Math.abs(saved) + '٪ بیشتر شده است.')
          break
        }
        case 'image-pdf': {
          const out = await imagesToPdf(files); downloadBlob(out, 'filelab-images.pdf', 'application/pdf')
          showMessage('تصاویر به PDF تبدیل شدند.')
          break
        }
        case 'docx-text': {
          const text = await docxToText(first); downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), first.name.replace(/\.docx$/i, '') + '.txt')
          showMessage('متن سند استخراج شد.')
          break
        }
        case 'txt-docx': {
          const out = await textToDocx(first); downloadBlob(out, first.name.replace(/\.txt$/i, '') + '.docx')
          showMessage('سند Word ساخته شد.')
          break
        }
        case 'xlsx-csv': {
          const out = await xlsxToCsvZip(first); downloadBlob(out, first.name.replace(/\.xlsx$/i, '') + '-csv.zip', 'application/zip')
          showMessage('برگه‌های Excel به CSV تبدیل و در ZIP بسته‌بندی شدند.')
          break
        }
        case 'csv-xlsx': {
          const out = await csvToXlsx(first); downloadBlob(out, first.name.replace(/\.csv$/i, '') + '.xlsx')
          showMessage('فایل Excel ساخته شد.')
          break
        }
        case 'zip-extract': {
          const entries = extractZip(new Uint8Array(await first.arrayBuffer())); downloadExtracted(entries)
          showMessage(entries.length + ' فایل از آرشیو استخراج شد. مرورگر ممکن است برای دانلود چند فایل اجازه بخواهد.')
          break
        }
        case 'zip-create': {
          const out = await createZipFromFiles(files); downloadBlob(out, 'filelab-archive.zip', 'application/zip')
          showMessage('آرشیو ZIP ساخته شد.')
          break
        }
        case 'video-compress': {
          setVideoProgress(0)
          const out = await processVideo(first, { quality: videoQuality, maxWidth: videoWidth, onProgress: setVideoProgress })
          downloadBlob(out, first.name.replace(/\.[^.]+$/, '') + '-filelab.mp4', 'video/mp4')
          showMessage('ویدئو به MP4 تبدیل و فشرده شد.')
          setVideoProgress(100)
          break
        }
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'پردازش فایل ناموفق بود.', true)
    } finally { setBusy(false) }
  }

  const isEnglish = language === 'en'
  return (
    <div className={isEnglish ? 'app english' : 'app'} dir={isEnglish ? 'ltr' : 'rtl'}>
      <header className="topbar">
        <a className="brand" href="#" onClick={() => { setSelectedTool(null); setCategory('all') }}>
          <span className="brand-mark"><Layers3 size={21} strokeWidth={2.5} /></span>
          <span>File<span className="brand-light">Lab</span><small>YOUR FILE WORKSPACE</small></span>
        </a>
        <nav className={mobileMenu ? 'nav open' : 'nav'}>
          <a href="#tools" onClick={() => setMobileMenu(false)}>{isEnglish ? 'Tools' : 'ابزارها'}</a>
          <a href="#how" onClick={() => setMobileMenu(false)}>{isEnglish ? 'How it works' : 'نحوه کار'}</a>
          <a href="#privacy" onClick={() => setMobileMenu(false)}>{isEnglish ? 'Privacy' : 'حریم خصوصی'}</a>
        </nav>
        <div className="top-actions">
          <button className="icon-button language-button" onClick={() => setLanguage(isEnglish ? 'fa' : 'en')} aria-label="Change language"><Globe2 size={17} /><span>{isEnglish ? 'FA' : 'EN'}</span></button>
          <button className="icon-button mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button>
          <button className="header-cta" onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })}>{isEnglish ? 'Explore tools' : 'مشاهده ابزارها'} <ArrowLeft size={16} /></button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="pulse" /> {isEnglish ? 'A smarter way to work with files' : 'راه ساده‌تر برای کار با فایل‌ها'}</div>
            <h1>{isEnglish ? <>Your files.<br /><span>One powerful workspace.</span></> : <>همه فایل‌هایت،<br /><span>در یک فضای حرفه‌ای.</span></>}</h1>
            <p>{isEnglish ? 'Convert, organize and optimize documents, images, videos and archives — all in one place.' : 'تبدیل، مرتب‌سازی و بهینه‌سازی اسناد، تصاویر، ویدئوها و فایل‌های فشرده؛ همه در یک محیط.'}</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth' })}>{isEnglish ? 'Browse all tools' : 'شروع با ابزارها'} <ArrowLeft size={17} /></button>
              <div className="trust-note"><ShieldCheck size={17} /><span>{isEnglish ? 'Private by design' : 'پردازش محلی و خصوصی'}</span></div>
            </div>
            <div className="hero-stats">
              <div><strong>06</strong><span>{isEnglish ? 'File categories' : 'دسته‌بندی فایل'}</span></div><i />
              <div><strong>12</strong><span>{isEnglish ? 'Working tools' : 'ابزار فعال'}</span></div><i />
              <div><strong>0</strong><span>{isEnglish ? 'Uploads required' : 'آپلود اجباری'}</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="file-stack">
              <div className="stack-top"><div className="mini-brand"><span /> FILELAB / WORKSPACE</div><span className="live-dot">LOCAL</span></div>
              <div className="stack-title">{isEnglish ? 'What are we working on?' : 'امروز روی چه فایلی کار می‌کنی؟'}</div>
              <div className="stack-files">
                <div className="stack-file"><span className="file-type pdf">PDF</span><div><b>Project-brief.pdf</b><small>2.4 MB · 12 pages</small></div><Check size={16} /></div>
                <div className="stack-file"><span className="file-type img">IMG</span><div><b>Product-shot.webp</b><small>840 KB · 2400 × 1600</small></div><Check size={16} /></div>
                <div className="stack-file"><span className="file-type zip">ZIP</span><div><b>Assets-bundle.zip</b><small>18.2 MB · 24 files</small></div><ArrowDownToLine size={16} /></div>
              </div>
              <div className="stack-progress"><div><span>{isEnglish ? 'Workspace ready' : 'فضای کار آماده است'}</span><b>11 TOOLS</b></div><span className="progress-track"><i /></span></div>
            </div>
            <div className="floating-chip chip-secure"><ShieldCheck size={15} /> {isEnglish ? 'Your files stay yours' : 'فایل‌ها نزد خودت می‌مانند'}</div>
            <div className="floating-chip chip-fast"><Zap size={15} /> {isEnglish ? 'Fast local processing' : 'پردازش محلی'}</div>
          </div>
        </section>
        <section className="tool-section" id="tools">
          <div className="section-heading">
            <div><div className="section-kicker">{isEnglish ? 'THE TOOLBOX' : 'جعبه ابزار'}</div><h2>{isEnglish ? 'What do you need to do?' : 'چه کاری می‌خواهی انجام بدهی؟'}</h2><p>{isEnglish ? 'Pick a category or search for a specific task.' : 'یک دسته را انتخاب کن یا مستقیم دنبال ابزار موردنظرت بگرد.'}</p></div>
            <div className="search-box"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEnglish ? 'Search tools...' : 'جست‌وجوی ابزار...'} /></div>
          </div>
          <div className="tool-layout">
            <aside className="category-list">
              <span className="category-caption">{isEnglish ? 'CATEGORIES' : 'دسته‌بندی‌ها'}</span>
              {categories.map(item => { const Icon = item.icon; return <button key={item.id} className={category === item.id ? 'category active' : 'category'} onClick={() => setCategory(item.id)}><Icon size={17} /><span>{isEnglish ? item.en : item.label}</span><small>{item.id === 'all' ? tools.length : tools.filter(tool => tool.category === item.id).length}</small></button> })}
              <div className="sidebar-note"><Sparkles size={16} /><b>{isEnglish ? 'Video engine in progress' : 'موتور ویدئو در دست توسعه است'}</b><p>{isEnglish ? 'Video processing needs a separate WebAssembly engine.' : 'پردازش ویدئو به موتور مستقل و حجیم WebAssembly نیاز دارد.'}</p></div>
            </aside>
            <div className="tools-content">
              {selectedTool ? (
                <div className="workspace">
                  <button className="back-link" onClick={() => { setSelectedTool(null); setFiles([]); setMessage('') }}><ArrowRight size={16} /> {isEnglish ? 'Back to tools' : 'بازگشت به ابزارها'}</button>
                  <div className="workspace-title"><span className="workspace-icon"><selectedTool.icon size={22} /></span><div><h3>{isEnglish ? selectedTool.titleEn : selectedTool.title}</h3><p>{isEnglish ? selectedTool.descriptionEn : selectedTool.description}</p></div></div>
                  <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}>
                    <input ref={inputRef} type="file" hidden multiple={!!selectedTool.multiple} accept={selectedTool.accept || '*/*'} onChange={e => { handleFiles(e.target.files || []); e.currentTarget.value = '' }} />
                    <span className="upload-icon"><UploadCloud size={25} /></span><b>{isEnglish ? 'Drop files here or browse' : 'فایل‌ها را اینجا رها کن یا انتخاب کن'}</b>
                    <small>{selectedTool.formats} · {selectedTool.id === 'video-compress' ? 'حداکثر ۵۰ مگابایت' : 'حداکثر ۱۰۰ مگابایت'} برای هر فایل</small>
                    <button className="browse-button" type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}><FolderOpen size={15} /> {isEnglish ? 'Choose files' : 'انتخاب فایل'}</button>
                  </div>
                  {files.length > 0 && <div className="selected-files"><div className="selected-head"><b>{isEnglish ? 'Selected files' : 'فایل‌های انتخاب‌شده'}</b><button onClick={() => setFiles([])}><X size={14} /> {isEnglish ? 'Clear' : 'پاک‌کردن'}</button></div>{files.map((file, index) => <div className="selected-file" key={file.name + index}><FileText size={17} /><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div>)}</div>}
                  {selectedTool.id === 'image-compress' && <div className="options-panel"><label>فرمت خروجی<select value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label><label>کیفیت (برای JPG و WEBP) <b>{quality}%</b><input type="range" min="30" max="100" value={quality} disabled={format === 'image/png'} onChange={e => setQuality(Number(e.target.value))} /></label><label>حداکثر عرض<select value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))}><option value="1200">1200 px</option><option value="1920">1920 px</option><option value="2400">2400 px</option><option value="4000">4000 px</option></select></label></div>}
                  {selectedTool.id === 'extract-pdf' && <div className="options-panel single-option"><label>شماره صفحات (مثال: 1-3,5)<input value={pageRange} onChange={e => setPageRange(e.target.value)} placeholder="1-3,5" /></label></div>}
                  {selectedTool.id === 'rotate-pdf' && <div className="options-panel single-option"><label>میزان چرخش<select value={rotation} onChange={e => setRotation(Number(e.target.value) as typeof rotation)}><option value="90">۹۰ درجه</option><option value="180">۱۸۰ درجه</option><option value="270">۲۷۰ درجه</option></select></label></div>}
                  {selectedTool.id === 'video-compress' && <div className="options-panel"><label>کیفیت (CRF: کمتر = بهتر)<select value={videoQuality} onChange={e => setVideoQuality(Number(e.target.value))}><option value="20">بالاتر</option><option value="24">زیاد</option><option value="28">متعادل</option><option value="32">کم‌حجم‌تر</option><option value="35">حداکثر فشرده‌سازی</option></select></label><label>حداکثر عرض<select value={videoWidth} onChange={e => setVideoWidth(Number(e.target.value))}><option value="1280">1280 px</option><option value="1920">1920 px</option><option value="2560">2560 px</option><option value="3840">3840 px</option></select></label></div>}
                  {selectedTool.id === 'video-compress' && videoProgress > 0 && <div className="video-progress"><div><span>پیشرفت تقریبی</span><b>{videoProgress}%</b></div><span className="progress-track"><i style={{ width: videoProgress + '%' }} /></span></div>}
                  {message && <div role="status" className={messageError ? 'result-message error' : 'result-message'}>{messageError ? <X size={16} /> : <Check size={16} />}{message}</div>}
                  <button className="primary-button run-button" disabled={!files.length || busy} onClick={runTool}>{busy ? <><span className="spinner" /> {isEnglish ? 'Processing...' : 'در حال پردازش...'}</> : <>{isEnglish ? 'Process files' : 'پردازش فایل'} <ArrowLeft size={17} /></>}</button>
                  <p className="local-note"><LockKeyhole size={14} /> {isEnglish ? 'Files are processed locally in your browser.' : 'فایل‌ها داخل مرورگر پردازش می‌شوند و به سرور آپلود نمی‌شوند.'}</p>{selectedTool.id === 'video-compress' && <p className="video-note">{isEnglish ? 'The first run downloads about 30 MB of FFmpeg core. Processing depends on device memory and CPU.' : 'موتور ویدئو در اولین اجرا حدود ۳۰ مگابایت از CDN دریافت می‌کند؛ اجرای آن به حافظه و توان دستگاه وابسته است.'}</p>}
                </div>
              ) : (
                <>
                  <div className="tools-grid">{filteredTools.map(tool => { const Icon = tool.icon; return <button key={tool.id} className={tool.status === 'soon' ? 'tool-card disabled' : 'tool-card'} onClick={() => chooseTool(tool)}><div className="tool-card-top"><span className={'tool-icon ' + tool.category}><Icon size={20} /></span>{tool.status === 'ready' ? <span className="ready-label"><span /> {isEnglish ? 'Available' : 'فعال'}</span> : <span className="soon-label">{isEnglish ? 'Coming soon' : 'به‌زودی'}</span>}</div><h3>{isEnglish ? tool.titleEn : tool.title}</h3><p>{isEnglish ? tool.descriptionEn : tool.description}</p><div className="tool-card-bottom"><small>{tool.formats}</small>{tool.status === 'ready' && <ArrowLeft size={16} />}</div></button> })}</div>
                  {filteredTools.length === 0 && <div className="empty-state"><Search size={25} /><b>{isEnglish ? 'No tools found' : 'ابزاری پیدا نشد'}</b><span>{isEnglish ? 'Try another keyword.' : 'عبارت دیگری را جست‌وجو کن.'}</span></div>}
                </>
              )}
            </div>
          </div>
        </section>
        <section className="how-section" id="how"><div className="section-kicker">{isEnglish ? 'SIMPLE BY DESIGN' : 'ساده از ابتدا'}</div><h2>{isEnglish ? 'Three steps. No friction.' : 'سه قدم؛ بدون پیچیدگی.'}</h2><div className="steps"><div><span>01</span><UploadCloud size={22} /><b>{isEnglish ? 'Choose your files' : 'فایل را انتخاب کن'}</b><p>{isEnglish ? 'Select one or more files from your device.' : 'یک یا چند فایل را از دستگاهت انتخاب کن.'}</p></div><div><span>02</span><Sparkles size={22} /><b>{isEnglish ? 'Run your tool' : 'ابزار را اجرا کن'}</b><p>{isEnglish ? 'Choose settings and process your files.' : 'تنظیمات را مشخص کن و پردازش را انجام بده.'}</p></div><div><span>03</span><ArrowDownToLine size={22} /><b>{isEnglish ? 'Download the result' : 'خروجی را دریافت کن'}</b><p>{isEnglish ? 'Your processed file is ready to save.' : 'فایل پردازش‌شده آماده ذخیره است.'}</p></div></div></section>
        <section className="privacy-section" id="privacy"><div className="privacy-icon"><ShieldCheck size={26} /></div><div><div className="section-kicker">{isEnglish ? 'PRIVACY FIRST' : 'حریم خصوصی در اولویت'}</div><h2>{isEnglish ? 'Your files stay on your device.' : 'فایل‌هایت روی دستگاه خودت می‌مانند.'}</h2><p>{isEnglish ? 'Available tools run locally in your browser. No account or upload is needed.' : 'ابزارهای فعال مستقیماً در مرورگر اجرا می‌شوند. برای این عملیات‌ها نیازی به حساب کاربری یا آپلود فایل نیست.'}</p></div><div className="privacy-points"><span><Check size={15} /> {isEnglish ? 'Local processing' : 'پردازش محلی'}</span><span><Check size={15} /> {isEnglish ? 'No forced upload' : 'بدون آپلود اجباری'}</span><span><Check size={15} /> {isEnglish ? 'No account required' : 'بدون نیاز به حساب'}</span></div></section>
      </main>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Layers3 size={19} /></span><span>File<span className="brand-light">Lab</span></span></a><span>{isEnglish ? 'Built for the files that move your work forward.' : 'برای فایل‌هایی که کارهایت را جلو می‌برند.'}</span><small>© 2026 FILELAB</small></footer>
    </div>
  )
}
export default App