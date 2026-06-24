'use client';
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useState, useRef, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase'
import type { Shirt } from '@/lib/supabase'

const ADMIN_ACCOUNTS: Record<string, string> = {
  'ceo edit00': '00000000', 'ceo edit01': '00001111', 'ceo edit02': '00002222',
  'ceo edit03': '00003333', 'ceo edit04': '00004444', 'ceo edit05': '00005555',
  'ceo edit06': '00006666', 'ceo edit07': '00007777', 'ceo edit08': '00008888',
  'ceo edit09': '00009999',
}

const TABS = [
  { id: 'new',       label: 'แบบเสื้อใหม่',   badge: 'New', isPromo: false },
  { id: 'collar',    label: 'คอเสื้อทั้งหมด', badge: '',    isPromo: false },
  { id: 'promotion', label: 'โปรโมชั่น',        badge: '',    isPromo: true  },
  { id: 'other',     label: 'แบบเสื้ออื่นๆ',  badge: '',    isPromo: false },
  { id: 'fabric',    label: 'เนื้อผ้า',         badge: '',    isPromo: false },
  { id: 'photo',     label: 'ภาพถ่ายงานจริง', badge: '',    isPromo: false },
  { id: 'all',       label: 'สินค้าทั้งหมด',   badge: '',    isPromo: false },
]

const SIZES = [
  { id: '9:16', label: '9:16 Stories', w: 1080, h: 1920, icon: '📱' },
  { id: '1:1',  label: '1:1 Square',   w: 1080, h: 1080, icon: '⬜' },
  { id: '16:9', label: '16:9 Wide',    w: 1920, h: 1080, icon: '🖥' },
  { id: '4:5',  label: '4:5 Portrait', w: 1080, h: 1350, icon: '📷' },
]

function goBack(adminUser: string | null) {
  const admin = adminUser || ''
  window.location.href = `/catalog?admin=${encodeURIComponent(admin)}&nav=new`
}

export default function ExportPage() {
  const [adminUser, setAdminUser] = useState<string | null>(null)
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginErr, setLoginErr] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const adminParam = decodeURIComponent(params.get('admin') || '')
    if (adminParam) setAdminUser(adminParam)
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
  const [accentColor, setAccentColor] = useState('#FFE000')
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

  useEffect(() => {
    if (!adminUser) return
    setLoading(true)
    setSelected(new Set())
    const currentTab = TABS.find(t => t.id === tab)
    const query = currentTab?.isPromo
      ? db.from('shirts').select('*').eq('is_promo', true)
      : tab === 'all'
        ? db.from('shirts').select('*')
        : db.from('shirts').select('*').eq('category', tab)
    query.order('sort_order').order('created_at', { ascending: false }).then(({ data }) => {
      setShirts(data || [])
      setLoading(false)
    })
  }, [tab, adminUser])

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

    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, CW, headerH)
    ctx.fillStyle = accentColor
    ctx.fillRect(0, 0, CW, Math.round(CH * 0.004))
    ctx.fillRect(0, 0, barW, headerH)
    ctx.fillRect(CW - barW, 0, barW, headerH)

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
    ctx.fillStyle = accentColor
    ctx.font = `400 ${Math.round(headerH * 0.22)}px 'Noto Sans Thai', sans-serif`
    ctx.fillText(subtitle, titleX, headerH * 0.82)

    const gridY = headerH + pad
    const gridH = CH - headerH - footerH - pad * 2
    const gridW = CW - pad * 2
    const cols = getCols(items.length)
    const rows = Math.ceil(items.length / cols)
    const gapX = Math.round(CW * 0.012)
    const gapY = Math.round(CH * 0.01)
    const cardW = Math.floor((gridW - gapX * (cols - 1)) / cols)
    const cardH = Math.floor((gridH - gapY * (rows - 1)) / rows)
    const labelH = Math.round(cardH * 0.22)
    const imgH = cardH - labelH

    await Promise.all(items.map(async (shirt, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = pad + col * (cardW + gapX)
      const y = gridY + row * (cardH + gapY)
      const img = imgs[idx]

      ctx.fillStyle = '#1a1a1a'
      rr(ctx, x, y, cardW, cardH, 8); ctx.fill()

      if (img) {
        ctx.save()
        rr(ctx, x, y, cardW, imgH, 8); ctx.clip()
        const scale = Math.max(cardW / img.naturalWidth, imgH / img.naturalHeight)
        const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
        ctx.drawImage(img, x + (cardW - dw) / 2, y + (imgH - dh) / 2, dw, dh)
        ctx.restore()
      }

      ctx.fillStyle = '#111111'
      rrBottom(ctx, x, y + imgH, cardW, labelH, 8); ctx.fill()

      const labelY = y + imgH
      if (showNumbers) {
        ctx.fillStyle = accentColor
        ctx.font = `700 ${Math.round(labelH * 0.32)}px 'Noto Sans Thai', sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${idx + 1}`, x + cardW / 2, labelY + labelH * 0.42)
      }
      if (showPrice && shirt.price) {
        ctx.fillStyle = '#FFE000'
        ctx.font = `700 ${Math.round(labelH * 0.28)}px 'Noto Sans Thai', sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${Number(shirt.price).toLocaleString()} THB`, x + cardW / 2, labelY + labelH * (showNumbers ? 0.75 : 0.55))
      }
      if (showName && shirt.name) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = `400 ${Math.round(labelH * 0.24)}px 'Noto Sans Thai', sans-serif`
        const nm = shirt.name.length > 16 ? shirt.name.slice(0, 15) + '…' : shirt.name
        ctx.fillText(nm, x + cardW / 2, labelY + labelH * 0.88)
      }
    }))

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

  // ── Login gate ──
  if (!adminUser) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Sans Thai','Sarabun',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0} .inp{background:#1a1a1a;border:1px solid rgba(255,255,255,0.13);color:#f5f5f5;padding:10px 12px;border-radius:5px;font-family:inherit;font-size:14px;width:100%;display:block;margin-bottom:12px} .inp:focus{outline:none;border-color:#FFE000}`}</style>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#FFE000,#111)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#111', margin: '0 auto 14px' }}>S</div>
          <div style={{ display: 'inline-block', background: '#FFE000', fontSize: 9, padding: '2px 10px', borderRadius: 3, fontWeight: 700, letterSpacing: 2, color: '#111', marginBottom: 10 }}>ADMIN ONLY</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>Export Tool</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>เข้าสู่ระบบ Admin เพื่อใช้งาน</div>
        </div>
        <input className="inp" placeholder="Name ID เช่น ceo edit00" value={loginId} onChange={e => setLoginId(e.target.value)} />
        <input className="inp" type="password" placeholder="Password" value={loginPw} onChange={e => setLoginPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { if (ADMIN_ACCOUNTS[loginId] === loginPw) { setAdminUser(loginId); setLoginErr('') } else setLoginErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') } }} />
        {loginErr && <div style={{ color: '#111', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: '#FFE000', borderRadius: 5 }}>{loginErr}</div>}
        <button style={{ width: '100%', background: '#111', color: '#FFE000', border: 'none', padding: '11px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}
          onClick={() => { if (ADMIN_ACCOUNTS[loginId] === loginPw) { setAdminUser(loginId); setLoginErr('') } else setLoginErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง') }}>
          เข้าสู่ระบบ
        </button>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <span onClick={() => goBack(null)} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', cursor: 'pointer' }}>← กลับหน้าหลัก</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Noto Sans Thai','Sarabun',sans-serif", background: '#0a0a0a', minHeight: '100vh', color: '#f5f5f5' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#FFE000;border-radius:2px}
        .tab{padding:10px 14px;cursor:pointer;font-size:12px;font-weight:500;color:rgba(255,255,255,0.45);border-bottom:2px solid transparent;transition:all .18s;white-space:nowrap}
        .tab:hover{color:#fff}.tab.on{color:#FFE000;border-bottom-color:#FFE000}
        .card{background:#161616;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .2s;position:relative}
        .card:hover{border-color:rgba(255,224,0,0.5);transform:translateY(-2px)}
        .card.sel{border-color:#FFE000;box-shadow:0 0 0 2px rgba(255,224,0,0.25)}
        .chk{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .18s;z-index:2}
        .card.sel .chk{background:#FFE000;border-color:#FFE000;color:#111}
        .inp{background:#1a1a1a;border:1px solid rgba(255,255,255,0.13);color:#f5f5f5;padding:7px 10px;border-radius:5px;font-family:inherit;font-size:12px;width:100%}
        .inp:focus{outline:none;border-color:#FFE000}
        .btn-r{background:#111;color:#FFE000;border:2px solid #FFE000;padding:10px 18px;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;transition:all .18s}
        .btn-r:hover{background:#FFE000;color:#111}.btn-r:disabled{opacity:.5;cursor:not-allowed}
        .btn-o{background:transparent;color:#f5f5f5;border:1px solid rgba(255,255,255,0.2);padding:6px 12px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .18s}
        .btn-o:hover{border-color:#FFE000;color:#FFE000}
        .pill{padding:5px 10px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:500;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);transition:all .18s;background:transparent;font-family:inherit}
        .pill:hover{border-color:#FFE000;color:#FFE000}.pill.on{background:#FFE000;border-color:#FFE000;color:#111;font-weight:700}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .sl{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:6px}
        .tog{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.6)}
        input[type=checkbox]{accent-color:#FFE000;width:14px;height:14px;cursor:pointer}
        @media(max-width:900px){.grid{grid-template-columns:repeat(3,1fr)}.main-layout{grid-template-columns:1fr!important}}
        @media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span onClick={() => goBack(adminUser)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>← กลับ</span>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ width: 28, height: 28, background: '#FFE000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#111' }}>S</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Export Tool</div>
            <span style={{ background: '#FFE000', fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: 1, color: '#111' }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{adminUser}</span>
            <button className="btn-o" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => goBack(adminUser)}>ออก</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <div className="main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* LEFT — card grid */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, overflowX: 'auto' }}>
              {TABS.map(t => (
                <div key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}{t.badge && <span style={{ marginLeft: 5, background: '#FFE000', color: '#111', fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>{t.badge}</span>}
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                <span>ทั้งหมด <b style={{ color: '#fff' }}>{shirts.length}</b></span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                <span>เลือก <b style={{ color: '#FFE000' }}>{selected.size}</b></span>
                {selected.size > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{getCols(selected.size)} คอลัมน์ · {Math.ceil(selected.size / getCols(selected.size))} แถว</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-o" onClick={() => setSelected(new Set(shirts.map(s => s.id)))} style={{ padding: '3px 10px', fontSize: 10 }}>เลือกทั้งหมด</button>
                <button className="btn-o" onClick={() => setSelected(new Set())} style={{ padding: '3px 10px', fontSize: 10 }}>ยกเลิก</button>
              </div>
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
                    {(s.name || s.price) && (
                      <div style={{ padding: '8px 10px' }}>
                        {s.name && <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>{s.name}</div>}
                        {s.price && <div style={{ fontSize: 11, color: '#FFE000', fontWeight: 700 }}>{Number(s.price).toLocaleString()} THB</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — controls */}
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Export Button */}
            <button className="btn-r" style={{ width: '100%', padding: '13px', fontSize: 14 }}
              disabled={selected.size === 0 || exporting} onClick={doExport}>
              {exporting ? progress || 'กำลัง Export...' : `📥 Export ${selected.size > 0 ? selected.size : ''} รูป`}
            </button>

            {/* Size */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
              <div className="sl">ขนาดภาพ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {SIZES.map(s => (
                  <button key={s.id} className={`pill${sizeId === s.id ? ' on' : ''}`} onClick={() => setSizeId(s.id)}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
              <div className="sl">Layout</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ id: 'auto', label: 'Auto' }, { id: '2col', label: '2 คอล' }, { id: '3col', label: '3 คอล' }, { id: '4col', label: '4 คอล' }].map(l => (
                  <button key={l.id} className={`pill${layoutMode === l.id ? ' on' : ''}`} onClick={() => setLayoutMode(l.id)}>{l.label}</button>
                ))}
              </div>
            </div>

            {/* Text */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14, display: 'grid', gap: 10 }}>
              <div className="sl">ข้อความ</div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>หัวเรื่อง</div>
                <input className="inp" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>คำบรรยาย</div>
                <input className="inp" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Footer</div>
                <input className="inp" value={brandText} onChange={e => setBrandText(e.target.value)} />
              </div>
            </div>

            {/* Colors */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
              <div className="sl">สีธีม</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Accent</div>
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 40, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Background</div>
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 40, height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
              <div className="sl">โลโก้</div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const r = new FileReader()
                  r.onload = ev => setLogoSrc(ev.target?.result as string)
                  r.readAsDataURL(f)
                }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-o" style={{ flex: 1, fontSize: 11 }} onClick={() => logoInputRef.current?.click()}>
                  {logoSrc ? '✓ เปลี่ยนโลโก้' : '+ เพิ่มโลโก้'}
                </button>
                {logoSrc && <button className="btn-o" style={{ fontSize: 11 }} onClick={() => setLogoSrc(null)}>ลบ</button>}
              </div>
              {logoSrc && <img src={logoSrc} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', marginTop: 10, border: '1px solid rgba(255,255,255,0.1)' }} />}
            </div>

            {/* Show/Hide */}
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14, display: 'grid', gap: 10 }}>
              <div className="sl">แสดงข้อมูล</div>
              {[['showNumbers', 'เลขลำดับ', showNumbers, setShowNumbers], ['showPrice', 'ราคา', showPrice, setShowPrice], ['showName', 'ชื่อสินค้า', showName, setShowName]].map(([, label, val, setter]: any) => (
                <label key={label as string} className="tog">
                  <input type="checkbox" checked={val as boolean} onChange={e => setter(e.target.checked)} />
                  {label as string}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function rrBottom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y)
  ctx.closePath()
}
