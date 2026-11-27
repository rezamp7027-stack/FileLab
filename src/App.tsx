import { useMemo, useRef, useState } from 'react'
import {
  Archive, ArrowDownToLine, ArrowLeft, ArrowRight, Check, FileImage, FileSpreadsheet,
  FileText, Film, FolderOpen, Globe2, Layers3, LockKeyhole, Menu, Search, ShieldCheck,
  Sparkles, UploadCloud, X, Zap,
} from 'lucide-react'
import { downloadBlob, extractZip, mergePdfs, processImage } from './lib/processors'

type Category = 'all' | 'pdf' | 'document' | 'spreadsheet' | 'image' | 'video' | 'archive'
type Tool = { id: string; category: Exclude<Category, 'all'>; title: string; description: string; status: 'ready' | 'soon'; icon: typeof FileText; formats: string }
const tools: Tool[] = [
  { id: 'merge-pdf', category: 'pdf', title: 'ادغام PDF', description: 'چند فایل PDF را در یک سند ترکیب کن.', status: 'ready', icon: Layers3, formats: 'PDF' },
  { id: 'image-compress', category: 'image', title: 'فشرده‌سازی تصویر', description: 'حجم تصویر را کم کن و فرمت خروجی را انتخاب کن.', status: 'ready', icon: FileImage, formats: 'JPG · PNG · WEBP' },
  { id: 'zip-extract', category: 'archive', title: 'استخراج ZIP', description: 'محتوای آرشیو را استخراج و دوباره بسته‌بندی کن.', status: 'ready', icon: Archive, formats: 'ZIP' },
  { id: 'split-pdf', category: 'pdf', title: 'تقسیم PDF', description: 'صفحات دلخواه را به فایل جدا تبدیل کن.', status: 'soon', icon: FileText, formats: 'PDF' },
  { id: 'pdf-to-word', category: 'pdf', title: 'PDF به Word', description: 'محتوای PDF را به سند قابل ویرایش تبدیل کن.', status: 'soon', icon: FileText, formats: 'PDF · DOCX' },
  { id: 'word-pdf', category: 'document', title: 'Word به PDF', description: 'سند Word را برای اشتراک‌گذاری آماده کن.', status: 'soon', icon: FileText, formats: 'DOCX · PDF' },
  { id: 'excel-csv', category: 'spreadsheet', title: 'Excel به CSV', description: 'برگه‌های اکسل را به داده CSV تبدیل کن.', status: 'soon', icon: FileSpreadsheet, formats: 'XLSX · CSV' },
  { id: 'image-convert', category: 'image', title: 'تبدیل فرمت تصویر', description: 'تصویر را به JPG، PNG یا WEBP تبدیل کن.', status: 'ready', icon: FileImage, formats: 'JPG · PNG · WEBP' },
  { id: 'video-compress', category: 'video', title: 'فشرده‌سازی ویدئو', description: 'حجم ویدئو را با کنترل کیفیت کاهش بده.', status: 'soon', icon: Film, formats: 'MP4 · MOV · WEBM' },
  { id: 'zip-create', category: 'archive', title: 'ساخت ZIP', description: 'چند فایل را در یک آرشیو ZIP قرار بده.', status: 'soon', icon: Archive, formats: 'ZIP' },
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
const accepts: Record<string, string> = {
  'merge-pdf': '.pdf',
  'image-compress': 'image/*',
  'image-convert': 'image/*',
  'zip-extract': '.zip,application/zip',
}

function App() {
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState<'fa' | 'en'>('fa')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp')
  const [quality, setQuality] = useState(78)
  const [maxWidth, setMaxWidth] = useState(2400)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredTools = useMemo(() => tools.filter(tool =>
    (category === 'all' || tool.category === category) &&
    (tool.title.toLowerCase().includes(search.toLowerCase()) || tool.description.toLowerCase().includes(search.toLowerCase()) || tool.formats.toLowerCase().includes(search.toLowerCase())),
  ), [category, search])

  const chooseTool = (tool: Tool) => {
    if (tool.status !== 'ready') return
    setSelectedTool(tool)
    setFiles([])
    setMessage('')
  }

  const handleFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    if (!list.length) return
    if (selectedTool?.id === 'merge-pdf' && list.some(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
      setMessage('برای این ابزار فقط فایل PDF انتخاب کن.')
      return
    }
    if (selectedTool?.category === 'image' && list.some(file => !file.type.startsWith('image/'))) {
      setMessage('فقط فایل تصویری انتخاب کن.')
      return
    }
    if (selectedTool?.id === 'zip-extract' && list.length > 1) {
      setMessage('برای استخراج، هر بار یک فایل ZIP انتخاب کن.')
      return
    }
    setFiles(list)
    setMessage('')
  }

  const runTool = async () => {
    if (!selectedTool || files.length === 0) return
    setBusy(true)
    setMessage('')
    try {
      if (selectedTool.id === 'merge-pdf') {
        const result = await mergePdfs(files)
        downloadBlob(result, 'filelab-merged.pdf', 'application/pdf')
        setMessage('فایل PDF ادغام شد و دانلود آن آغاز شد.')
      } else if (selectedTool.id === 'image-compress' || selectedTool.id === 'image-convert') {
        const file = files[0]
        const blob = await processImage(file, { format, quality: quality / 100, maxWidth })
        const extension = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'
        const name = file.name.replace(/\.[^.]+$/, '') + '-filelab.' + extension
        downloadBlob(blob, name)
        const saved = Math.max(0, Math.round((1 - blob.size / file.size) * 100))
        setMessage('خروجی آماده شد. تغییر حجم: ' + saved + '%')
      } else if (selectedTool.id === 'zip-extract') {
        const result = extractZip(new Uint8Array(await files[0].arrayBuffer()))
        downloadBlob(result, files[0].name.replace(/\.zip$/i, '') + '-extracted.zip', 'application/zip')
        setMessage('محتوای آرشیو استخراج و در یک ZIP جدید بسته‌بندی شد.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'پردازش فایل ناموفق بود.')
    } finally {
      setBusy(false)
    }
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
              <div><strong>100%</strong><span>{isEnglish ? 'In-browser tools' : 'پردازش محلی ابزارهای فعال'}</span></div><i />
              <div><strong>0</strong><span>{isEnglish ? 'Uploads required' : 'آپلود اجباری'}</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="file-stack">
              <div className="stack-top"><div className="mini-brand"><span /> FILELAB / WORKSPACE</div><span className="live-dot">LIVE</span></div>
              <div className="stack-title">{isEnglish ? 'What are we working on?' : 'امروز روی چه فایلی کار می‌کنی؟'}</div>
              <div className="stack-files">
                <div className="stack-file"><span className="file-type pdf">PDF</span><div><b>Project-brief.pdf</b><small>2.4 MB · 12 pages</small></div><Check size={16} /></div>
                <div className="stack-file"><span className="file-type img">IMG</span><div><b>Product-shot.webp</b><small>840 KB · 2400 × 1600</small></div><Check size={16} /></div>
                <div className="stack-file"><span className="file-type zip">ZIP</span><div><b>Assets-bundle.zip</b><small>18.2 MB · 24 files</small></div><ArrowDownToLine size={16} /></div>
              </div>
              <div className="stack-progress"><div><span>{isEnglish ? 'Workspace ready' : 'فضای کار آماده است'}</span><b>03 / 03</b></div><span className="progress-track"><i /></span></div>
            </div>
            <div className="floating-chip chip-secure"><ShieldCheck size={15} /> {isEnglish ? 'Your files stay yours' : 'فایل‌ها نزد خودت می‌مانند'}</div>
            <div className="floating-chip chip-fast"><Zap size={15} /> {isEnglish ? 'Fast processing' : 'پردازش سریع'}</div>
          </div>
        </section>

        <section className="tool-section" id="tools">
          <div className="section-heading">
            <div><div className="section-kicker">{isEnglish ? 'THE TOOLBOX' : 'جعبه ابزار'}</div><h2>{isEnglish ? 'What do you need to do?' : 'چه کاری می‌خواهی انجام بدهی؟'}</h2><p>{isEnglish ? 'Pick a category or search for a specific task.' : 'یک دسته را انتخاب کن یا مستقیم دنبال ابزار موردنظرت بگرد.'}</p></div>
            <div className="search-box"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={isEnglish ? 'Search tools...' : 'جست‌وجوی ابزار...'} /><kbd>⌘ K</kbd></div>
          </div>
          <div className="tool-layout">
            <aside className="category-list">
              <span className="category-caption">{isEnglish ? 'CATEGORIES' : 'دسته‌بندی‌ها'}</span>
              {categories.map(item => { const Icon = item.icon; return <button key={item.id} className={category === item.id ? 'category active' : 'category'} onClick={() => setCategory(item.id)}><Icon size={17} /><span>{isEnglish ? item.en : item.label}</span><small>{item.id === 'all' ? tools.length : tools.filter(tool => tool.category === item.id).length}</small></button> })}
              <div className="sidebar-note"><Sparkles size={16} /><b>{isEnglish ? 'More tools are coming' : 'ابزارهای بیشتری در راه‌اند'}</b><p>{isEnglish ? 'We are adding new workflows step by step.' : 'قابلیت‌های جدید به‌مرور به FileLab اضافه می‌شوند.'}</p></div>
            </aside>
            <div className="tools-content">
              {selectedTool ? (
                <div className="workspace">
                  <button className="back-link" onClick={() => { setSelectedTool(null); setFiles([]); setMessage('') }}><ArrowRight size={16} /> {isEnglish ? 'Back to tools' : 'بازگشت به ابزارها'}</button>
                  <div className="workspace-title">{(() => { const Icon = selectedTool.icon; return <span className="workspace-icon"><Icon size={22} /></span> })()}<div><h3>{selectedTool.title}</h3><p>{selectedTool.description}</p></div></div>
                  <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }} onClick={() => inputRef.current?.click()}>
                    <input ref={inputRef} type="file" hidden multiple={selectedTool.id === 'merge-pdf'} accept={accepts[selectedTool.id] || '*/*'} onChange={e => handleFiles(e.target.files || [])} />
                    <span className="upload-icon"><UploadCloud size={25} /></span><b>{isEnglish ? 'Drop files here or browse' : 'فایل‌ها را اینجا رها کن یا انتخاب کن'}</b>
                    <small>{selectedTool.id === 'merge-pdf' ? 'PDF · حداقل ۲ فایل' : selectedTool.id === 'zip-extract' ? 'ZIP · یک فایل' : 'JPG · PNG · WEBP'}</small>
                    <button className="browse-button" type="button" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}><FolderOpen size={15} /> {isEnglish ? 'Choose files' : 'انتخاب فایل'}</button>
                  </div>
                  {files.length > 0 && <div className="selected-files"><div className="selected-head"><b>{isEnglish ? 'Selected files' : 'فایل‌های انتخاب‌شده'}</b><button onClick={() => setFiles([])}><X size={14} /> {isEnglish ? 'Clear' : 'پاک‌کردن'}</button></div>{files.map((file, index) => <div className="selected-file" key={file.name + index}><FileText size={17} /><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></div>)}</div>}
                  {selectedTool.category === 'image' && <div className="options-panel"><label>{isEnglish ? 'Output format' : 'فرمت خروجی'}<select value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></label><label>{isEnglish ? 'Quality' : 'کیفیت'} <b>{quality}%</b><input type="range" min="30" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} /></label><label>{isEnglish ? 'Max width' : 'حداکثر عرض'}<select value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))}><option value="1200">1200 px</option><option value="1920">1920 px</option><option value="2400">2400 px</option><option value="4000">4000 px</option></select></label></div>}
                  {message && <div className={message.includes('ناموفق') || message.includes('فقط') || message.includes('حداقل') ? 'result-message error' : 'result-message'}><Check size={16} />{message}</div>}
                  <button className="primary-button run-button" disabled={!files.length || busy} onClick={runTool}>{busy ? <><span className="spinner" /> {isEnglish ? 'Processing...' : 'در حال پردازش...'}</> : <>{isEnglish ? 'Process files' : 'پردازش فایل'} <ArrowLeft size={17} /></>}</button>
                  <p className="local-note"><LockKeyhole size={14} /> {isEnglish ? 'Files are processed in your browser and are not uploaded.' : 'فایل‌ها داخل مرورگر پردازش می‌شوند و به سرور آپلود نمی‌شوند.'}</p>
                </div>
              ) : (
                <>
                  <div className="tools-grid">{filteredTools.map(tool => { const Icon = tool.icon; return <button key={tool.id} className={tool.status === 'soon' ? 'tool-card disabled' : 'tool-card'} onClick={() => chooseTool(tool)}><div className="tool-card-top"><span className={'tool-icon ' + tool.category}><Icon size={20} /></span>{tool.status === 'ready' ? <span className="ready-label"><span /> {isEnglish ? 'Available' : 'فعال'}</span> : <span className="soon-label">{isEnglish ? 'Coming soon' : 'به‌زودی'}</span>}</div><h3>{tool.title}</h3><p>{tool.description}</p><div className="tool-card-bottom"><small>{tool.formats}</small>{tool.status === 'ready' && <ArrowLeft size={16} />}</div></button> })}</div>
                  {filteredTools.length === 0 && <div className="empty-state"><Search size={25} /><b>{isEnglish ? 'No tools found' : 'ابزاری پیدا نشد'}</b><span>{isEnglish ? 'Try another keyword.' : 'عبارت دیگری را جست‌وجو کن.'}</span></div>}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="how-section" id="how"><div className="section-kicker">{isEnglish ? 'SIMPLE BY DESIGN' : 'ساده از ابتدا'}</div><h2>{isEnglish ? 'Three steps. No friction.' : 'سه قدم؛ بدون پیچیدگی.'}</h2><div className="steps"><div><span>01</span><UploadCloud size={22} /><b>{isEnglish ? 'Choose your files' : 'فایل را انتخاب کن'}</b><p>{isEnglish ? 'Select one or more files from your device.' : 'یک یا چند فایل را از دستگاهت انتخاب کن.'}</p></div><div><span>02</span><Sparkles size={22} /><b>{isEnglish ? 'Run your tool' : 'ابزار را اجرا کن'}</b><p>{isEnglish ? 'Choose settings and process your files.' : 'تنظیمات را مشخص کن و پردازش را انجام بده.'}</p></div><div><span>03</span><ArrowDownToLine size={22} /><b>{isEnglish ? 'Download the result' : 'خروجی را دریافت کن'}</b><p>{isEnglish ? 'Your processed file is ready to save.' : 'فایل پردازش‌شده آماده ذخیره است.'}</p></div></div></section>

        <section className="privacy-section" id="privacy"><div className="privacy-icon"><ShieldCheck size={26} /></div><div><div className="section-kicker">{isEnglish ? 'PRIVACY FIRST' : 'حریم خصوصی در اولویت'}</div><h2>{isEnglish ? 'Your files stay on your device.' : 'فایل‌هایت روی دستگاه خودت می‌مانند.'}</h2><p>{isEnglish ? 'Available tools run locally in your browser. No account or upload is needed for these operations.' : 'ابزارهای فعال مستقیماً در مرورگر اجرا می‌شوند. برای این عملیات‌ها نیازی به حساب کاربری یا آپلود فایل نیست.'}</p></div><div className="privacy-points"><span><Check size={15} /> {isEnglish ? 'Local processing' : 'پردازش محلی'}</span><span><Check size={15} /> {isEnglish ? 'No forced upload' : 'بدون آپلود اجباری'}</span><span><Check size={15} /> {isEnglish ? 'No account required' : 'بدون نیاز به حساب'}</span></div></section>
      </main>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Layers3 size={19} /></span><span>File<span className="brand-light">Lab</span></span></a><span>{isEnglish ? 'Built for the files that move your work forward.' : 'برای فایل‌هایی که کارهایت را جلو می‌برند.'}</span><small>© 2026 FILELAB</small></footer>
    </div>
  )
}
export default App
