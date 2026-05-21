'use client';

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Shirt } from '@/lib/supabase'
import { useRouter } from 'next/navigation';

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
          <span
  onClick={() => router.push('/catalog?admin=' + (adminUser || ''))}
  style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', cursor: 'pointer' }}
>
  ← กลับหน้าหลัก
</span>
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
