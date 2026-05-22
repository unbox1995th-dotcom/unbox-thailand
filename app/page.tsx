'use client'
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useState, useEffect, useRef, useCallback } from 'react'
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

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const saveSortTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const adminParam = decodeURIComponent(params.get('admin') || '')
    const navParam = params.get('nav')
    if (adminParam) setAdminUser(adminParam)
    if (navParam) setActiveNav(navParam)
  }, [])

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

  const canDrag = !!adminUser && activeNav === 'new'

  const handleDragStart = (id: string) => setDragId(id)

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
        <div className="toast-box" style={{
          background: toast.type === 'ok' ? '#0c2210' : '#220c0c',
          border: `1px solid ${toast.type === 'ok' ? '#266626' : '#c00'}`,
          color: toast.type === 'ok' ? '#6fdf6f' : '#ff8080',
        }}>
          {toast.type === 'ok' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="header-inner">
          <div className="header-logo">
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0 }}>S</div>
            <div>
              <div className="header-title">รวมแบบเสื้อและสินค้าทั้งหมด</div>
              <div className="header-subtitle">
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 2 }}>SHIRT CATALOG</span>
                <span style={{ fontSize: 9, color: '#3d9a3d', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3d9a3d', display: 'inline-block' }} />
                  Supabase Connected
                </span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            {adminUser ? (
              <>
                <span style={{ background: 'linear-gradient(90deg,#c00,#800)', fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: 1, color: '#fff' }}>ADMIN</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminUser}</span>
                <button className="btn-outline sm" onClick={() => setShowCustMgr(!showCustMgr)}>{showCustMgr ? '← กลับ' : `สมาชิก (${customers.length})`}</button>
                <button className="btn-outline sm" onClick={() => { setAdminUser(null); setShowCustMgr(false); notify('ออกจากระบบแล้ว', 'err') }}>ออก</button>
              </>
            ) : custUser ? (
              <>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👤 {custUser.name}</span>
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
          <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 100, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', padding: '0 12px', minWidth: 'max-content' }}>
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
            <div style={{ background: 'rgba(200,0,0,0.07)', borderBottom: '1px solid rgba(200,0,0,0.18)', padding: '8px 12px' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#ff6060', fontWeight: 700 }}>⚙ Admin Mode</span>
                <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มแบบเสื้อ</button>
                <button className="btn-outline sm" onClick={() => setShowSettings(true)}>จัดการประเภท</button>
                <a href={`/export?admin=${encodeURIComponent(adminUser || '')}`}
                  style={{ background: 'transparent', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.22)', padding: '5px 10px', borderRadius: 5, fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all .18s' }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#c00'; (e.currentTarget as HTMLAnchorElement).style.color = '#c00' }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLAnchorElement).style.color = '#f5f5f5' }}>
                  📥 Export
                </a>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginLeft: 'auto' }}>
                  {shirts.length} | {filtered.length} รายการ
                </span>
              </div>
            </div>
          )}

          {/* Grid */}
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 20px)' }}>
            {canDrag && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>☰</span> กดค้างที่การ์ดแล้วลากเพื่อเรียงลำดับ — บันทึกอัตโนมัติ
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'clamp(40px, 8vw, 70px) 20px' }}>
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
              const newUrl = await uploadBase64Image(imgFile)
              if (newUrl) {
                if (editShirt.image_url) await deleteImage(editShirt.image_url)
                image_url = newUrl
              }
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
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(12px, 2vw, 20px)' }}>
        {banners.length > 0 ? (
          <div style={{ position: 'relative', borderRadius: 'clamp(8px, 1.5vw, 12px)', overflow: 'hidden', height: 'clamp(140px, 22vw, 300px)' }}>
            <img src={banners[idx].image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,0.45),transparent)' }} />
            {banners.length > 1 && (
              <>
                <button onClick={() => setCur((c) => (c - 1 + banners.length) % banners.length)}
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>‹</button>
                <button onClick={() => setCur((c) => (c + 1) % banners.length)}
                  style={{ position: 'absolute', right: isAdmin ? 110 : 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>›</button>
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {banners.map((_, i) => <div key={i} onClick={() => setCur(i)} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 4, background: i === idx ? '#c00' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all .3s' }} />)}
                </div>
              </>
            )}
            {isAdmin && (
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
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
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 28 }}>🖼</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 13 }}>ลาก-วางรูป Banner หรือคลิกเลือกไฟล์</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG · PNG · WEBP</div>
          </div>
        ) : (
          <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>ยังไม่มี Banner</div>
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
      <div style={{ padding: 'clamp(10px, 2vw, 13px) clamp(10px, 2vw, 14px)' }}>
        <div style={{ fontWeight: 600, fontSize: 'clamp(12px, 1.8vw, 14px)', marginBottom: 4, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'ไม่มีชื่อ'}</div>
        {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 2 }}>คอ: {shirt.collar_type}</div>}
        {shirt.product_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 8 }}>ประเภท: {shirt.product_type}</div>}
        <div style={{ fontWeight: 700, fontSize: 'clamp(13px, 2vw, 16px)', color: '#ff4444' }}>{shirt.price ? `${Number(shirt.price).toLocaleString()} THB.-` : '—'}</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            <button className="btn-outline sm" style={{ flex: 1, fontSize: 11, padding: '4px 6px' }} onClick={onEdit}>✏ แก้</button>
            <button className="btn-outline sm" style={{ flex: 1, fontSize: 11, padding: '4px 6px' }} onClick={onDupe}>⧉ ก๊อป</button>
            <button className="btn-ghost" style={{ flex: 1, fontSize: 11, padding: '4px 6px' }} onClick={onDelete}>✕</button>
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
          <div style={{ fontWeight: 700, fontSize: 15 }}>{initial ? '✏ แก้ไขแบบเสื้อ' : '+ เพิ่มแบบเสื้อใหม่'}</div>
          <button className="btn-outline sm" onClick={onClose}>✕ ปิด</button>
        </div>
        <div className="section-label">รูปภาพ</div>
        {imgPreview ? (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 150, marginBottom: 16 }}>
            <img src={imgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button className="btn-red sm" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => { setImgPreview(null); setNewImgData('__remove__') }}>เปลี่ยนรูป</button>
          </div>
        ) : (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 26 }}>📷</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 13 }}>แตะหรือลาก-วางรูปภาพ</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG · PNG · WEBP</div>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) loadImg(e.target.files[0]); e.target.value = '' }} />
        <div className="divider" />
        <div style={{ display: 'grid', gap: 12 }}>
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
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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
          <div style={{ fontWeight: 700, fontSize: 15 }}>⚙ จัดการประเภทสินค้า</div>
          <button className="btn-outline sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          {([['collar', `ประเภทคอ (${collars.length})`], ['prod', `ประเภทสินค้า (${prodTypes.length})`]] as const).map(([id, lbl]) => (
            <div key={id} className={`nav-item${tab === id ? ' active' : ''}`} style={{ padding: '6px 14px', borderRadius: 5 }} onClick={() => setTab(id)}>{lbl}</div>
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>ข้อมูลสมาชิก</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Supabase Database · {customers.length} คน</div>
        </div>
        <input className="input-d" style={{ width: 'min(260px, 100%)' }} placeholder="ค้นหาชื่อ / อีเมล / Facebook..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>ไม่พบสมาชิก</div>
        : <div style={{ display: 'grid', gap: 10 }}>
          {list.map((c) => (
            <div key={c.id} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#c00,#800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>{(c.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 'clamp(24px, 5vw, 36px) clamp(16px, 5vw, 32px)', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', margin: '0 auto 14px' }}>S</div>
          {badge && <div style={{ display: 'inline-block', background: '#c00', fontSize: 9, padding: '2px 10px', borderRadius: 3, fontWeight: 700, letterSpacing: 2, color: '#fff', marginBottom: 10 }}>{badge}</div>}
          <div style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>{title}</div>
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target?.result as string); r.readAsDataURL(file) })
}
