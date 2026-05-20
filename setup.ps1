# ===========================================
# Shirt Catalog - Auto Setup Script
# วางไฟล์ไว้ใน shirt-catalog แล้วรันได้เลย
# ===========================================

Write-Host "Setting up Export page..." -ForegroundColor Cyan

# 1. Create export directory
New-Item -ItemType Directory -Force -Path "app\export" | Out-Null

# 2. Remove stray nested folder
if (Test-Path "app\export\app") {
    Remove-Item -Recurse -Force "app\export\app"
    Write-Host "Removed stray folder" -ForegroundColor Yellow
}

# 3. Write export/page.tsx
$exportPage = @'
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Shirt } from '@/lib/supabase'

const ADMIN_ACCOUNTS: Record<string, string> = {
  'ceo edit00': '00000000', 'ceo edit01': '00001111', 'ceo edit02': '00002222',
  'ceo edit03': '00003333', 'ceo edit04': '00004444', 'ceo edit05': '00005555',
  'ceo edit06': '00006666', 'ceo edit07': '00007777', 'ceo edit08': '00008888',
  'ceo edit09': '00009999',
}

const TABS = [
  { id: 'new',       label: 'แบบเสื้อใหม่',     badge: 'New',  isPromo: false },
  { id: 'collar',    label: 'คอเสื้อทั้งหมด',   badge: '',     isPromo: false },
  { id: 'promotion', label: 'โปรโมชั่น',          badge: '',     isPromo: true  },
  { id: 'other',     label: 'แบบเสื้ออื่นๆ',    badge: '',     isPromo: false },
  { id: 'fabric',    label: 'เนื้อผ้า',           badge: '',     isPromo: false },
  { id: 'photo',     label: 'ภาพถ่ายงานจริง',   badge: '',     isPromo: false },
  { id: 'all',       label: 'สินค้าทั้งหมด',     badge: '',     isPromo: false },
]

const LAYOUTS = [
  { id: 'auto', label: 'Auto' },
  { id: '2col', label: '2 คอลัมน์' },
  { id: '3col', label: '3 คอลัมน์' },
  { id: '4col', label: '4 คอลัมน์' },
]

const SIZES = [
  { id: '9:16', label: '9:16 Stories', w: 1080, h: 1920, icon: '📱' },
  { id: '1:1',  label: '1:1 Square',   w: 1080, h: 1080, icon: '⬜' },
  { id: '16:9', label: '16:9 Wide',    w: 1920, h: 1080, icon: '🖥' },
  { id: '4:5',  label: '4:5 Portrait', w: 1080, h: 1350, icon: '📷' },
]

export default function ExportPage() {
  const [adminUser, setAdminUser] = useState<string | null>(null)
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginErr, setLoginErr] = useState('')

  // Auto-login from URL param passed by catalog page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const adminParam = params.get('admin')
    if (adminParam && ADMIN_ACCOUNTS[adminParam] !== undefined) {
      setAdminUser(adminParam)
    }
  }, [])

  const [tab, setTab] = useState('collar')
  const [shirts, setShirts] = useState<Shirt[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')

  const [title, setTitle] = useState('คอเสื้อและสินค้าทั้งหมด')
  const [subtitle, setSubtitle] = useState('Collar and All Product.')
  const [brandText, setBrandText] = useState('FB : เสื้อกีฬาพิมพ์ลาย EVO SPORT ขอนแก่น')
  const [accentColor, setAccentColor] = useState('#cc0000')
  const [bgColor, setBgColor] = useState('#0a0a0a')
  const [layoutMode, setLayoutMode] = useState('auto')
  const [sizeId, setSizeId] = useState('9:16')
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [showNumbers, setShowNumbers] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [showName, setShowName] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const currentSize = SIZES.find(s => s.id === sizeId)!

  // Load shirts
  useEffect(() => {
    if (!adminUser) return
    setLoading(true)
    setSelected(new Set())
    const currentTab = TABS.find(t => t.id === tab)
    const query = currentTab?.isPromo
      ? supabase.from('shirts').select('*').eq('is_promo', true)
      : tab === 'all'
        ? supabase.from('shirts').select('*')
        : supabase.from('shirts').select('*').eq('category', tab)
    query.order('sort_order').order('created_at', { ascending: false }).then(({ data }) => {
      setShirts(data || [])
      setLoading(false)
    })
  }, [tab, adminUser])

  // Auto title
  useEffect(() => {
    const t = TABS.find(t => t.id === tab)
    if (t) setTitle(t.label)
  }, [tab])

  const getCols = useCallback((count: number) => {
    if (layoutMode === '2col') return 2
    if (layoutMode === '3col') return 3
    if (layoutMode === '4col') return 4
    if (count <= 2) return 2
    if (count <= 6) return 3
    return 4
  }, [layoutMode])

  const toggle = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const loadImg = useCallback((url: string | null): Promise<HTMLImageElement | null> =>
    new Promise(resolve => {
      if (!url) { resolve(null); return }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    }), [])

  const doExport = useCallback(async () => {
    const items = shirts.filter(s => selected.has(s.id))
    if (!items.length || !canvasRef.current) return
    setExporting(true)
    setProgress('กำลังโหลดรูปภาพ...')

    const { w: CW, h: CH } = currentSize
    const canvas = canvasRef.current
    canvas.width = CW; canvas.height = CH
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, CW, CH)

    const imgs = await Promise.all(items.map((s, i) => {
      setProgress(`โหลดรูป ${i + 1}/${items.length}...`)
      return loadImg(s.image_url)
    }))
    const logoImg = logoSrc ? await loadImg(logoSrc) : null

    setProgress('กำลังวาดภาพ...')

    const isLandscape = CW > CH
    const headerH = Math.round(CH * (isLandscape ? 0.14 : 0.1))
    const footerH = Math.round(CH * 0.06)
    const pad = Math.round(CW * 0.025)
    const barW = Math.round(CW * 0.007)

    // Header
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, CW, headerH)
    ctx.fillStyle = accentColor
    ctx.fillRect(0, 0, CW, Math.round(CH * 0.004))
    ctx.fillRect(0, 0, barW, headerH)
    ctx.fillRect(CW - barW, 0, barW, headerH)

    // Logo in header
    const logoSize = headerH * 0.7
    if (logoImg) {
      const lx = pad + barW + 10, ly = (headerH - logoSize) / 2
      ctx.save()
      ctx.beginPath()
      ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logoImg, lx, ly, logoSize, logoSize)
      ctx.restore()
    }

    const titleX = logoImg ? pad + barW + logoSize + 20 : CW / 2
    ctx.textAlign = logoImg ? 'left' : 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 ${Math.round(headerH * 0.38)}px 'Noto Sans Thai', sans-serif`
    ctx.fillText(title, titleX, headerH * 0.52)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = `400 ${Math.round(headerH * 0.22)}px 'Noto Sans Thai', sans-serif`
    ctx.fillText(subtitle, titleX, headerH * 0.82)

    // Grid
    const cols = getCols(items.length)
    const rows = Math.ceil(items.length / cols)
    const gapX = Math.round(CW * 0.014), gapY = Math.round(CH * 0.012)
    const gridTop = headerH + gapY, gridBottom = CH - footerH - gapY
    const cardW = (CW - pad * 2 - gapX * (cols - 1)) / cols
    const cardH = Math.min((gridBottom - gridTop - gapY * (rows - 1)) / rows, cardW * 1.5)
    const imgFrac = (showName || showPrice) ? 0.64 : 1
    const imgH = cardH * imgFrac, labelH = cardH - imgH

    items.forEach((shirt, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = pad + col * (cardW + gapX)
      const y = gridTop + row * (cardH + gapY)

      ctx.fillStyle = '#1a1a1a'
      rr(ctx, x, y, cardW, cardH, 14); ctx.fill()
      ctx.strokeStyle = accentColor
      ctx.lineWidth = Math.round(CW * 0.0022)
      rr(ctx, x, y, cardW, cardH, 14); ctx.stroke()

      const img = imgs[i]
      ctx.save()
      rr(ctx, x, y, cardW, imgH, 14); ctx.clip()
      if (img) {
        const sc = Math.max(cardW / img.naturalWidth, imgH / img.naturalHeight)
        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc
        ctx.drawImage(img, x + (cardW - dw) / 2, y + (imgH - dh) / 2, dw, dh)
      } else {
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y, cardW, imgH)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.font = `${Math.round(imgH * 0.3)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('👕', x + cardW / 2, y + imgH / 2 + imgH * 0.08)
      }
      ctx.restore()

      if (showNumbers) {
        const bR = Math.round(cardW * 0.11)
        const bx = x + bR + Math.round(cardW * 0.06), by = y + bR + Math.round(cardH * 0.03)
        ctx.fillStyle = accentColor
        ctx.beginPath(); ctx.arc(bx, by, bR, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `700 ${Math.round(bR * 0.95)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${i + 1}`, bx, by + Math.round(bR * 0.36))
      }

      if (showName || showPrice) {
        const ly = y + imgH
        ctx.fillStyle = '#111111'
        rrBottom(ctx, x, ly, cardW, labelH, 14); ctx.fill()
        ctx.textAlign = 'center'
        if (showPrice && shirt.price) {
          ctx.fillStyle = '#ffffff'
          ctx.font = `700 ${Math.round(labelH * 0.38)}px 'Noto Sans Thai', sans-serif`
          ctx.fillText(`${Number(shirt.price).toLocaleString()} .-`, x + cardW / 2, ly + labelH * 0.52)
        }
        if (showName && shirt.name) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.font = `400 ${Math.round(labelH * 0.24)}px 'Noto Sans Thai', sans-serif`
          const nm = shirt.name.length > 16 ? shirt.name.slice(0, 15) + '…' : shirt.name
          ctx.fillText(nm, x + cardW / 2, ly + labelH * 0.88)
        }
      }
    })

    // Footer
    ctx.fillStyle = '#111111'; ctx.fillRect(0, CH - footerH, CW, footerH)
    ctx.fillStyle = accentColor; ctx.fillRect(0, CH - footerH, CW, Math.round(CH * 0.003))
    if (logoImg) {
      const lh = footerH * 0.65
      ctx.save()
      ctx.beginPath()
      ctx.arc(pad + barW + lh / 2, CH - footerH / 2, lh / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logoImg, pad + barW, CH - footerH / 2 - lh / 2, lh, lh)
      ctx.restore()
    }
    ctx.fillStyle = '#ffffff'
    ctx.font = `500 ${Math.round(footerH * 0.38)}px 'Noto Sans Thai', sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(brandText, CW / 2, CH - footerH / 2 + Math.round(footerH * 0.14))

    setProgress('กำลังบันทึกไฟล์...')
    const link = document.createElement('a')
    link.download = `export-${tab}-${sizeId.replace(':', 'x')}-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.93)
    link.click()
    setExporting(false); setProgress('')
  }, [shirts, selected, title, subtitle, brandText, accentColor, bgColor, layoutMode, sizeId, logoSrc, showNumbers, showPrice, showName, currentSize, loadImg, getCols, tab])

  // Login gate
  if (!adminUser) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Sans Thai','Sarabun',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0} .inp{background:#1a1a1a;border:1px solid rgba(255,255,255,0.13);color:#f5f5f5;padding:10px 12px;border-radius:5px;font-family:inherit;font-size:14px;width:100%;display:block;margin-bottom:12px} .inp:focus{outline:none;border-color:#c00}`}</style>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', margin: '0 auto 14px' }}>S</div>
          <div style={{ display: 'inline-block', background: '#c00', fontSize: 9, padding: '2px 10px', borderRadius: 3, fontWeight: 700, letterSpacing: 2, color: '#fff', marginBottom: 10 }}>ADMIN ONLY</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>Export Tool</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>เข้าสู่ระบบ Admin เพื่อใช้งาน</div>
        </div>
        <input className="inp" placeholder="Name ID เช่น ceo edit00" value={loginId} onChange={e => setLoginId(e.target.value)} />
        <input className="inp" type="password" placeholder="Password" value={loginPw} onChange={e => setLoginPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { if (ADMIN_ACCOUNTS[loginId] === loginPw) { setAdminUser(loginId); setLoginErr('') } else setLoginErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') } }} />
        {loginErr && <div style={{ color: '#ff6060', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: 'rgba(200,0,0,0.1)', borderRadius: 5 }}>{loginErr}</div>}
        <button style={{ width: '100%', background: '#c00', color: '#fff', border: 'none', padding: '11px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}
          onClick={() => { if (ADMIN_ACCOUNTS[loginId] === loginPw) { setAdminUser(loginId); setLoginErr('') } else setLoginErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') }}>
          เข้าสู่ระบบ
        </button>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <a href="/catalog" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>← กลับหน้าหลัก</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#c00;border-radius:2px}
        .tab{padding:10px 14px;cursor:pointer;font-size:12px;font-weight:500;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;transition:all .18s;white-space:nowrap}
        .tab:hover{color:#fff}.tab.on{color:#fff;border-bottom-color:#c00}
        .card{background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .2s;position:relative}
        .card:hover{border-color:rgba(200,0,0,0.5);transform:translateY(-2px)}
        .card.sel{border-color:#c00;box-shadow:0 0 0 2px rgba(200,0,0,0.25)}
        .chk{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .18s;z-index:2}
        .card.sel .chk{background:#c00;border-color:#c00}
        .inp{background:#1a1a1a;border:1px solid rgba(255,255,255,0.13);color:#f5f5f5;padding:7px 10px;border-radius:5px;font-family:inherit;font-size:12px;width:100%}
        .inp:focus{outline:none;border-color:#c00}
        .btn-r{background:#c00;color:#fff;border:none;padding:10px 18px;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;transition:background .18s}
        .btn-r:hover{background:#e00}.btn-r:disabled{opacity:.5;cursor:not-allowed}
        .btn-o{background:transparent;color:#f5f5f5;border:1px solid rgba(255,255,255,0.2);padding:6px 12px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .18s}
        .btn-o:hover{border-color:#c00;color:#c00}
        .pill{padding:5px 10px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:500;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);transition:all .18s;background:transparent;font-family:inherit}
        .pill:hover{border-color:#c00;color:#c00}.pill.on{background:#c00;border-color:#c00;color:#fff}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .sl{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px}
        .tog{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.6)}
        input[type=checkbox]{accent-color:#c00;width:14px;height:14px;cursor:pointer}
        @media(max-width:900px){.grid{grid-template-columns:repeat(3,1fr)}.main-layout{grid-template-columns:1fr!important}}
        @media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/catalog" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>← กลับ</a>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>S</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Export Tool</div>
            <span style={{ background: 'linear-gradient(90deg,#c00,#800)', fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: 1, color: '#fff' }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{adminUser}</span>
            <button className="btn-o" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setAdminUser(null)}>ออก</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <div className="main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* LEFT — card grid */}
          <div>
            <div style={{ background: '#111', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14, overflowX: 'auto' }}>
              <div style={{ display: 'flex', minWidth: 'max-content' }}>
                {TABS.map(t => (
                  <div key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                    {t.label}
                    {t.badge && <span style={{ background: '#c00', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700, marginLeft: 5 }}>{t.badge}</span>}
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
                  <button className="btn-o" onClick={() => setSelected(new Set(shirts.map(s => s.id)))} style={{ padding: '3px 10px', fontSize: 10 }}>เลือกทั้งหมด</button>
                  <button className="btn-o" onClick={() => setSelected(new Set())} style={{ padding: '3px 10px', fontSize: 10 }}>ยกเลิก</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              <span>ทั้งหมด <b style={{ color: '#fff' }}>{shirts.length}</b></span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              <span>เลือก <b style={{ color: '#c00' }}>{selected.size}</b></span>
              {selected.size > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{getCols(selected.size)} คอลัมน์ · {Math.ceil(selected.size / getCols(selected.size))} แถว</span>}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>กำลังโหลด...</div>
            ) : shirts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>ไม่มีสินค้าในหมวดนี้</div>
            ) : (
              <div className="grid">
                {shirts.map(s => (
                  <div key={s.id} className={`card${selected.has(s.id) ? ' sel' : ''}`} onClick={() => toggle(s.id)}>
                    <div className="chk">{selected.has(s.id) ? '✓' : ''}</div>
                    <div style={{ aspectRatio: '1', background: '#1a1a1a', overflow: 'hidden' }}>
                      {s.image_url
                        ? <img src={s.image_url} alt={s.name} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'rgba(255,255,255,0.1)' }}>👕</div>
                      }
                    </div>
                    <div style={{ padding: '9px 10px' }}>
                      <div style={{ fontWeight: 600, fontSize: 11, color: '#fff', marginBottom: 2, lineHeight: 1.3 }}>{s.name || 'ไม่มีชื่อ'}</div>
                      {s.collar_type && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>คอ: {s.collar_type}</div>}
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#ff4444' }}>{s.price ? `${Number(s.price).toLocaleString()} THB.-` : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — settings */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '18px 16px', position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 10 }}>⚙ ตั้งค่าภาพ</div>

            <div>
              <div className="sl">ขนาดภาพ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SIZES.map(s => <button key={s.id} className={`pill${sizeId === s.id ? ' on' : ''}`} onClick={() => setSizeId(s.id)}>{s.icon} {s.label}</button>)}
              </div>
            </div>

            <div>
              <div className="sl">Layout คอลัมน์</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                {LAYOUTS.map(l => <button key={l.id} className={`pill${layoutMode === l.id ? ' on' : ''}`} style={{ padding: '4px 4px', fontSize: 10 }} onClick={() => setLayoutMode(l.id)}>{l.label}</button>)}
              </div>
            </div>

            <div><div className="sl">ชื่อหัว</div><input className="inp" value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><div className="sl">ซับไตเติล</div><input className="inp" value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
            <div><div className="sl">ข้อความท้าย</div><input className="inp" value={brandText} onChange={e => setBrandText(e.target.value)} /></div>

            <div>
              <div className="sl">Logo / Watermark</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {logoSrc && <img src={logoSrc} alt="logo" style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />}
                <label style={{ flex: 1, background: '#1a1a1a', border: '1px dashed rgba(200,0,0,0.4)', borderRadius: 5, padding: '7px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', display: 'block' }}>
                  {logoSrc ? 'เปลี่ยน Logo' : '+ อัปโหลด Logo'}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setLogoSrc(ev.target?.result as string); r.readAsDataURL(f) }} />
                </label>
                {logoSrc && <button className="btn-o" style={{ padding: '5px 8px', fontSize: 10 }} onClick={() => setLogoSrc(null)}>ลบ</button>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="sl">สีหลัก</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{accentColor}</span>
                </div>
              </div>
              <div>
                <div className="sl">พื้นหลัง</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{bgColor}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sl" style={{ marginBottom: 0 }}>แสดงในภาพ</div>
              <label className="tog"><input type="checkbox" checked={showNumbers} onChange={e => setShowNumbers(e.target.checked)} /> เลขลำดับ</label>
              <label className="tog"><input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} /> ราคา</label>
              <label className="tog"><input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} /> ชื่อสินค้า</label>
            </div>

            <div style={{ background: 'rgba(200,0,0,0.07)', border: '1px solid rgba(200,0,0,0.2)', borderRadius: 7, padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>ขนาด</span><span style={{ color: '#fff' }}>{currentSize.w} × {currentSize.h} px</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>อัตราส่วน</span><span style={{ color: '#fff' }}>{sizeId}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>เลือก</span><span style={{ color: '#c00', fontWeight: 700 }}>{selected.size} รายการ</span></div>
            </div>

            <button className="btn-r" style={{ width: '100%', padding: '13px', fontSize: 14 }} disabled={selected.size === 0 || exporting} onClick={doExport}>
              {exporting ? `⏳ ${progress}` : `📥 Export JPEG (${selected.size})`}
            </button>
            {selected.size === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>ติ๊กเลือกการ์ดก่อน</div>}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

function rrBottom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y); ctx.closePath()
}

'@
[System.IO.File]::WriteAllText((Resolve-Path "app\export").Path + "\page.tsx", $exportPage, [System.Text.Encoding]::UTF8)
Write-Host "OK app\export\page.tsx" -ForegroundColor Green

# 4. Write catalog/page.tsx
$catalogPage = @'
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase, uploadBase64Image, deleteImage } from '@/lib/supabase'
import type { Shirt, Banner, Collar, ProductType, Customer } from '@/lib/supabase'

const ADMIN_ACCOUNTS: Record<string, string> = {
  'ceo edit00': '00000000', 'ceo edit01': '00001111', 'ceo edit02': '00002222',
  'ceo edit03': '00003333', 'ceo edit04': '00004444', 'ceo edit05': '00005555',
  'ceo edit06': '00006666', 'ceo edit07': '00007777', 'ceo edit08': '00008888',
  'ceo edit09': '00009999',
}

const NAV_ITEMS = [
  { id: 'new', label: 'แบบเสื้อใหม่', badge: 'New' },
  { id: 'collar', label: 'คอเสื้อทั้งหมด' },
  { id: 'promotion', label: 'โปรโมชั่น' },
  { id: 'other', label: 'แบบเสื้ออื่นๆ' },
  { id: 'fabric', label: 'เนื้อผ้า' },
  { id: 'photo', label: 'ภาพถ่ายงานจริง' },
  { id: 'all', label: 'สินค้าทั้งหมด' },
]

type Toast = { msg: string; type: 'ok' | 'err' }
type View = 'front' | 'admin-login' | 'cust-login' | 'register'

export default function CatalogPage() {
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>('front')
  const [adminUser, setAdminUser] = useState<string | null>(null)
  const [custUser, setCustUser] = useState<Customer | null>(null)
  const [activeNav, setActiveNav] = useState('new')

  const [banners, setBanners] = useState<Banner[]>([])
  const [shirts, setShirts] = useState<Shirt[]>([])
  const [collars, setCollars] = useState<Collar[]>([])
  const [prodTypes, setProdTypes] = useState<ProductType[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  const [editShirt, setEditShirt] = useState<Shirt | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCustMgr, setShowCustMgr] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Drag-and-drop state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const saveSortTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  // Load all data from Supabase
  useEffect(() => {
    ;(async () => {
      const [{ data: b }, { data: s }, { data: c }, { data: p }, { data: cu }] =
        await Promise.all([
          supabase.from('banners').select('*').order('sort_order'),
          supabase.from('shirts').select('*').order('sort_order').order('created_at', { ascending: false }),
          supabase.from('collars').select('*').order('sort_order'),
          supabase.from('product_types').select('*').order('sort_order'),
          supabase.from('customers').select('*').order('joined_at', { ascending: false }),
        ])
      if (b) setBanners(b)
      if (s) setShirts(s)
      if (c) setCollars(c)
      if (p) setProdTypes(p)
      if (cu) setCustomers(cu)
      setReady(true)
    })()
  }, [])

  const filtered = shirts.filter((s) => {
    if (activeNav === 'all') return true
    if (activeNav === 'new') return s.category === 'new'
    if (activeNav === 'collar') return s.category === 'collar'
    if (activeNav === 'promotion') return s.is_promo
    if (activeNav === 'other') return s.category === 'other'
    if (activeNav === 'fabric') return s.category === 'fabric'
    if (activeNav === 'photo') return s.category === 'photo'
    return true
  })

  // Drag handlers — only active on "new" tab for admin
  const canDrag = !!adminUser && activeNav === 'new'

  const handleDragStart = (id: string) => {
    setDragId(id)
  }

  const handleDragOver = (id: string) => {
    if (!dragId || dragId === id) return
    setDragOverId(id)
    setShirts((prev) => {
      const arr = [...prev]
      const fromIdx = arr.findIndex((x) => x.id === dragId)
      const toIdx = arr.findIndex((x) => x.id === id)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return arr
    })
  }

  const handleDragEnd = async () => {
    setDragId(null)
    setDragOverId(null)
    // Debounce save to Supabase
    if (saveSortTimer.current) clearTimeout(saveSortTimer.current)
    saveSortTimer.current = setTimeout(async () => {
      const updates = shirts.map((s, i) => ({ id: s.id, sort_order: i }))
      for (const u of updates) {
        await supabase.from('shirts').update({ sort_order: u.sort_order }).eq('id', u.id)
      }
      notify('บันทึกลำดับแล้ว')
    }, 800)
  }


  if (!ready) return <LoadingScreen />
  if (view === 'admin-login') return (
    <AdminLogin onLogin={(u) => { setAdminUser(u); setView('front'); notify(`ยินดีต้อนรับ Admin: ${u}`) }}
      onBack={() => setView('front')} />
  )
  if (view === 'cust-login') return (
    <CustLogin customers={customers} onLogin={(u) => { setCustUser(u); setView('front'); notify(`ยินดีต้อนรับ ${u.name}`) }}
      onBack={() => setView('front')} onReg={() => setView('register')} />
  )
  if (view === 'register') return (
    <Register onSave={async (data) => {
      const { data: newCust, error } = await supabase.from('customers').insert([data]).select().single()
      if (error) { notify('สมัครสมาชิกไม่สำเร็จ: ' + error.message, 'err'); return }
      setCustomers((prev) => [newCust, ...prev])
      setView('cust-login')
      notify('สมัครสมาชิกสำเร็จ')
    }} onBack={() => setView('cust-login')} customers={customers} />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'ok' ? '#0c2210' : '#220c0c', border: `1px solid ${toast.type === 'ok' ? '#266626' : '#c00'}`, color: toast.type === 'ok' ? '#6fdf6f' : '#ff8080', padding: '11px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'ok' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff' }}>S</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>รวมแบบเสื้อและสินค้าทั้งหมด</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 2 }}>SHIRT CATALOG</span>
                <span style={{ fontSize: 9, color: '#3d9a3d', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3d9a3d', display: 'inline-block' }} />
                  Supabase Connected
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {adminUser ? (
              <>
                <span style={{ background: 'linear-gradient(90deg,#c00,#800)', fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: 1, color: '#fff' }}>ADMIN</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{adminUser}</span>
                <button className="btn-outline sm" onClick={() => setShowCustMgr(!showCustMgr)}>{showCustMgr ? '← กลับ' : `สมาชิก (${customers.length})`}</button>
                <button className="btn-outline sm" onClick={() => { setAdminUser(null); setShowCustMgr(false); notify('ออกจากระบบแล้ว', 'err') }}>ออก</button>
              </>
            ) : custUser ? (
              <>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>👤 {custUser.name}</span>
                <button className="btn-outline sm" onClick={() => { setCustUser(null); notify('ออกจากระบบแล้ว', 'err') }}>ออก</button>
              </>
            ) : (
              <>
                <button className="btn-outline sm" onClick={() => setView('cust-login')}>เข้าสู่ระบบ</button>
                <button className="btn-red sm" onClick={() => setView('admin-login')}>Admin</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner */}
      {!showCustMgr && (
        <BannerSection banners={banners} setBanners={setBanners} isAdmin={!!adminUser} notify={notify} />
      )}

      {/* Customer Manager */}
      {showCustMgr && adminUser && (
        <CustomerMgr customers={customers} setCustomers={setCustomers} notify={notify} />
      )}

      {!showCustMgr && (
        <>
          {/* Nav */}
          <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 100, overflowX: 'auto' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', padding: '0 16px' }}>
              {NAV_ITEMS.map((n) => (
                <div key={n.id} className={`nav-item${activeNav === n.id ? ' active' : ''}`} onClick={() => setActiveNav(n.id)}>
                  {n.label}
                  {n.badge && <span style={{ display: 'inline-block', background: '#c00', color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' }}>{n.badge}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Admin Toolbar */}
          {adminUser && (
            <div style={{ background: 'rgba(200,0,0,0.07)', borderBottom: '1px solid rgba(200,0,0,0.18)', padding: '9px 20px' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#ff6060', fontWeight: 700 }}>⚙ Admin Mode — บันทึกสู่ Supabase อัตโนมัติ</span>
                <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มแบบเสื้อ</button>
                <button className="btn-outline sm" onClick={() => setShowSettings(true)}>จัดการประเภท</button>
                <a href={`/export?admin=${encodeURIComponent(adminUser || '')}`} style={{ background: 'transparent', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: 5, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .18s' }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor='#c00'; (e.currentTarget as HTMLAnchorElement).style.color='#c00' }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor='rgba(255,255,255,0.22)'; (e.currentTarget as HTMLAnchorElement).style.color='#f5f5f5' }}>
                  📥 Export ภาพ
                </a>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginLeft: 'auto' }}>
                  ทั้งหมด {shirts.length} | แสดง {filtered.length} รายการ
                </span>
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
            {canDrag && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>☰</span> กดค้างที่การ์ดแล้วลากเพื่อเรียงลำดับ — บันทึกอัตโนมัติ
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px' }}>
                <div style={{ fontSize: 50, marginBottom: 16, opacity: .2 }}>👕</div>
                <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 14, marginBottom: adminUser ? 18 : 0 }}>ยังไม่มีสินค้าในหมวดนี้</div>
                {adminUser && <button className="btn-red" style={{ padding: '10px 30px' }} onClick={() => setShowAdd(true)}>+ เพิ่มแบบเสื้อแรก</button>}
              </div>
            ) : (
              <div className="grid-shirts">
                {filtered.map((s) => (
                  <ShirtCard key={s.id} shirt={s} isAdmin={!!adminUser}
                    isDragging={dragId === s.id}
                    isDragOver={dragOverId === s.id}
                    canDrag={canDrag}
                    onDragStart={() => handleDragStart(s.id)}
                    onDragOver={() => handleDragOver(s.id)}
                    onDragEnd={handleDragEnd}
                    onEdit={() => setEditShirt(s)}
                    onDelete={async () => {
                      if (s.image_url) await deleteImage(s.image_url)
                      await supabase.from('shirts').delete().eq('id', s.id)
                      setShirts((prev) => prev.filter((x) => x.id !== s.id))
                      notify('ลบสินค้าแล้ว', 'err')
                    }}
                    onDupe={async () => {
                      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s
                      const { data } = await supabase.from('shirts').insert([{ ...rest, name: s.name + ' (สำเนา)' }]).select().single()
                      if (data) { setShirts((prev) => [data, ...prev]); notify('คัดลอกสำเร็จ') }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.13)' }}>
        Shirt Catalog © 2025 — Powered by Supabase + Vercel
      </div>

      {/* Modals */}
      {showAdd && (
        <ShirtModal collars={collars} prodTypes={prodTypes}
          category={['all', 'promotion'].includes(activeNav) ? 'new' : activeNav}
          onSave={async (data, imgFile) => {
            let image_url = null
            if (imgFile) image_url = await uploadBase64Image(imgFile)
            const { data: newShirt } = await supabase.from('shirts').insert([{ ...data, image_url }]).select().single()
            if (newShirt) { setShirts((prev) => [newShirt, ...prev]); setShowAdd(false); notify('เพิ่มแบบเสื้อแล้ว — บันทึกสู่ Supabase') }
          }}
          onClose={() => setShowAdd(false)} />
      )}
      {editShirt && (
        <ShirtModal initial={editShirt} collars={collars} prodTypes={prodTypes}
          onSave={async (data, imgFile) => {
            let image_url = editShirt.image_url
            if (imgFile) {
              if (editShirt.image_url) await deleteImage(editShirt.image_url)
              image_url = await uploadBase64Image(imgFile)
            }
            const { data: updated } = await supabase.from('shirts').update({ ...data, image_url, updated_at: new Date().toISOString() }).eq('id', editShirt.id).select().single()
            if (updated) { setShirts((prev) => prev.map((x) => x.id === editShirt.id ? updated : x)); setEditShirt(null); notify('บันทึกการแก้ไขแล้ว') }
          }}
          onClose={() => setEditShirt(null)} />
      )}
      {showSettings && (
        <SettingsModal collars={collars} setCollars={setCollars} prodTypes={prodTypes} setProdTypes={setProdTypes}
          onClose={() => setShowSettings(false)} notify={notify} />
      )}
    </div>
  )
}

/* ── Loading ── */
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#fff' }}>S</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>กำลังโหลดข้อมูลจาก Supabase...</div>
      <div style={{ width: 160, height: 3, background: '#1c1c1c', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#c00', animation: 'loading 1.2s ease-in-out infinite', borderRadius: 2 }} />
      </div>
    </div>
  )
}

/* ── Banner Section ── */
function BannerSection({ banners, setBanners, isAdmin, notify }: {
  banners: Banner[], setBanners: React.Dispatch<React.SetStateAction<Banner[]>>,
  isAdmin: boolean, notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [cur, setCur] = useState(0)
  const [ov, setOv] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setCur((c) => (c + 1) % banners.length), 4500)
    return () => clearInterval(t)
  }, [banners.length])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = await uploadBase64Image(await fileToBase64(file), 'banners')
    if (!url) { notify('อัปโหลดรูปไม่สำเร็จ', 'err'); return }
    const { data } = await supabase.from('banners').insert([{ name: file.name, image_url: url, sort_order: banners.length }]).select().single()
    if (data) { setBanners((prev) => [...prev, data]); notify('เพิ่ม Banner แล้ว') }
  }

  const idx = banners.length > 0 ? cur % banners.length : 0

  return (
    <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 20 }}>
        {banners.length > 0 ? (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 260 }}>
            <img src={banners[idx].image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,0.45),transparent)' }} />
            {banners.length > 1 && (
              <>
                <button onClick={() => setCur((c) => (c - 1 + banners.length) % banners.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>‹</button>
                <button onClick={() => setCur((c) => (c + 1) % banners.length)} style={{ position: 'absolute', right: isAdmin ? 130 : 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>›</button>
                <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {banners.map((_, i) => <div key={i} onClick={() => setCur(i)} style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 4, background: i === idx ? '#c00' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all .3s' }} />)}
                </div>
              </>
            )}
            {isAdmin && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                <button className="btn-red sm" onClick={() => ref.current?.click()}>+ เพิ่ม</button>
                <button className="btn-outline sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={async () => {
                  const b = banners[idx]
                  await deleteImage(b.image_url)
                  await supabase.from('banners').delete().eq('id', b.id)
                  setBanners((prev) => prev.filter((_, i) => i !== idx))
                  setCur(0); notify('ลบ Banner แล้ว', 'err')
                }}>ลบ</button>
              </div>
            )}
          </div>
        ) : isAdmin ? (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 32 }}>🖼</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 14 }}>ลาก-วางรูป Banner หรือคลิกเลือกไฟล์</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG · PNG · WEBP — อัปโหลดสู่ Supabase Storage</div>
          </div>
        ) : (
          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>ยังไม่มี Banner</div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}

/* ── Shirt Card ── */
function ShirtCard({ shirt, isAdmin, canDrag, isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onEdit, onDelete, onDupe }: {
  shirt: Shirt, isAdmin: boolean,
  canDrag?: boolean, isDragging?: boolean, isDragOver?: boolean,
  onDragStart?: () => void, onDragOver?: () => void, onDragEnd?: () => void,
  onEdit: () => void, onDelete: () => void, onDupe: () => void
}) {
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchMoved = useRef(false)

  const handleTouchStart = () => {
    if (!canDrag) return
    touchMoved.current = false
    touchTimer.current = setTimeout(() => {
      if (!touchMoved.current) onDragStart?.()
    }, 400)
  }
  const handleTouchMove = () => { touchMoved.current = true }
  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current)
    if (isDragging) onDragEnd?.()
  }

  return (
    <div
      className="card-shirt"
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragOver={canDrag ? (e) => { e.preventDefault(); onDragOver?.() } : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transform: isDragOver ? 'scale(1.03)' : 'none',
        border: isDragOver ? '2px dashed #c00' : undefined,
        cursor: canDrag ? 'grab' : 'default',
        transition: 'opacity 0.15s, transform 0.15s, border 0.15s',
      }}
    >
      {canDrag && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>⠿</div>
      )}
      <div style={{ aspectRatio: '1', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
        {shirt.image_url
          ? <img src={shirt.image_url} alt={shirt.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 44 }}>👕</div>
        }
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shirt.category === 'new' && <span style={{ background: '#c00', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
          {shirt.is_promo && <span style={{ background: '#e07800', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>โปร</span>}
        </div>
      </div>
      <div style={{ padding: '13px 14px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'ไม่มีชื่อ'}</div>
        {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 2 }}>คอ: {shirt.collar_type}</div>}
        {shirt.product_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 8 }}>ประเภท: {shirt.product_type}</div>}
        <div style={{ fontWeight: 700, fontSize: 16, color: '#ff4444' }}>{shirt.price ? `${Number(shirt.price).toLocaleString()} THB.-` : '—'}</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={onEdit}>✏ แก้ไข</button>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={onDupe}>⧉ คัดลอก</button>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onDelete}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shirt Modal ── */
function ShirtModal({ initial, collars, prodTypes, category, onSave, onClose }: {
  initial?: Shirt, collars: Collar[], prodTypes: ProductType[],
  category?: string,
  onSave: (data: Partial<Shirt>, img: string | null) => Promise<void>,
  onClose: () => void
}) {
  const [f, setF] = useState({ name: initial?.name || '', collar_type: initial?.collar_type || '', product_type: initial?.product_type || '', price: initial?.price || 0, category: initial?.category || category || 'new', is_promo: initial?.is_promo || false })
  const [imgPreview, setImgPreview] = useState<string | null>(initial?.image_url || null)
  const [newImgData, setNewImgData] = useState<string | null>(null)
  const [ov, setOv] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }))

  const loadImg = (file: File) => {
    const r = new FileReader()
    r.onload = (e) => { const d = e.target?.result as string; setImgPreview(d); setNewImgData(d) }
    r.readAsDataURL(file)
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{initial ? '✏ แก้ไขแบบเสื้อ' : '+ เพิ่มแบบเสื้อใหม่'}</div>
          <button className="btn-outline sm" onClick={onClose}>✕ ปิด</button>
        </div>
        <div className="section-label">รูปภาพ (อัปโหลดสู่ Supabase Storage)</div>
        {imgPreview ? (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 170, marginBottom: 16 }}>
            <img src={imgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button className="btn-red sm" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => { setImgPreview(null); setNewImgData('__remove__') }}>เปลี่ยนรูป</button>
          </div>
        ) : (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 28 }}>📷</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 13 }}>ลาก-วางรูปภาพ หรือคลิกเลือก</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG · PNG · WEBP — อัปโหลดสู่ Supabase Storage</div>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) loadImg(e.target.files[0]); e.target.value = '' }} />
        <div className="divider" />
        <div style={{ display: 'grid', gap: 13 }}>
          <div><div className="section-label">ชื่อทีม / ชื่องาน</div><input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ชื่อแบบเสื้อ / ชื่อทีม" /></div>
          <div><div className="section-label">คอเสื้อ / กางเกง / สินค้า</div>
            <select className="select-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}>
              <option value="">— เลือกประเภทคอ —</option>
              {collars.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div><div className="section-label">ประเภทสินค้า</div>
            <select className="select-d" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
              <option value="">— เลือกประเภทสินค้า —</option>
              {prodTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div><div className="section-label">ราคา (THB)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0" style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>THB.-</span>
            </div>
          </div>
          <div><div className="section-label">หมวดหมู่</div>
            <select className="select-d" value={f.category} onChange={(e) => set('category', e.target.value)}>
              <option value="new">แบบเสื้อใหม่ (New)</option>
              <option value="collar">คอเสื้อทั้งหมด</option>
              <option value="other">แบบเสื้ออื่นๆ</option>
              <option value="fabric">เนื้อผ้า</option>
              <option value="photo">ภาพถ่ายงานจริง</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_promo} onChange={(e) => set('is_promo', e.target.checked)} />
            <span style={{ fontSize: 13 }}>แสดงในหมวดโปรโมชั่น</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn-red" style={{ flex: 1 }} disabled={saving} onClick={async () => { setSaving(true); await onSave(f, newImgData); setSaving(false) }}>
            {saving ? '⏳ กำลังอัปโหลด...' : '💾 บันทึก'}
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>ยกเลิก</button>
        </div>
      </div>
    </div>
  )
}

/* ── Settings Modal ── */
function SettingsModal({ collars, setCollars, prodTypes, setProdTypes, onClose, notify }: {
  collars: Collar[], setCollars: React.Dispatch<React.SetStateAction<Collar[]>>,
  prodTypes: ProductType[], setProdTypes: React.Dispatch<React.SetStateAction<ProductType[]>>,
  onClose: () => void, notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [tab, setTab] = useState<'collar' | 'prod'>('collar')
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 580 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚙ จัดการประเภทสินค้า</div>
          <button className="btn-outline sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          {([['collar', `ประเภทคอ (${collars.length})`], ['prod', `ประเภทสินค้า (${prodTypes.length})`]] as const).map(([id, lbl]) => (
            <div key={id} className={`nav-item${tab === id ? ' active' : ''}`} style={{ padding: '6px 16px', borderRadius: 5 }} onClick={() => setTab(id)}>{lbl}</div>
          ))}
        </div>
        {tab === 'collar' && <SupabaseTypeList table="collars" items={collars} setItems={setCollars} ph="เพิ่มประเภทคอเสื้อ..." notify={notify} />}
        {tab === 'prod' && <SupabaseTypeList table="product_types" items={prodTypes} setItems={setProdTypes} ph="เพิ่มประเภทสินค้า..." notify={notify} />}
      </div>
    </div>
  )
}

function SupabaseTypeList({ table, items, setItems, ph, notify }: {
  table: string, items: (Collar | ProductType)[],
  setItems: React.Dispatch<React.SetStateAction<any[]>>,
  ph: string, notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [nv, setNv] = useState('')
  const [ei, setEi] = useState<number | null>(null)
  const [ev, setEv] = useState('')

  const add = async () => {
    if (!nv.trim()) return
    const { data } = await supabase.from(table).insert([{ name: nv.trim(), sort_order: items.length }]).select().single()
    if (data) { setItems((prev: any[]) => [...prev, data]); setNv(''); notify('เพิ่มสำเร็จ') }
  }
  const save = async (i: number) => {
    const item = items[i]
    await supabase.from(table).update({ name: ev }).eq('id', item.id)
    setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, name: ev } : x))
    setEi(null); notify('บันทึกแล้ว')
  }
  const del = async (i: number) => {
    await supabase.from(table).delete().eq('id', items[i].id)
    setItems((prev: any[]) => prev.filter((_, j) => j !== i)); notify('ลบแล้ว', 'err')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input-d" value={nv} onChange={(e) => setNv(e.target.value)} placeholder={ph} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn-red sm" style={{ whiteSpace: 'nowrap' }} onClick={add}>+ เพิ่ม</button>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '7px 12px', borderRadius: 5 }}>
            {ei === i
              ? <><input className="input-d" value={ev} onChange={(e) => setEv(e.target.value)} style={{ flex: 1 }} autoFocus onKeyDown={(e) => e.key === 'Enter' && save(i)} />
                <button className="btn-red sm" onClick={() => save(i)}>บันทึก</button>
                <button className="btn-outline sm" onClick={() => setEi(null)}>ยกเลิก</button></>
              : <><span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <button className="btn-outline sm" onClick={() => { setEi(i); setEv(item.name) }}>แก้ไข</button>
                <button className="btn-ghost" onClick={() => del(i)}>ลบ</button></>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Customer Manager ── */
function CustomerMgr({ customers, setCustomers, notify }: {
  customers: Customer[], setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [q, setQ] = useState('')
  const list = customers.filter((c) => `${c.name}${c.email}${c.facebook}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>ข้อมูลสมาชิก</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Supabase Database · {customers.length} คน</div>
        </div>
        <input className="input-d" style={{ width: 260 }} placeholder="ค้นหาชื่อ / อีเมล / Facebook..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>ไม่พบสมาชิก</div>
        : <div style={{ display: 'grid', gap: 10 }}>
          {list.map((c) => (
            <div key={c.id} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#c00,#800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>{(c.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {c.email && <span>📧 {c.email}</span>}
                  {c.phone && <span>📞 {c.phone}</span>}
                  {c.facebook && <span>📘 {c.facebook}</span>}
                  {c.joined_at && <span>🕐 {new Date(c.joined_at).toLocaleDateString('th-TH')}</span>}
                </div>
              </div>
              <button className="btn-ghost" onClick={async () => {
                await supabase.from('customers').delete().eq('id', c.id)
                setCustomers((prev) => prev.filter((x) => x.id !== c.id))
                notify('ลบสมาชิกแล้ว', 'err')
              }}>✕ ลบ</button>
            </div>
          ))}
        </div>
      }
    </div>
  )
}

/* ── Auth Pages ── */
function AdminLogin({ onLogin, onBack }: { onLogin: (u: string) => void, onBack: () => void }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  return (
    <AuthShell title="เข้าสู่ระบบ Admin" badge="ADMIN ONLY">
      <input className="input-d" placeholder="Name ID เช่น ceo edit00" value={id} onChange={(e) => setId(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'))} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={() => ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')}>เข้าสู่ระบบ Admin</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>← กลับ</button>
    </AuthShell>
  )
}

function CustLogin({ customers, onLogin, onBack, onReg }: {
  customers: Customer[], onLogin: (u: Customer) => void, onBack: () => void, onReg: () => void
}) {
  const [em, setEm] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const go = () => { const u = customers.find((c) => c.email === em && c.password === pw); if (u) onLogin(u); else setErr('อีเมลหรือรหัสผ่านไม่ถูกต้อง') }
  return (
    <AuthShell title="เข้าสู่ระบบสมาชิก">
      <input className="input-d" placeholder="อีเมล" value={em} onChange={(e) => setEm(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="รหัสผ่าน" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={go}>เข้าสู่ระบบ</button>
      <button className="btn-outline" style={{ width: '100%', marginBottom: 8 }} onClick={onReg}>สมัครสมาชิกใหม่</button>
      <button className="btn-outline" style={{ width: '100%', opacity: .65, fontSize: 12 }} onClick={onBack}>ไม่ล็อคอิน — เข้าชมได้เลย</button>
    </AuthShell>
  )
}

function Register({ customers, onSave, onBack }: {
  customers: Customer[], onSave: (d: Omit<Customer, 'id' | 'joined_at'>) => Promise<void>, onBack: () => void
}) {
  const [f, setF] = useState({ name: '', email: '', phone: '', facebook: '', password: '', confirm: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const go = async () => {
    if (!f.name || !f.email || !f.password) return setErr('กรุณากรอกข้อมูลที่จำเป็น')
    if (f.password !== f.confirm) return setErr('รหัสผ่านไม่ตรงกัน')
    if (customers.find((c) => c.email === f.email)) return setErr('อีเมลนี้ถูกใช้งานแล้ว')
    setSaving(true)
    await onSave({ name: f.name, email: f.email, phone: f.phone, facebook: f.facebook, password: f.password })
    setSaving(false)
  }
  return (
    <AuthShell title="สมัครสมาชิก" sub="ข้อมูลถูกเก็บใน Supabase อย่างปลอดภัย">
      {([['name', 'ชื่อ-นามสกุล *', 'text'], ['email', 'อีเมล *', 'email'], ['phone', 'เบอร์โทรศัพท์', 'tel'], ['facebook', 'Facebook (แนะนำ)', 'text'], ['password', 'รหัสผ่าน *', 'password'], ['confirm', 'ยืนยันรหัสผ่าน *', 'password']] as const).map(([k, lb, tp]) => (
        <input key={k} className="input-d" type={tp} placeholder={lb} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} style={{ marginBottom: 10 }} />
      ))}
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} disabled={saving} onClick={go}>{saving ? 'กำลังบันทึก...' : 'สมัครสมาชิก'}</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>← กลับ</button>
    </AuthShell>
  )
}

function AuthShell({ title, badge, sub, children }: { title: string, badge?: string, sub?: string, children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#fff', margin: '0 auto 14px' }}>S</div>
          {badge && <div style={{ display: 'inline-block', background: '#c00', fontSize: 9, padding: '2px 10px', borderRadius: 3, fontWeight: 700, letterSpacing: 2, color: '#fff', marginBottom: 10 }}>{badge}</div>}
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrMsg({ msg }: { msg: string }) {
  return <div style={{ color: '#ff6060', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: 'rgba(200,0,0,0.1)', borderRadius: 5, border: '1px solid rgba(200,0,0,0.25)' }}>{msg}</div>
}

// Utility
function fileToBase64(file: File): Promise<string> {
  return new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target?.result as string); r.readAsDataURL(file) })
}

'@
[System.IO.File]::WriteAllText((Resolve-Path "app\catalog").Path + "\page.tsx", $catalogPage, [System.Text.Encoding]::UTF8)
Write-Host "OK app\catalog\page.tsx" -ForegroundColor Green

# 5. Git push
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git add .
git commit -m "feat: export auto-login from admin session"
git push origin main

Write-Host ""
Write-Host "Done! Vercel will deploy in ~2 minutes" -ForegroundColor Green
Write-Host "URL: https://shirt-catalog.vercel.app/export"
