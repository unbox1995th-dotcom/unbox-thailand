'use client'
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, db, uploadBase64Image, deleteImage, logDeletion } from '@/lib/supabase'
import type { Shirt, Banner, Collar, ProductType, Customer } from '@/lib/supabase'

type ShopSettings = { id: string; shop_name: string; shop_subtitle: string; logo_url: string | null }
type FabricType = { id: string; name: string; sort_order: number }
type ShirtType = { id: string; name: string; slug: string; icon: string; sort_order: number }
type Promotion = { id: string; name: string; is_active: boolean; min_qty: number; type: string; free_qty: number; discount_qty: number; discount_pct: number; discount_thb: number; sort_order: number }
type ShippingRule = { id: string; name: string; min_qty: number; max_qty: number | null; price: number; sort_order: number }
type CollarWithPrice = { id: string; name: string; price: number; sort_order: number }

const ADMIN_ACCOUNTS: Record<string, string> = {
  'ceo edit00': '00000000', 'ceo edit01': '00001111', 'ceo edit02': '00002222',
  'ceo edit03': '00003333', 'ceo edit04': '00004444', 'ceo edit05': '00005555',
  'ceo edit06': '00006666', 'ceo edit07': '00007777', 'ceo edit08': '00008888',
  'ceo edit09': '00009999',
}

const NAV_ITEMS = [
  { id: 'new', label: 'แบบเสื้อใหม่', badge: 'New' },
  { id: 'promotion', label: 'โปรโมชั่น' },
  { id: 'collar', label: 'คอเสื้อทั้งหมด' },
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
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [shirtTypes, setShirtTypes] = useState<ShirtType[]>([])
  const [selectedShirtType, setSelectedShirtType] = useState<string | null>(null)

  const [editShirt, setEditShirt] = useState<Shirt | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCustMgr, setShowCustMgr] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcShirtId, setCalcShirtId] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState('')
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [showShopAdmin, setShowShopAdmin] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [shopSettings, setShopSettings] = useState<ShopSettings>({ id: 'main', shop_name: 'อีโวสปอร์ต', shop_subtitle: 'รวมแบบเสื้อและสินค้าทั้งหมด', logo_url: null })
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
      const [{ data: b }, { data: s }, { data: c }, { data: p }, { data: cu }, { data: ft }, { data: promo }, { data: ship }, { data: st }] =
        await Promise.all([
          db.from('banners').select('*').order('sort_order'),
          db.from('shirts').select('*').order('sort_order').order('created_at', { ascending: false }),
          db.from('collars').select('*').order('sort_order'),
          db.from('product_types').select('*').order('sort_order'),
          db.from('customers').select('*').order('joined_at', { ascending: false }),
          db.from('fabric_types').select('*').order('sort_order'),
          db.from('promotions').select('*').order('sort_order'),
          db.from('shipping_rules').select('*').order('sort_order'),
          db.from('shirt_types').select('*').order('sort_order'),
        ])
      const { data: ss } = await db.from('shop_settings').select('*').eq('id', 'main').single()
      if (b) setBanners(b)
      if (s) setShirts(s)
      if (c) setCollars(c)
      if (p) setProdTypes(p)
      if (cu) setCustomers(cu)
      if (ft) setFabricTypes(ft as FabricType[])
      if (promo) setPromotions(promo as Promotion[])
      if (ship) setShippingRules(ship as ShippingRule[])
      if (st) setShirtTypes(st as ShirtType[])
      if (ss) setShopSettings(ss)
      setReady(true)
    })()
  }, [])

  const filtered = shirts.filter((s) => {
    if (activeNav === 'all') return s.category === 'new' || s.category === 'other'
    if (activeNav === 'new') return s.category === 'new'
    if (activeNav === 'collar') return s.category === 'collar'
    if (activeNav === 'promotion') return s.is_promo
    if (activeNav === 'other') return s.category === 'other'
    if (activeNav === 'fabric') return s.category === 'fabric'
    if (activeNav === 'photo') return s.category === 'photo'
    return true
  }).filter((s) => {
    if (activeNav !== 'new' || !selectedShirtType) return true
    return (s as any).shirt_type === selectedShirtType
  })

  // นับจำนวนเสื้อแต่ละประเภท
  const shirtTypeCounts = shirts
    .filter((s) => s.category === 'new')
    .reduce((acc: Record<string, number>, s) => {
      const t = (s as any).shirt_type
      if (t) acc[t] = (acc[t] ?? 0) + 1
      return acc
    }, {})

  const canDrag = !!adminUser && activeNav !== 'all'

  const handleDragStart = (id: string) => { setDragId(id) }

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
        await db.from('shirts').update({ sort_order: u.sort_order }).eq('id', u.id)
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
      const { data: newCust, error } = await db.from('customers').insert([data]).select().single()
      if (error) { notify('สมัครสมาชิกไม่สำเร็จ: ' + error.message, 'err'); return }
      setCustomers((prev) => [newCust, ...prev])
      setView('cust-login')
      notify('สมัครสมาชิกสำเร็จ')
    }} onBack={() => setView('cust-login')} customers={customers} />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
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

      {!showCustMgr && (
        <BannerSection banners={banners} setBanners={setBanners} isAdmin={!!adminUser} notify={notify} />
      )}

      {showCustMgr && adminUser && (
        <CustomerMgr customers={customers} setCustomers={setCustomers} notify={notify} />
      )}

      {!showCustMgr && (
        <>
          <div style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 100, overflowX: 'auto' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', padding: '0 16px' }}>
              {NAV_ITEMS.map((n) => (
                <div key={n.id} className={`nav-item${activeNav === n.id ? ' active' : ''}`} onClick={() => { setActiveNav(n.id); setSelectedShirtType(null) }}>
                  {n.label}
                  {n.badge && <span style={{ display: 'inline-block', background: '#c00', color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' }}>{n.badge}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Filter bar ประเภทเสื้อ — แสดงเฉพาะ tab แบบเสื้อใหม่ */}

          {adminUser && (
            <div style={{ background: 'rgba(200,0,0,0.07)', borderBottom: '1px solid rgba(200,0,0,0.18)', padding: '9px 20px' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#ff6060', fontWeight: 700 }}>⚙ Admin Mode — บันทึกสู่ Supabase อัตโนมัติ</span>
                {activeNav === 'new' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มแบบเสื้อใหม่</button>}
                {activeNav === 'collar' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มคอเสื้อ</button>}
                {activeNav === 'promotion' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มโปรโมชั่น</button>}
                {activeNav === 'other' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มสินค้าใหม่</button>}
                {activeNav === 'fabric' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มเนื้อผ้า</button>}
                {activeNav === 'photo' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มรูปภาพ</button>}
                {activeNav === 'all' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เพิ่มสินค้าใหม่</button>}
                <button className="btn-outline sm" onClick={() => setShowSettings(true)}>จัดการประเภท</button>
                <button className="btn-outline sm" onClick={() => setShowContactAdmin(true)}>📞 ช่องทางติดต่อ</button>
                <button className="btn-outline sm" onClick={() => setShowShopAdmin(true)}>🏪 หน้าต้อนรับ</button>
                
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

          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
            {canDrag && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>☰</span> กดค้างที่การ์ดแล้วลากเพื่อเรียงลำดับ — บันทึกอัตโนมัติ
              </div>
            )}

            {/* Layout: sidebar ซ้าย + content ขวา เฉพาะ tab new */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

              {/* Sidebar ประเภทเสื้อ */}
              {activeNav === 'new' && shirtTypes.length > 0 && (
                <div style={{ width: 180, flexShrink: 0, position: 'sticky', top: 56, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#999', letterSpacing: 1, fontWeight: 700, marginBottom: 6, paddingLeft: 4 }}>กรองประเภทเสื้อ</div>

                  {/* ปุ่มทั้งหมด */}
                  <button
                    onClick={() => setSelectedShirtType(null)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '7px 10px', borderRadius: 7, border: 'none', background: selectedShirtType === null ? '#c00' : '#f5f5f5', color: selectedShirtType === null ? '#fff' : '#333', fontSize: 12.5, cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: selectedShirtType === null ? 700 : 500, transition: 'all 0.15s' }}
                  >
                    <span>🗂️ ทั้งหมด</span>
                    <span style={{ background: selectedShirtType === null ? 'rgba(255,255,255,0.25)' : '#e0e0e0', color: selectedShirtType === null ? '#fff' : '#555', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                      {shirts.filter(s => s.category === 'new').length}
                    </span>
                  </button>

                  {/* Divider */}
                  <div style={{ height: 1, background: '#e5e5e5', margin: '4px 0' }} />

                  {/* ปุ่มแต่ละประเภท */}
                  {shirtTypes.map((type) => {
                    const count = shirtTypeCounts[type.slug] ?? 0
                    const isActive = selectedShirtType === type.slug
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedShirtType(isActive ? null : type.slug)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '7px 10px', borderRadius: 7, border: 'none', background: isActive ? '#c00' : '#f5f5f5', color: isActive ? '#fff' : '#333', fontSize: 12.5, cursor: 'pointer', textAlign: 'left', width: '100%', fontWeight: isActive ? 700 : 400, transition: 'all 0.15s' }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#ebebeb' }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                          <span style={{ flexShrink: 0 }}>{type.icon || '👕'}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type.name}</span>
                        </span>
                        {count > 0 && (
                          <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#e0e0e0', color: isActive ? '#fff' : '#555', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Content area */}
              <div style={{ flex: 1, minWidth: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px' }}>
                <div style={{ fontSize: 50, marginBottom: 16, opacity: .2 }}>👕</div>
                <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 14, marginBottom: adminUser ? 18 : 0 }}>ยังไม่มีสินค้าในหมวดนี้</div>
                {adminUser && (
                  <button className="btn-red" style={{ padding: '10px 30px' }} onClick={() => setShowAdd(true)}>
                    {activeNav === 'new' ? '+ เพิ่มแบบเสื้อแรก' : activeNav === 'collar' ? '+ เพิ่มคอเสื้อ' : activeNav === 'promotion' ? '+ เพิ่มโปรโมชั่น' : activeNav === 'other' ? '+ เพิ่มสินค้าแรก' : activeNav === 'fabric' ? '+ เพิ่มเนื้อผ้า' : activeNav === 'photo' ? '+ เพิ่มรูปภาพ' : '+ เพิ่มสินค้าใหม่'}
                  </button>
                )}
              </div>
            ) : (activeNav === 'photo' || activeNav === 'promotion') ? (
              <div style={{ columns: '2 160px', gap: 12 }}>
                {filtered.map((s) => (
                  <PhotoCard key={s.id} shirt={s} isAdmin={!!adminUser}
                    onEdit={() => setEditShirt(s)}
                    onImageClick={(url) => setLightboxUrl(url)}
                    onDelete={async () => {
                      await logDeletion({ table_name: 'shirts', record_id: s.id, record_name: s.name, image_url: s.image_url, deleted_by: adminUser || 'admin' })
                      await db.from('shirts').delete().eq('id', s.id)
                      setShirts((prev) => prev.filter((x) => x.id !== s.id))
                      notify('ลบรูปแล้ว', 'err')
                    }}
                  />
                ))}
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
                      await logDeletion({ table_name: 'shirts', record_id: s.id, record_name: s.name, image_url: s.image_url, deleted_by: adminUser || 'admin' })
                      await db.from('shirts').delete().eq('id', s.id)
                      setShirts((prev) => prev.filter((x) => x.id !== s.id))
                      notify('ลบสินค้าแล้ว', 'err')
                    }}
                    onDupe={async () => {
                      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s
                      const { data } = await db.from('shirts').insert([{ ...rest, name: s.name + ' (สำเนา)' }]).select().single()
                      if (data) { setShirts((prev) => [data, ...prev]); notify('คัดลอกสำเร็จ') }
                    }}
                    onContact={() => setShowContact(true)}
                    onCalculate={(id: string) => { setCalcShirtId(id); setShowCalculator(true) }}
                    onImageClick={(url: string) => setLightboxUrl(url)}
                  />
                ))}
              </div>
            )}
              </div>{/* end content area */}
            </div>{/* end sidebar+content flex */}
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.13)' }}>
        Shirt Catalog © 2025 — Powered by Supabase + Vercel
      </div>

      {/* Modals */}
      {showAdd && (
        <ShirtModal collars={collars} prodTypes={prodTypes} fabricTypes={fabricTypes} shirtTypes={shirtTypes}
          category={activeNav === 'all' ? 'new' : activeNav}
          onSave={async (data, imgFile) => {
            let image_url = null
            if (imgFile) image_url = await uploadBase64Image(imgFile)
            const { data: newShirt } = await db.from('shirts').insert([{ ...data, image_url }]).select().single()
            if (newShirt) { setShirts((prev) => [newShirt, ...prev]); setShowAdd(false); notify('เพิ่มแบบเสื้อแล้ว — บันทึกสู่ Supabase') }
          }}
          onClose={() => setShowAdd(false)} />
      )}
      {editShirt && (
        <ShirtModal initial={editShirt} collars={collars} prodTypes={prodTypes} fabricTypes={fabricTypes} shirtTypes={shirtTypes}
          onSave={async (data, imgFile) => {
            let image_url = editShirt.image_url
            if (imgFile) {
              const newUrl = await uploadBase64Image(imgFile)
              if (newUrl) {
                // ไม่ลบรูปเก่า — เก็บไว้ใน Storage ตลอด
                image_url = newUrl
              }
            }
            const { data: updated } = await db.from('shirts').update({ ...data, image_url, updated_at: new Date().toISOString() }).eq('id', editShirt.id).select().single()
            if (updated) { setShirts((prev) => prev.map((x) => x.id === editShirt.id ? updated : x)); setEditShirt(null); notify('บันทึกการแก้ไขแล้ว') }
          }}
          onClose={() => setEditShirt(null)} />
      )}
      {showSettings && (
        <SettingsModal collars={collars} setCollars={setCollars} prodTypes={prodTypes} setProdTypes={setProdTypes} fabricTypes={fabricTypes} setFabricTypes={setFabricTypes} promotions={promotions} setPromotions={setPromotions} shippingRules={shippingRules} setShippingRules={setShippingRules} shirtTypes={shirtTypes} setShirtTypes={setShirtTypes}
          onClose={() => setShowSettings(false)} notify={notify} />
      )}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl('')}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          <button
            onClick={() => setLightboxUrl('')}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', borderRadius: 8, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {showCalculator && <PriceCalculator shirts={shirts} collars={collars as CollarWithPrice[]} promotions={promotions} shippingRules={shippingRules} initShirtId={calcShirtId} onClose={() => { setShowCalculator(false); setCalcShirtId('') }} />}
      {showContactAdmin && <ContactAdminModal notify={notify} onClose={() => setShowContactAdmin(false)} />}
      {showShopAdmin && <ShopAdminModal shopSettings={shopSettings} setShopSettings={setShopSettings} notify={notify} onClose={() => setShowShopAdmin(false)} />}
      {showWelcome && <WelcomeModal shopSettings={shopSettings} onBrowse={() => setShowWelcome(false)} onAdmin={() => { setShowWelcome(false); setView('admin-login') }} />}
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
    const { data } = await db.from('banners').insert([{ name: file.name, image_url: url, sort_order: banners.length }]).select().single()
    if (data) { setBanners((prev) => [...prev, data]); notify('เพิ่ม Banner แล้ว') }
  }

  const idx = banners.length > 0 ? cur % banners.length : 0

  return (
    <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 20 }}>
        {banners.length > 0 ? (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', width: '100%', paddingTop: 'clamp(120px, 28vw, 380px)', height: 0 }}>
            <img src={banners[idx].image_url} alt="banner" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  await db.from('banners').delete().eq('id', b.id)
                  setBanners((prev) => prev.filter((_, i) => i !== idx))
                  setCur(0); notify('ลบ Banner แล้ว', 'err')
                }}>ลบ</button>
              </div>
            )}
          </div>
        ) : isAdmin ? (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ minHeight: 120, aspectRatio: '16/5', maxHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
function ShirtCard({ shirt, isAdmin, canDrag, isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onEdit, onDelete, onDupe, onContact, onCalculate, onImageClick }: {
  shirt: Shirt, isAdmin: boolean,
  canDrag?: boolean, isDragging?: boolean, isDragOver?: boolean,
  onDragStart?: () => void, onDragOver?: () => void, onDragEnd?: () => void,
  onEdit: () => void, onDelete: () => void, onDupe: () => void,
  onContact?: () => void, onCalculate?: (id: string) => void, onImageClick?: (url: string) => void
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

  const showActionBtns = !isAdmin && (shirt.category === 'new' || shirt.category === 'collar' || shirt.category === 'other' || shirt.category === 'photo')

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
      <div style={{ aspectRatio: '1', background: '#1a1a1a', position: 'relative', overflow: 'hidden', cursor: shirt.image_url ? 'zoom-in' : 'default' }}
        onClick={() => shirt.image_url && onImageClick?.(shirt.image_url)}>
        {shirt.image_url
          ? <img src={shirt.image_url} alt={shirt.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 44 }}>👕</div>
        }
        {shirt.image_url && (
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '3px 7px', fontSize: 11, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }}>🔍</div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shirt.category === 'new' && <span style={{ background: '#c00', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
          {shirt.is_promo && <span style={{ background: '#e07800', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>โปร</span>}
        </div>
      </div>
      <div style={{ padding: '13px 14px 12px' }}>
        {shirt.category === 'fabric' ? (
          <>
            <div style={{ background: '#c00', borderRadius: 6, padding: '5px 10px', marginBottom: 8, display: 'inline-block' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'ไม่มีชื่อ'}</span>
            </div>
            {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.7)', background: '#111', borderRadius: 4, padding: '4px 8px', marginBottom: 4 }}><span style={{ color: '#ff4444', fontWeight: 700 }}>คุณสมบัติผ้า:</span> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{shirt.collar_type}</span></div>}
            {shirt.product_type && <div style={{ fontSize: 11, background: '#111', borderRadius: 4, padding: '4px 8px', marginBottom: 8 }}><span style={{ color: '#ff4444', fontWeight: 700 }}>ประเภทผ้า:</span> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{shirt.product_type}</span></div>}
            <div style={{ fontWeight: 700, fontSize: 15, color: Number(shirt.price) > 0 ? '#ff4444' : 'rgba(255,255,255,0.4)' }}>{Number(shirt.price) > 0 ? `+ ${Number(shirt.price).toLocaleString()}.- บาท/ตัว` : 'ไม่บวกเพิ่ม'}</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'ไม่มีชื่อ'}</div>
            {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 2 }}>คอ: {shirt.collar_type}</div>}
            {shirt.product_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 4 }}>ประเภท: {shirt.product_type}</div>}
            {(shirt as any).shirt_type && (shirt as any).shirt_type_name && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.3)', color: '#ff8080', borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 500 }}>
                  {(shirt as any).shirt_type_icon || '👕'} {(shirt as any).shirt_type_name}
                </span>
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 16, color: Number(shirt.price) > 0 ? '#ff4444' : 'rgba(255,255,255,0.3)' }}>{Number(shirt.price) > 0 ? `${Number(shirt.price).toLocaleString()}.- บาท/ตัว` : '—'}</div>
          </>
        )}
        {showActionBtns && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn-red sm" style={{ flex: 1 }} onClick={onContact}>📞 สนใจสั่งซื้อ</button>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={() => onCalculate?.(shirt.id)}>🧮 คำนวณราคา</button>
          </div>
        )}
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


/* ── Photo Card (responsive image) ── */
function PhotoCard({ shirt, isAdmin, onEdit, onDelete, onImageClick }: {
  shirt: Shirt, isAdmin: boolean,
  onEdit: () => void, onDelete: () => void, onImageClick?: (url: string) => void
}) {
  return (
    <div className="card-shirt" style={{ breakInside: 'avoid', marginBottom: 12, position: 'relative' }}>
      {shirt.image_url ? (
        <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => onImageClick?.(shirt.image_url!)}>
          <img src={shirt.image_url} alt={shirt.name || ''} style={{ width: '100%', display: 'block', borderRadius: '8px 8px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '3px 7px', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>🔍</div>
        </div>
      ) : (
        <div style={{ width: '100%', aspectRatio: '4/3', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 44, borderRadius: '8px 8px 0 0' }}>🖼</div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 5, padding: '8px 10px' }}>
          <button className="btn-outline sm" style={{ flex: 1 }} onClick={onEdit}>✏ แก้ไข</button>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onDelete}>✕</button>
        </div>
      )}
    </div>
  )
}

/* ── Shirt Modal ── */
function ShirtModal({ initial, collars, prodTypes, fabricTypes, shirtTypes, category, onSave, onClose }: {
  initial?: Shirt, collars: Collar[], prodTypes: ProductType[], fabricTypes: FabricType[], shirtTypes: ShirtType[],
  category?: string,
  onSave: (data: Partial<Shirt>, img: string | null) => Promise<void>,
  onClose: () => void
}) {
  const [f, setF] = useState({ name: initial?.name || '', collar_type: initial?.collar_type || '', product_type: initial?.product_type || 'ไมโครโพลีเอสเตอร์ (Micro Polyester)', price: initial?.price || 0, category: initial?.category || category || 'new', is_promo: initial?.is_promo || false, shirt_type: (initial as any)?.shirt_type || 'football' })
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
          <div style={{ fontWeight: 700, fontSize: 16 }}>{initial
            ? (f.category === 'fabric' ? '✏ แก้ไขเนื้อผ้า' : f.category === 'collar' ? '✏ แก้ไขคอเสื้อ' : f.category === 'promotion' ? '✏ แก้ไขโปรโมชั่น' : f.category === 'photo' ? '✏ แก้ไขรูปภาพ' : '✏ แก้ไขแบบเสื้อ')
            : (f.category === 'fabric' ? '+ เพิ่มเนื้อผ้าใหม่' : f.category === 'collar' ? '+ เพิ่มคอเสื้อ' : f.category === 'promotion' ? '+ เพิ่มโปรโมชั่น' : f.category === 'photo' ? '+ เพิ่มรูปภาพ' : '+ เพิ่มแบบเสื้อใหม่')}</div>
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
          {/* ── fabric ── */}
          {f.category === 'fabric' && (<>
            <div><div className="section-label">เนื้อผ้า</div><input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ชื่อเนื้อผ้า" /></div>
            <div><div className="section-label">เนื้อผ้า +บวกเพิ่ม ตัวละ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>บาท/ตัว</span>
              </div>
            </div>
            <div><div className="section-label">ประเภทเนื้อผ้า</div>
              <select className="select-d" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
                {fabricTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">คุณสมบัติเนื้อผ้า</div>
              <textarea className="input-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}
                placeholder="เช่น น้ำหนัก 150 กรัม ระบายอากาศได้ดี ไม่หดตัว..."
                style={{ minHeight: 80, resize: 'vertical' as const }} />
            </div>
          </>)}
          {/* ── collar ── */}
          {f.category === 'collar' && (<>
            <div><div className="section-label">คอเสื้อ / กางเกง / สินค้า</div>
              <select className="select-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}>
                <option value="">— เลือกประเภทคอ —</option>
                {collars.map((col) => <option key={col.id} value={col.name}>{col.name}</option>)}
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
          </>)}
          {/* ── photo / promotion: รูปอย่างเดียว ── */}
          {(f.category === 'photo' || f.category === 'promotion') && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '8px 0' }}>อัปโหลดรูปภาพด้านบนเพื่อบันทึก</div>
          )}
          {/* ── new / other / all ── */}
          {(f.category === 'new' || f.category === 'other') && (<>
            <div><div className="section-label">ชื่อทีม / ชื่องาน</div><input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="ชื่อแบบเสื้อ / ชื่อทีม" /></div>
            <div><div className="section-label">คอเสื้อ / กางเกง / สินค้า</div>
              <select className="select-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}>
                <option value="">— เลือกประเภทคอ —</option>
                {collars.map((col) => <option key={col.id} value={col.name}>{col.name}</option>)}
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
                <option value="photo">ภาพถ่ายงานจริง</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.is_promo} onChange={(e) => set('is_promo', e.target.checked)} />
              <span style={{ fontSize: 13 }}>แสดงในหมวดโปรโมชั่น</span>
            </label>
            {shirtTypes.length > 0 && (
              <div>
                <div className="section-label">ประเภทเสื้อ (สำหรับ Filter)</div>
                <select className="select-d" value={f.shirt_type} onChange={(e) => set('shirt_type', e.target.value)}>
                  <option value="">— ไม่ระบุประเภท —</option>
                  {shirtTypes.map((t) => <option key={t.id} value={t.slug}>{t.icon} {t.name}</option>)}
                </select>
                {f.shirt_type && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#555' }}>Preview:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.3)', color: '#ff8080', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>
                      {shirtTypes.find(t => t.slug === f.shirt_type)?.icon} {shirtTypes.find(t => t.slug === f.shirt_type)?.name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>)}
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
function SettingsModal({ collars, setCollars, prodTypes, setProdTypes, fabricTypes, setFabricTypes, promotions, setPromotions, shippingRules, setShippingRules, shirtTypes, setShirtTypes, onClose, notify }: {
  collars: Collar[], setCollars: React.Dispatch<React.SetStateAction<Collar[]>>,
  prodTypes: ProductType[], setProdTypes: React.Dispatch<React.SetStateAction<ProductType[]>>,
  fabricTypes: FabricType[], setFabricTypes: React.Dispatch<React.SetStateAction<FabricType[]>>,
  promotions: Promotion[], setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>,
  shippingRules: ShippingRule[], setShippingRules: React.Dispatch<React.SetStateAction<ShippingRule[]>>,
  shirtTypes: ShirtType[], setShirtTypes: React.Dispatch<React.SetStateAction<ShirtType[]>>,
  onClose: () => void, notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [tab, setTab] = useState<'collar'|'prod'|'fabric'|'price'|'promo'|'ship'|'shirttype'>('collar')
  const TABS = [
    ['collar', `ประเภทคอเสื้อ (${collars.length})`],
    ['prod', `ประเภทสินค้า (${prodTypes.length})`],
    ['fabric', `ประเภทเนื้อผ้า (${fabricTypes.length})`],
    ['shirttype', `🏷️ ประเภทเสื้อ (${shirtTypes.length})`],
    ['price', 'ราคาคอเสื้อ'],
    ['promo', 'โปรโมชั่น'],
    ['ship', 'ค่าขนส่ง'],
  ] as const
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚙ จัดการประเภทสินค้า</div>
          <button className="btn-outline sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, flexWrap: 'wrap' }}>
          {TABS.map(([id, lbl]) => (
            <div key={id} className={`nav-item${tab === id ? ' active' : ''}`} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 12 }} onClick={() => setTab(id as any)}>{lbl}</div>
          ))}
        </div>
        {tab === 'collar' && <SupabaseTypeList table="collars" items={collars} setItems={setCollars} ph="เพิ่มประเภทคอเสื้อ..." notify={notify} />}
        {tab === 'prod' && <SupabaseTypeList table="product_types" items={prodTypes} setItems={setProdTypes} ph="เพิ่มประเภทสินค้า..." notify={notify} />}
        {tab === 'fabric' && <SupabaseTypeList table="fabric_types" items={fabricTypes} setItems={setFabricTypes as any} ph="เพิ่มประเภทเนื้อผ้า..." notify={notify} />}
        {tab === 'shirttype' && <ShirtTypeManager shirtTypes={shirtTypes} setShirtTypes={setShirtTypes} notify={notify} />}
        {tab === 'price' && <CollarPriceList collars={collars as CollarWithPrice[]} setCollars={setCollars as any} notify={notify} />}
        {tab === 'promo' && <PromotionList promotions={promotions} setPromotions={setPromotions} notify={notify} />}
        {tab === 'ship' && <ShippingList shippingRules={shippingRules} setShippingRules={setShippingRules} notify={notify} />}
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
    const { data } = await db.from(table).insert([{ name: nv.trim(), sort_order: items.length }]).select().single()
    if (data) { setItems((prev: any[]) => [...prev, data]); setNv(''); notify('เพิ่มสำเร็จ') }
  }
  const save = async (i: number) => {
    const item = items[i]
    await db.from(table).update({ name: ev }).eq('id', item.id)
    setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, name: ev } : x))
    setEi(null); notify('บันทึกแล้ว')
  }
  const del = async (i: number) => {
    await db.from(table).delete().eq('id', items[i].id)
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


/* ── Collar Price List ── */
function CollarPriceList({ collars, setCollars, notify }: {
  collars: CollarWithPrice[], setCollars: React.Dispatch<React.SetStateAction<any[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [editing, setEditing] = useState<Record<string, string>>({})
  const save = async (col: CollarWithPrice) => {
    const price = Number(editing[col.id] ?? col.price)
    await db.from('collars').update({ price }).eq('id', col.id)
    setCollars((prev: any[]) => prev.map((x) => x.id === col.id ? { ...x, price } : x))
    setEditing((prev) => { const n = { ...prev }; delete n[col.id]; return n })
    notify('บันทึกราคาแล้ว')
  }
  return (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>กำหนดราคาต่อตัวสำหรับแต่ละประเภทคอเสื้อ</div>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {collars.map((col) => (
          <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '7px 12px', borderRadius: 5 }}>
            <span style={{ flex: 1, fontSize: 13 }}>{col.name}</span>
            <input className="input-d" type="number" value={editing[col.id] ?? col.price ?? 0}
              onChange={(e) => setEditing((prev) => ({ ...prev, [col.id]: e.target.value }))}
              style={{ width: 90, textAlign: 'right' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>THB</span>
            <button className="btn-red sm" onClick={() => save(col)}>บันทึก</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Promotion List ── */
function PromotionList({ promotions, setPromotions, notify }: {
  promotions: Promotion[], setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const empty = { name: '', is_active: false, min_qty: 1, type: 'free', free_qty: 1, discount_qty: 1, discount_pct: 0, discount_thb: 0 }
  const [f, setF] = useState<Omit<Promotion,'id'|'sort_order'>>(empty)
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.name.trim()) return
    if (editId) {
      await db.from('promotions').update({ ...f, updated_at: new Date().toISOString() }).eq('id', editId)
      setPromotions((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x))
      notify('บันทึกโปรโมชั่นแล้ว')
    } else {
      const { data } = await db.from('promotions').insert([{ ...f, sort_order: promotions.length }]).select().single()
      if (data) { setPromotions((prev) => [...prev, data as Promotion]); notify('เพิ่มโปรโมชั่นแล้ว') }
    }
    setShowAdd(false); setEditId(null); setF(empty)
  }
  const del = async (id: string) => {
    await db.from('promotions').delete().eq('id', id)
    setPromotions((prev) => prev.filter((x) => x.id !== id)); notify('ลบแล้ว', 'err')
  }
  const toggleActive = async (p: Promotion) => {
    await db.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id)
    setPromotions((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  const TYPE_LABELS: Record<string,string> = { free: 'แถมฟรี', discount_qty: 'ลดจำนวนตัว', discount_pct: 'ลด %', discount_thb: 'ลดเป็นบาท' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>โปรโมชั่นที่ active จะนำมาคำนวณราคา</div>
        <button className="btn-red sm" onClick={() => { setShowAdd(true); setEditId(null); setF(empty) }}>+ เพิ่ม</button>
      </div>
      {(showAdd || editId) && (
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <div><div className="section-label">ชื่อโปรโมชั่น</div>
            <input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น โปร 15 ตัว แถม 1" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><div className="section-label">จำนวนขั้นต่ำ (ตัว)</div>
              <input className="input-d" type="number" value={f.min_qty} onChange={(e) => set('min_qty', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">ประเภทโปรโมชั่น</div>
              <select className="select-d" value={f.type} onChange={(e) => set('type', e.target.value)}>
                <option value="free">แถมฟรี (ตัว)</option>
                <option value="discount_qty">ลดจำนวน (ตัว)</option>
                <option value="discount_pct">ลด %</option>
                <option value="discount_thb">ลดเป็นบาท</option>
              </select>
            </div>
          </div>
          {f.type === 'free' && <div><div className="section-label">จำนวนแถมฟรี (ตัว)</div><input className="input-d" type="number" value={f.free_qty} onChange={(e) => set('free_qty', Number(e.target.value))} /></div>}
          {f.type === 'discount_qty' && <div><div className="section-label">ลดจำนวน (ตัว)</div><input className="input-d" type="number" value={f.discount_qty} onChange={(e) => set('discount_qty', Number(e.target.value))} /></div>}
          {f.type === 'discount_pct' && <div><div className="section-label">ลด (%)</div><input className="input-d" type="number" value={f.discount_pct} onChange={(e) => set('discount_pct', Number(e.target.value))} /></div>}
          {f.type === 'discount_thb' && <div><div className="section-label">ลด (บาท)</div><input className="input-d" type="number" value={f.discount_thb} onChange={(e) => set('discount_thb', Number(e.target.value))} /></div>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            <span style={{ fontSize: 13 }}>เปิดใช้งานโปรโมชั่นนี้</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-red sm" onClick={save}>💾 บันทึก</button>
            <button className="btn-outline sm" onClick={() => { setShowAdd(false); setEditId(null) }}>ยกเลิก</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {promotions.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 12px', borderRadius: 5, border: p.is_active ? '1px solid #c00' : '1px solid transparent' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>สั่ง {p.min_qty}+ ตัว · {TYPE_LABELS[p.type]}{p.type==='free'?` ${p.free_qty} ตัว`:p.type==='discount_qty'?` ${p.discount_qty} ตัว`:p.type==='discount_pct'?` ${p.discount_pct}%`:` ฿${p.discount_thb}`}</div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: p.is_active ? '#c00' : '#333', color: '#fff', cursor: 'pointer' }} onClick={() => toggleActive(p)}>{p.is_active ? 'เปิด' : 'ปิด'}</span>
            <button className="btn-outline sm" onClick={() => { setEditId(p.id); setShowAdd(false); setF({ name: p.name, is_active: p.is_active, min_qty: p.min_qty, type: p.type, free_qty: p.free_qty, discount_qty: p.discount_qty, discount_pct: p.discount_pct, discount_thb: p.discount_thb }) }}>แก้ไข</button>
            <button className="btn-ghost" onClick={() => del(p.id)}>ลบ</button>
          </div>
        ))}
        {promotions.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 20 }}>ยังไม่มีโปรโมชั่น</div>}
      </div>
    </div>
  )
}

/* ── Shipping List ── */
function ShippingList({ shippingRules, setShippingRules, notify }: {
  shippingRules: ShippingRule[], setShippingRules: React.Dispatch<React.SetStateAction<ShippingRule[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const empty = { name: '', min_qty: 0, max_qty: null as number | null, price: 0 }
  const [f, setF] = useState<{ name: string; min_qty: number; max_qty: number | null; price: number }>(empty)
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.name.trim()) return
    if (editId) {
      await db.from('shipping_rules').update({ ...f, updated_at: new Date().toISOString() }).eq('id', editId)
      setShippingRules((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x))
      notify('บันทึกแล้ว')
    } else {
      const { data } = await db.from('shipping_rules').insert([{ ...f, sort_order: shippingRules.length }]).select().single()
      if (data) { setShippingRules((prev) => [...prev, data as ShippingRule]); notify('เพิ่มช่องทางขนส่งแล้ว') }
    }
    setShowAdd(false); setEditId(null); setF(empty)
  }
  const del = async (id: string) => {
    await db.from('shipping_rules').delete().eq('id', id)
    setShippingRules((prev) => prev.filter((x) => x.id !== id)); notify('ลบแล้ว', 'err')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>ค่าขนส่ง 0 บาท = ไม่คิดค่าจัดส่ง</div>
        <button className="btn-red sm" onClick={() => { setShowAdd(true); setEditId(null); setF(empty) }}>+ เพิ่ม</button>
      </div>
      {(showAdd || editId) && (
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <div><div className="section-label">ชื่อช่องทาง</div>
            <input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น ขนส่งทั่วไป, รถไฟ EMS" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><div className="section-label">จำนวนขั้นต่ำ</div>
              <input className="input-d" type="number" value={f.min_qty} onChange={(e) => set('min_qty', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">จำนวนสูงสุด (ว่าง = ไม่จำกัด)</div>
              <input className="input-d" type="number" value={f.max_qty ?? ''} onChange={(e) => set('max_qty', e.target.value === '' ? null : Number(e.target.value))} placeholder="ไม่จำกัด" />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">ราคา (THB)</div>
              <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-red sm" onClick={save}>💾 บันทึก</button>
            <button className="btn-outline sm" onClick={() => { setShowAdd(false); setEditId(null) }}>ยกเลิก</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {shippingRules.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 12px', borderRadius: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.min_qty}{r.max_qty != null ? `–${r.max_qty}` : '+'} ตัว · ฿{Number(r.price).toLocaleString()}</div>
            </div>
            <button className="btn-outline sm" onClick={() => { setEditId(r.id); setShowAdd(false); setF({ name: r.name, min_qty: r.min_qty, max_qty: r.max_qty, price: r.price }) }}>แก้ไข</button>
            <button className="btn-ghost" onClick={() => del(r.id)}>ลบ</button>
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
                await db.from('customers').delete().eq('id', c.id)
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target?.result as string); r.readAsDataURL(file) })
}

/* ── Contact Modal ── */
function ContactModal({ onClose }: { onClose: () => void }) {
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.from('contact_settings').select('*').eq('id', 'main').single()
      .then(({ data }) => { if (data) setContact(data); setLoading(false) })
  }, [])

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              📞 ช่องทางการติดต่อ
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>สนใจสั่งซื้อ ติดต่อเราได้เลย</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>กำลังโหลด...</div>
          ) : !contact ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#ff6060' }}>ไม่สามารถโหลดข้อมูลได้</div>
          ) : (
            <>
              {/* Facebook */}
              {contact.facebook_url && (
                <a href={contact.facebook_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: '#1877f2', textDecoration: 'none', transition: 'opacity .15s' }}
                  onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Facebook Logo SVG */}
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="18" cy="18" r="18" fill="white"/>
                      <path d="M22.5 18H19.5V27H16.5V18H14.25V15.25H16.5V13.5C16.5 11.57 17.57 10 19.75 10H22.5V12.75H20.75C20.06 12.75 19.5 13.06 19.5 13.75V15.25H22.5L22.5 18Z" fill="#1877f2"/>
                    </svg>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{contact.facebook_label || 'Facebook Page'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>คลิกเพื่อไปยัง Facebook</div>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>→</span>
                </a>
              )}

              {/* Line + QR */}
              {contact.line_url && (
                <div style={{ borderRadius: 10, background: '#06c755', overflow: 'hidden' }}>
                  <a href={contact.line_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', textDecoration: 'none', transition: 'opacity .15s' }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Line Logo SVG */}
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="18" fill="white"/>
                        <path d="M28 17.16C28 12.12 22.63 8 16 8S4 12.12 4 17.16c0 4.51 4 8.3 9.4 9.02.37.08.87.24.99.55.11.28.07.72.04.1l-.16 1c-.05.28-.23 1.1 1 .6 1.2-.5 6.5-3.83 8.87-6.55A8.15 8.15 0 0028 17.16z" fill="#06c755"/>
                        <path d="M14.5 19.5h-2v-4.5h1v3.5h1v1zm1.5 0v-4.5h1v4.5h-1zm4.5 0h-1l-2-3v3h-1v-4.5h1l2 3v-3h1v4.5zm3.5 0h-3v-4.5h3v1h-2v.88h2v1h-2v.62h2v1z" fill="white"/>
                      </svg>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{contact.line_label || 'Line Official'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>คลิกเพื่อเพิ่มเพื่อนใน Line</div>
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>→</span>
                  </a>
                  {/* QR ใต้ปุ่ม Line */}
                  {contact.line_qr_url && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src={contact.line_qr_url} alt="Line QR" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>สแกน QR เพิ่มเพื่อน Line</div>
                        {contact.line_add && <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>ID: {contact.line_add}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phone */}
              {(contact.phone1 || contact.phone2) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {contact.phone1 && (
                    <a href={`tel:${contact.phone1}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'border-color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = '#c00')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                      <span style={{ fontSize: 20 }}>📱</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>โทรศัพท์</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone1}</div>
                      </div>
                    </a>
                  )}
                  {contact.phone2 && (
                    <a href={`tel:${contact.phone2}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'border-color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = '#c00')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                      <span style={{ fontSize: 20 }}>📱</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>โทรศัพท์</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone2}</div>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {/* Address */}
              {contact.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 20, marginTop: 2 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>ติดต่อที่หน้าร้าน</div>
                    <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{contact.address}</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Price Calculator ── */
function PriceCalculator({ shirts, collars, promotions, shippingRules, initShirtId, onClose }: {
  shirts: Shirt[], collars: CollarWithPrice[],
  promotions: Promotion[], shippingRules: ShippingRule[],
  initShirtId: string,
  onClose: () => void
}) {
  const [shirtId, setShirtId] = useState(initShirtId)
  const [useCollar, setUseCollar] = useState(false)
  const [collarId, setCollarId] = useState('')
  const [addPants, setAddPants] = useState(false)
  const [pantsId, setPantsId] = useState('')
  const [fabricId, setFabricId] = useState('')
  const [qty, setQty] = useState(1)
  const [shippingId, setShippingId] = useState('')
  const [promoChoice, setPromoChoice] = useState<'free'|'discount'|''>('')
  const [calculated, setCalculated] = useState(false)
  const [contact, setContact] = useState<any>(null)

  useEffect(() => {
    db.from('contact_settings').select('*').eq('id','main').single()
      .then(({ data }) => { if (data) setContact(data) })
  }, [])

  const reset = () => setCalculated(false)



  // เลือกแบบ
  const selectableShirts = shirts.filter((s) => s.category !== 'fabric' && s.category !== 'photo' && s.category !== 'promotion')
  const selectedShirt = selectableShirts.find((s) => s.id === shirtId)
  const shirtPrice = selectedShirt ? Number(selectedShirt.price) : 0

  // คอเสื้อ
  const shirtCollars = collars.filter((col) => !col.name.includes('กางเกง') && !col.name.includes('ปลอกแขน'))
  const collar = shirtCollars.find((col) => col.id === collarId)
  const collarPrice = (useCollar && collar) ? Number(collar.price) : 0

  // กางเกง
  const pantsCollars = collars.filter((col) => col.name.includes('กางเกง'))
  const defaultPants = pantsCollars.find((col) => col.name.includes('พิมพ์ลาย')) ?? pantsCollars[0]
  const activePantsId = pantsId || defaultPants?.id || ''
  const pants = pantsCollars.find((col) => col.id === activePantsId)
  const pantsPrice = (addPants && pants) ? Number(pants.price) : 0

  // เนื้อผ้า
  const fabricShirts = shirts.filter((s) => s.category === 'fabric')
  const fabric = fabricShirts.find((s) => s.id === fabricId)
  const fabricPrice = fabric ? Number(fabric.price) : 0

  // ขนส่ง
  const shipping = shippingRules.find((r) => r.id === shippingId)
  const shippingPrice = (shipping && Number(shipping.price) > 0) ? Number(shipping.price) : 0
  const isCustomShipping = shipping && Number(shipping.price) === 0 && shipping.name !== 'รับหน้าร้าน / นัดรับ'

  // โปรโมชั่น
  const activePromo = promotions.find((p) => p.is_active && qty >= p.min_qty)

  // สูตร
  const basePrice = useCollar ? collarPrice : shirtPrice
  const unitPrice = basePrice + fabricPrice
  let subtotal = (unitPrice * qty) + (pantsPrice * qty)
  let promoLabel = ''
  let promoValue = 0
  let bonusQty = 0

  if (activePromo && promoChoice) {
    if (promoChoice === 'free') {
      bonusQty = activePromo.free_qty
      promoLabel = `แถมฟรี ${bonusQty} ตัว`
    } else {
      if (activePromo.type === 'free' || activePromo.type === 'discount_qty') {
        const dq = activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty
        promoValue = unitPrice * dq
        promoLabel = `ลดเทียบเท่า ${dq} ตัว`
      } else if (activePromo.type === 'discount_pct') {
        promoValue = Math.round(subtotal * activePromo.discount_pct / 100)
        promoLabel = `ลด ${activePromo.discount_pct}%`
      } else if (activePromo.type === 'discount_thb') {
        promoValue = activePromo.discount_thb
        promoLabel = `ลด ฿${activePromo.discount_thb.toLocaleString()}`
      }
      subtotal = Math.max(0, subtotal - promoValue)
    }
  }

  const grandTotal = subtotal + shippingPrice

  const summaryLines = [
    '🧾 สนใจสั่งซื้อครับ — อีโวสปอร์ต',
    '─────────────────────',
    !useCollar && selectedShirt ? ('แบบ: ' + (selectedShirt?.name || '') + ' (฿' + shirtPrice.toLocaleString() + '/ตัว)') : null,
    useCollar && collar ? ('คอเสื้อ: ' + collar.name + ' (฿' + collarPrice.toLocaleString() + '/ตัว)') : null,
    fabricPrice > 0 && fabric ? ('เนื้อผ้า: ' + fabric.name + ' (+฿' + fabricPrice.toLocaleString() + '/ตัว)') : null,
    addPants && pants ? ('กางเกง: ' + pants.name + ' (฿' + pantsPrice.toLocaleString() + '/ตัว)') : null,
    'จำนวน: ' + qty + ' ตัว',
    promoChoice && activePromo ? ('โปรโมชั่น: ' + promoLabel + (promoChoice === 'free' ? ' (แถม ' + bonusQty + ' ตัว)' : ' (-฿' + promoValue.toLocaleString() + ')')) : null,
    shipping ? ('จัดส่ง: ' + shipping.name + (shippingPrice > 0 ? ' (฿' + shippingPrice.toLocaleString() + ')' : isCustomShipping ? ' (สอบถาม Admin)' : ' (ฟรี)')) : null,
    '─────────────────────',
    isCustomShipping ? ('รวม: ฿' + subtotal.toLocaleString() + ' (ยังไม่รวมขนส่ง)') : ('รวมทั้งหมด: ฿' + grandTotal.toLocaleString()),
    promoChoice === 'free' && bonusQty > 0 ? ('🎁 ร้านทำเสื้อให้ ' + (qty + bonusQty) + ' ตัว (สั่ง ' + qty + ' + แถม ' + bonusQty + ')') : null,
  ].filter(Boolean).join('\n') as string

    const saveAsImage = () => {
    const lines = summaryLines.split('\n')
    const W = 480, pad = 24, lineH = 28, titleH = 56
    const H = titleH + pad + lines.length * lineH + pad * 2 + 56
    const canvas = document.createElement('canvas')
    canvas.width = W * 2; canvas.height = H * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)

    // background
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)

    // header
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, '#cc0000')
    grad.addColorStop(1, '#880000')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, titleH)

    // title
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('📋 สรุปราคาเบื้องต้น — อีโวสปอร์ต', pad, 36)

    // summary lines
    let y = titleH + pad + 16
    lines.forEach((line, i) => {
      if (line.startsWith('─')) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath(); ctx.moveTo(pad, y - 8); ctx.lineTo(W - pad, y - 8); ctx.stroke()
        y += 4; return
      }
      const isTotal = line.startsWith('รวมทั้งหมด') || line.startsWith('รวม:')
      ctx.font = isTotal ? 'bold 18px sans-serif' : '13px sans-serif'
      ctx.fillStyle = isTotal ? '#ff4444' : 'rgba(255,255,255,0.85)'
      ctx.fillText(line, pad, y)
      y += isTotal ? lineH + 4 : lineH
    })

    // footer
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillText('* ราคาประมาณการ กรุณายืนยันราคาจริงกับทางร้าน', pad, H - 12)

    const link = document.createElement('a')
    link.download = 'สรุปราคา-evosport.jpeg'
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
  }



  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440, maxHeight: '92vh', padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', maxHeight: '92vh' }}>

          {/* Header — ซ่อนเมื่อคำนวณแล้ว */}
          {!calculated && (
            <>
              <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>🧮 คำนวณราคาเบื้องต้น</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {useCollar
                      ? addPants ? '((คอเสื้อ+ผ้า)×จำนวน)+(กางเกง×จำนวน)+ขนส่ง' : '((คอเสื้อ+ผ้า)×จำนวน)+ขนส่ง'
                      : addPants ? '((ราคา+ผ้า)×จำนวน)+(กางเกง×จำนวน)+ขนส่ง' : '((ราคา+ผ้า)×จำนวน)+ขนส่ง'}
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>

                {/* เลือกแบบ — read-only label */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>แบบที่เลือก</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: useCollar ? 'rgba(255,255,255,0.3)' : '#fff' }}>
                    {selectedShirt ? selectedShirt.name : 'ไม่ได้เลือกแบบ'}
                  </div>
                  {!useCollar && Number(shirtPrice) > 0 && (
                    <div style={{ fontSize: 12, color: '#ff4444', marginTop: 2 }}>฿{shirtPrice.toLocaleString()}/ตัว</div>
                  )}
                  {useCollar && (
                    <div style={{ fontSize: 11, color: '#ffaa44', marginTop: 4 }}>
                      ⚠️ ราคาจากแบบนี้ถูกแทนที่ด้วยคอเสื้อที่เลือก
                    </div>
                  )}
                </div>

                {/* เปลี่ยนคอเสื้อ */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={useCollar}
                      onChange={(e) => { setUseCollar(e.target.checked); setCollarId(''); reset() }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>เปลี่ยนคอเสื้อ</div>
                      {!useCollar && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>ใช้ราคาจากคอเสื้อที่เลือกแทน</div>}
                    </div>
                  </label>
                  {useCollar && (
                    <div style={{ marginTop: 10 }}>
                      <select className="select-d" value={collarId} onChange={(e) => { setCollarId(e.target.value); reset() }}>
                        <option value="">— เลือกประเภทคอเสื้อ —</option>
                        {shirtCollars.map((col) => (
                          <option key={col.id} value={col.id}>{col.name}{Number(col.price) > 0 ? ` (฿${Number(col.price).toLocaleString()})` : ' (ยังไม่กำหนดราคา)'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* เพิ่มกางเกง */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={addPants}
                      onChange={(e) => { setAddPants(e.target.checked); reset() }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>เพิ่มกางเกงพิมพ์ลาย</div>
                      {!addPants && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>บวกราคากางเกงต่อตัว</div>}
                    </div>
                  </label>
                  {addPants && (
                    <div style={{ marginTop: 10 }}>
                      <select className="select-d" value={activePantsId} onChange={(e) => { setPantsId(e.target.value); reset() }}>
                        {pantsCollars.map((col) => (
                          <option key={col.id} value={col.id}>{col.name}{Number(col.price) > 0 ? ` (฿${Number(col.price).toLocaleString()})` : ' (ยังไม่กำหนดราคา)'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* เนื้อผ้า */}
                <div>
                  <div className="section-label">เนื้อผ้า</div>
                  <select className="select-d" value={fabricId} onChange={(e) => { setFabricId(e.target.value); reset() }}>
                    <option value="">ไมโครเรียบ (ไม่บวกเพิ่ม)</option>
                    {fabricShirts.filter((s) => Number(s.price) > 0).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (+฿{Number(s.price).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                {/* จำนวน */}
                <div>
                  <div className="section-label">จำนวน (ตัว)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-outline sm" onClick={() => { setQty((q) => Math.max(1, q - 1)); reset() }}>−</button>
                    <input className="input-d" type="number" min={1} value={qty}
                      onChange={(e) => { setQty(Math.max(1, Number(e.target.value))); reset() }}
                      style={{ width: 80, textAlign: 'center' }} />
                    <button className="btn-outline sm" onClick={() => { setQty((q) => q + 1); reset() }}>+</button>
                  </div>
                </div>

                {/* โปรโมชั่น */}
                {activePromo && (
                  <div style={{ background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 12, color: '#ff6060', fontWeight: 700, marginBottom: 8 }}>🎉 {activePromo.name} — สั่ง {activePromo.min_qty}+ ตัว</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {activePromo.type === 'free' && (
                        <button className={promoChoice === 'free' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                          onClick={() => { setPromoChoice('free'); reset() }}>
                          แถมฟรี {activePromo.free_qty} ตัว
                        </button>
                      )}
                      <button className={promoChoice === 'discount' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                        onClick={() => { setPromoChoice('discount'); reset() }}>
                        {activePromo.type === 'free' || activePromo.type === 'discount_qty'
                          ? `รับส่วนลด ${activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty} ตัว`
                          : activePromo.type === 'discount_pct' ? `ลด ${activePromo.discount_pct}%`
                          : `ลด ฿${activePromo.discount_thb.toLocaleString()}`}
                      </button>
                      <button className={promoChoice === '' ? 'btn-outline sm' : 'btn-ghost'} style={{ flex: 0.6 }}
                        onClick={() => { setPromoChoice(''); reset() }}>ไม่ใช้</button>
                    </div>
                  </div>
                )}

                {/* ขนส่ง */}
                <div>
                  <div className="section-label">ช่องทางจัดส่ง</div>
                  <select className="select-d" value={shippingId} onChange={(e) => { setShippingId(e.target.value); reset() }}>
                    <option value="">— เลือกช่องทาง —</option>
                    {shippingRules.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} {Number(r.price) > 0 ? `(฿${Number(r.price).toLocaleString()})` : r.name === 'รับหน้าร้าน / นัดรับ' ? '(ฟรี)' : '(สอบถาม Admin)'}</option>
                    ))}
                  </select>
                  {isCustomShipping && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#ffaa44', background: 'rgba(255,170,68,0.08)', border: '1px solid rgba(255,170,68,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                      ⚠️ ช่องการจัดส่งนอกจากที่มีให้เลือก รบกวนสอบถาม Admin
                    </div>
                  )}
                </div>

                {/* ปุ่มคำนวณ */}
                <button className="btn-red" style={{ width: '100%', padding: '12px', fontSize: 15 }}
                  onClick={() => setCalculated(true)}>
                  🧮 คำนวณ
                </button>
              </div>
            </>
          )}

          {/* ผลลัพธ์ — แสดงเมื่อคำนวณแล้ว */}
          {calculated && (
            <div style={{ padding: '16px 20px' }}>
              {/* ปุ่มปิด */}
              <div style={{ background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '8px 8px 0 0', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>📋 สรุปราคาเบื้องต้น</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => reset()}>← แก้ไข</button>
                  <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </div>
              </div>

              <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 0 10px 10px', padding: '14px 16px', display: 'grid', gap: 8 }}>
                {([
                  !useCollar && ['แบบที่เลือก', selectedShirt ? `${selectedShirt.name} (฿${shirtPrice.toLocaleString()}/ตัว)` : 'เลือกตามแบบ (฿0)'],
                  useCollar && collar && ['คอเสื้อ', `${collar.name} (฿${collarPrice.toLocaleString()}/ตัว)`],
                  fabricPrice > 0 && ['เนื้อผ้า', `+฿${fabricPrice.toLocaleString()}/ตัว`],
                  addPants && pants && ['กางเกงพิมพ์ลาย', `${pants.name} (฿${pantsPrice.toLocaleString()}/ตัว)`],
                  [`รวม/ตัว × ${qty}`, `฿${unitPrice.toLocaleString()}${addPants ? ` + ฿${pantsPrice.toLocaleString()}` : ''} × ${qty} = ฿${(unitPrice * qty + pantsPrice * qty).toLocaleString()}`],
                  promoChoice && activePromo && ['โปรโมชั่น', promoChoice === 'free' ? `🎁 +${bonusQty} ตัวฟรี` : `-฿${promoValue.toLocaleString()}`],
                  ['ค่าขนส่ง', isCustomShipping ? 'สอบถาม Admin' : shippingPrice > 0 ? `+฿${shippingPrice.toLocaleString()}` : shipping ? 'ฟรี' : 'ยังไม่เลือก'],
                ] as any[]).filter(Boolean).map(([label, val]: [string, string]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                    <span style={{ color: String(val).startsWith('-') ? '#6fdf6f' : String(val).startsWith('🎁') ? '#ff6060' : '#fff' }}>{val}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 22, color: '#ff4444' }}>
                  <span>รวมทั้งหมด</span>
                  <span>{isCustomShipping ? `฿${subtotal.toLocaleString()} + ขนส่ง` : `฿${grandTotal.toLocaleString()}`}</span>
                </div>
                {promoChoice === 'free' && bonusQty > 0 && (
                  <div style={{ background: 'rgba(200,0,0,0.1)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#ff6060' }}>
                    🎁 ร้านจะทำเสื้อให้ {qty + bonusQty} ตัว (สั่ง {qty} + แถม {bonusQty})
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#ff4444' }}>*ราคาประมาณการ กรุณายืนยันราคาจริงกับทางร้านหรือ Admin</div>

                {/* ช่องทางติดต่อ */}
                <div id="summary-card-inner" style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                  <button
                    onClick={saveAsImage}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8, background: '#2d2d2d', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, width: '100%' }}>
                    💾 บันทึกสรุปราคา
                  </button>
                  {contact?.facebook_url && (
                    <a href={contact.facebook_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8, background: '#1877f2', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      📘 สนใจสั่งซื้อ ผ่าน Facebook
                    </a>
                  )}
                  {contact?.line_url && (
                    <a href={contact.line_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8, background: '#06c755', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      💬 สนใจสั่งซื้อ ผ่าน Line{contact.line_add ? ` (@${contact.line_add.replace('@','')})` : ''}
                    </a>
                  )}
                  {contact?.phone1 && (
                    <a href={`tel:${contact.phone1}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 8, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)', color: '#ffaa44', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      📱 โทร {contact.phone1}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Contact Admin Modal ── */
function ContactAdminModal({ notify, onClose }: {
  notify: (m: string, t?: 'ok' | 'err') => void
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    facebook_url: '',
    facebook_label: '',
    line_url: '',
    line_label: '',
    line_add: '',
    line_qr_url: '',
    phone1: '',
    phone2: '',
    address: '',
  })
  const qrInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    db.from('contact_settings').select('*').eq('id', 'main').single()
      .then(({ data }) => {
        if (data) setF({
          facebook_url: data.facebook_url || '',
          facebook_label: data.facebook_label || '',
          line_url: data.line_url || '',
          line_label: data.line_label || '',
          line_add: data.line_add || '',
          line_qr_url: data.line_qr_url || '',
          phone1: data.phone1 || '',
          phone2: data.phone2 || '',
          address: data.address || '',
        })
        setLoading(false)
      })
  }, [])

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  const handleQrUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = await uploadBase64Image(await fileToBase64(file), 'contact')
    if (url) { set('line_qr_url', url); notify('อัปโหลด QR สำเร็จ') }
    else notify('อัปโหลดไม่สำเร็จ', 'err')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('contact_settings')
      .upsert({ id: 'main', ...f, updated_at: new Date().toISOString() })
    if (error) notify('บันทึกไม่สำเร็จ: ' + error.message, 'err')
    else { notify('บันทึกข้อมูลติดต่อแล้ว ✓'); onClose() }
    setSaving(false)
  }

  const inp: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff', padding: '8px 10px', borderRadius: 6,
    fontFamily: 'inherit', fontSize: 13, width: '100%',
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📞 จัดการช่องทางติดต่อ</div>
          <button className="btn-outline sm" onClick={onClose}>✕ ปิด</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Facebook */}
            <div style={{ background: '#1877f2', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="white"/><path d="M13.5 11H11.8V17H9.8V11H8.5V9.2H9.8V8.2C9.8 6.7 10.6 5.8 12.2 5.8H13.5V7.6H12.6C12.1 7.6 11.8 7.8 11.8 8.3V9.2H13.5L13.5 11Z" fill="#1877f2"/></svg>
                Facebook
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div className="section-label">ชื่อที่แสดง</div>
                  <input style={inp} value={f.facebook_label} onChange={e => set('facebook_label', e.target.value)} placeholder="เช่น Facebook Page" />
                </div>
                <div>
                  <div className="section-label">Facebook URL (m.me/...)</div>
                  <input style={inp} value={f.facebook_url} onChange={e => set('facebook_url', e.target.value)} placeholder="https://m.me/..." />
                </div>
              </div>
            </div>

            {/* Line */}
            <div style={{ background: '#06c755', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="white"/><path d="M17 10.4C17 7.4 14 5 11 5S5 7.4 5 10.4c0 2.7 2.4 5 5.6 5.4.2 0 .5.1.6.3.1.2 0 .4 0 .1l-.1.6c0 .2-.1.7.6.4.7-.3 3.9-2.3 5.3-3.9A5 5 0 0017 10.4z" fill="#06c755"/><path d="M9.5 11.8H8V9H9v2h.5v.8zm1 0V9h1v2.8h-1zm3 0h-.6L11.8 10v1.8h-1V9h.6l1.1 1.8V9h1v2.8zm2 0h-1.8V9h1.8v.7h-1v.4h1v.7h-1v.4h1v.6z" fill="white"/></svg>
                Line
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div className="section-label">ชื่อที่แสดง</div>
                  <input style={inp} value={f.line_label} onChange={e => set('line_label', e.target.value)} placeholder="เช่น Line Official" />
                </div>
                <div>
                  <div className="section-label">Line URL (lin.ee/...)</div>
                  <input style={inp} value={f.line_url} onChange={e => set('line_url', e.target.value)} placeholder="https://lin.ee/..." />
                </div>
                <div>
                  <div className="section-label">Line ID</div>
                  <input style={inp} value={f.line_add} onChange={e => set('line_add', e.target.value)} placeholder="@xxxxxxxx" />
                </div>
                <div>
                  <div className="section-label">Line QR Code</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {f.line_qr_url && (
                      <img src={f.line_qr_url} alt="QR" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <input style={{ ...inp, marginBottom: 6 }} value={f.line_qr_url} onChange={e => set('line_qr_url', e.target.value)} placeholder="URL รูป QR หรืออัปโหลด..." />
                      <button className="btn-outline sm" onClick={() => qrInputRef.current?.click()}>📷 อัปโหลด QR</button>
                    </div>
                  </div>
                  <input ref={qrInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleQrUpload(e.target.files[0]); e.target.value = '' }} />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div style={{ background: '#c00', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="white"/><path d="M14.5 13.5l-1.3 1.3c-2-.5-3.7-2.1-4.2-4.1L10.3 9.4a.5.5 0 000-.7L8.6 7a.5.5 0 00-.7 0L6.5 8.4C6.2 11.7 9.2 15 12.6 14.5l1.3-1.3a.5.5 0 000-.7z" fill="#c00"/></svg>
                เบอร์โทรศัพท์
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div className="section-label">เบอร์ที่ 1</div>
                  <input style={inp} value={f.phone1} onChange={e => set('phone1', e.target.value)} placeholder="0xx-xxx-xxxx" />
                </div>
                <div>
                  <div className="section-label">เบอร์ที่ 2</div>
                  <input style={inp} value={f.phone2} onChange={e => set('phone2', e.target.value)} placeholder="0xx-xxx-xxxx" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>📍 ที่อยู่หน้าร้าน</div>
              <textarea
                style={{ ...inp, minHeight: 70, resize: 'vertical' as const }}
                value={f.address}
                onChange={e => set('address', e.target.value)}
                placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              />
            </div>

            {/* Save Button */}
            <button className="btn-red" style={{ width: '100%', padding: '12px' }} disabled={saving} onClick={handleSave}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกข้อมูลติดต่อ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Welcome Modal ── */
function WelcomeModal({ shopSettings, onBrowse, onAdmin }: {
  shopSettings: { shop_name: string; shop_subtitle: string; logo_url: string | null }
  onBrowse: () => void
  onAdmin: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '36px 28px', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Logo */}
        <div style={{ marginBottom: 20 }}>
          {shopSettings.logo_url ? (
            <img src={shopSettings.logo_url} alt="logo"
              style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(200,0,0,0.5)', margin: '0 auto' }} />
          ) : (
            <div style={{ width: 90, height: 90, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 36, color: '#fff', margin: '0 auto' }}>S</div>
          )}
        </div>
        {/* Name */}
        <div style={{ fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 8 }}>
          {shopSettings.shop_name || 'อีโวสปอร์ต'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
          {shopSettings.shop_subtitle || 'รวมแบบเสื้อและสินค้าทั้งหมด'}
        </div>
        {/* Buttons */}
        <button onClick={onBrowse}
          style={{ width: '100%', background: '#c00', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          👕 เข้าชมแบบเสื้อ
        </button>
        <button onClick={onAdmin}
          style={{ width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', padding: '13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          🔐 เข้าสู่ระบบ Admin
        </button>
      </div>
    </div>
  )
}

/* ── Shop Admin Modal ── */
function ShopAdminModal({ shopSettings, setShopSettings, notify, onClose }: {
  shopSettings: { id: string; shop_name: string; shop_subtitle: string; logo_url: string | null }
  setShopSettings: React.Dispatch<React.SetStateAction<any>>
  notify: (m: string, t?: 'ok' | 'err') => void
  onClose: () => void
}) {
  const [name, setName] = useState(shopSettings.shop_name || '')
  const [subtitle, setSubtitle] = useState(shopSettings.shop_subtitle || '')
  const [logoUrl, setLogoUrl] = useState(shopSettings.logo_url || '')
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = await uploadBase64Image(await fileToBase64(file), 'logos')
    if (url) { setLogoUrl(url); notify('อัปโหลดโลโก้สำเร็จ') }
    else notify('อัปโหลดไม่สำเร็จ', 'err')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await db.from('shop_settings').upsert({
      id: 'main', shop_name: name, shop_subtitle: subtitle, logo_url: logoUrl || null, updated_at: new Date().toISOString()
    })
    if (error) { notify('บันทึกไม่สำเร็จ: ' + error.message, 'err') }
    else {
      setShopSettings((p: any) => ({ ...p, shop_name: name, shop_subtitle: subtitle, logo_url: logoUrl || null }))
      notify('บันทึกหน้าต้อนรับแล้ว ✓')
      onClose()
    }
    setSaving(false)
  }

  const inp: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.13)',
    color: '#f5f5f5', padding: '8px 10px', borderRadius: 6,
    fontFamily: 'inherit', fontSize: 13, width: '100%',
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🏪 แก้ไขหน้าต้อนรับ</div>
          <button className="btn-outline sm" onClick={onClose}>✕ ปิด</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div className="section-label" style={{ textAlign: 'left', marginBottom: 8 }}>โลโก้ร้าน</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,0,0,0.4)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, color: '#fff', flexShrink: 0 }}>S</div>
              )}
              <div style={{ flex: 1 }}>
                <input style={{ ...inp, marginBottom: 6 }} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL โลโก้ หรืออัปโหลด..." />
                <button className="btn-outline sm" onClick={() => logoInputRef.current?.click()}>📷 อัปโหลดโลโก้</button>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); e.target.value = '' }} />
          </div>

          {/* Shop Name */}
          <div>
            <div className="section-label">ชื่อร้าน</div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อร้าน" />
          </div>

          {/* Subtitle */}
          <div>
            <div className="section-label">คำอธิบายใต้ชื่อร้าน</div>
            <input style={inp} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="รวมแบบเสื้อและสินค้าทั้งหมด" />
          </div>

          {/* Preview */}
          <div style={{ background: '#0d0d0d', borderRadius: 10, padding: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 12, letterSpacing: 1 }}>PREVIEW</div>
            {logoUrl ? (
              <img src={logoUrl} alt="preview" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
            ) : (
              <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#fff', margin: '0 auto 8px' }}>S</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 }}>{name || 'ชื่อร้าน'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle || 'คำอธิบาย'}</div>
          </div>

          <button className="btn-red" style={{ width: '100%', padding: '12px' }} disabled={saving} onClick={handleSave}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกหน้าต้อนรับ'}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ── ShirtTypeManager — จัดการประเภทเสื้อใน SettingsModal ── */
const EMOJI_PICKS = ['⚽','🏀','🏐','🏈','🎾','🏸','🏃','🚴','🧗','🏊','🏫','🎓','🏢','🏛️','🏭','👔','👕','🧥','🥼','🦺','🐓','🐟','🚗','🏎️','✈️','👥','🤝','👑','🌟','✨','🏆','🥇','🔥','💎']

function ShirtTypeManager({ shirtTypes, setShirtTypes, notify }: {
  shirtTypes: ShirtType[], setShirtTypes: React.Dispatch<React.SetStateAction<ShirtType[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newIcon, setNewIcon] = useState('👕')
  const [showPicker, setShowPicker] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const sortTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveOrder = (list: ShirtType[]) => {
    if (sortTimer.current) clearTimeout(sortTimer.current)
    sortTimer.current = setTimeout(async () => {
      for (let i = 0; i < list.length; i++) {
        await db.from('shirt_types').update({ sort_order: i }).eq('id', list[i].id)
      }
      notify('บันทึกลำดับแล้ว')
    }, 600)
  }

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= shirtTypes.length) return
    const arr = [...shirtTypes]
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    setShirtTypes(arr)
    saveOrder(arr)
  }

  const handleDragOver = (overId: string) => {
    if (!dragId || dragId === overId) return
    setDragOverId(overId)
    setShirtTypes(prev => {
      const arr = [...prev]
      const from = arr.findIndex(t => t.id === dragId)
      const to = arr.findIndex(t => t.id === overId)
      if (from === -1 || to === -1) return prev
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr
    })
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
    saveOrder(shirtTypes)
  }

  const handleAdd = async () => {
    if (!newName.trim() || !newSlug.trim()) { notify('กรุณากรอกชื่อและ slug', 'err'); return }
    setSaving(true)
    const { data, error } = await db.from('shirt_types').insert([{ name: newName.trim(), slug: newSlug.trim(), icon: newIcon, sort_order: shirtTypes.length }]).select().single()
    if (error) notify('เพิ่มไม่สำเร็จ: ' + error.message, 'err')
    else { setShirtTypes(prev => [...prev, data as ShirtType]); setNewName(''); setNewSlug(''); setNewIcon('👕'); notify('เพิ่มประเภทเสื้อสำเร็จ') }
    setSaving(false)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setSaving(true)
    const { data, error } = await db.from('shirt_types').update({ name: editName, slug: editSlug, icon: editIcon }).eq('id', editId).select().single()
    if (error) notify('บันทึกไม่สำเร็จ', 'err')
    else { setShirtTypes(prev => prev.map(t => t.id === editId ? data as ShirtType : t)); setEditId(null); notify('บันทึกสำเร็จ') }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบ "${name}"?`)) return
    await db.from('shirt_types').delete().eq('id', id)
    setShirtTypes(prev => prev.filter(t => t.id !== id))
    notify('ลบสำเร็จ', 'err')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Add Form */}
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#c00', fontWeight: 700 }}>+ เพิ่มประเภทเสื้อใหม่</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowPicker(!showPicker)} style={{ fontSize: 22, background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>{newIcon}</button>
            {showPicker && (
              <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 999, background: '#111', border: '1px solid #222', borderRadius: 8, padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4, width: 220 }}>
                {EMOJI_PICKS.map(e => (
                  <button key={e} onClick={() => { setNewIcon(e); setShowPicker(false) }} style={{ fontSize: 18, background: newIcon === e ? '#c00' : '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <input className="input-d" style={{ flex: 1, minWidth: 120 }} placeholder="ชื่อประเภท เช่น เสื้อบอล" value={newName}
            onChange={e => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g,'-').replace(/^-|-$/g,'')) }} />
          <input className="input-d" style={{ flex: 1, minWidth: 100 }} placeholder="slug: football" value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))} />
          <button className="btn-red sm" disabled={saving} onClick={handleAdd}>+ เพิ่ม</button>
        </div>
      </div>

      {/* hint */}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>☰</span> ลากเพื่อเรียงลำดับ &nbsp;|&nbsp; ปุ่ม ↑↓ สำหรับมือถือ
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
        {shirtTypes.map((type, idx) => (
          <div
            key={type.id}
            draggable
            onDragStart={() => setDragId(type.id)}
            onDragOver={e => { e.preventDefault(); handleDragOver(type.id) }}
            onDragEnd={handleDragEnd}
            style={{
              background: '#0d0d0d',
              border: dragOverId === type.id ? '1px dashed #c00' : '1px solid #1a1a1a',
              borderRadius: 8,
              padding: '10px 12px',
              opacity: dragId === type.id ? 0.4 : 1,
              cursor: 'grab',
              transition: 'opacity 0.15s, border 0.15s',
            }}
          >
            {editId === type.id ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="input-d" style={{ width: 46, textAlign: 'center', fontSize: 18, padding: '4px' }} value={editIcon} onChange={e => setEditIcon(Array.from(e.target.value).slice(0,2).join(''))} maxLength={4} title="พิมพ์ emoji" />
                <input className="input-d" style={{ flex: 1, minWidth: 100 }} value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่อ" />
                <input className="input-d" style={{ flex: 1, minWidth: 80 }} value={editSlug} onChange={e => setEditSlug(e.target.value)} placeholder="slug" />
                <button className="btn-red sm" disabled={saving} onClick={handleSaveEdit}>💾 บันทึก</button>
                <button className="btn-outline sm" onClick={() => setEditId(null)}>ยกเลิก</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {/* drag handle + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, cursor: 'grab', userSelect: 'none' }}>⠿</span>
                  <span style={{ fontSize: 20 }}>{type.icon || '👕'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{type.name}</div>
                    <div style={{ fontSize: 10, color: '#555' }}>slug: {type.slug} · ลำดับ {idx + 1}</div>
                  </div>
                </div>
                {/* actions */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {/* ↑↓ สำหรับมือถือ */}
                  <button
                    className="btn-outline sm"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, idx - 1)}
                    style={{ padding: '4px 8px', opacity: idx === 0 ? 0.3 : 1 }}
                    title="เลื่อนขึ้น"
                  >↑</button>
                  <button
                    className="btn-outline sm"
                    disabled={idx === shirtTypes.length - 1}
                    onClick={() => moveItem(idx, idx + 1)}
                    style={{ padding: '4px 8px', opacity: idx === shirtTypes.length - 1 ? 0.3 : 1 }}
                    title="เลื่อนลง"
                  >↓</button>
                  <button className="btn-outline sm" onClick={() => { setEditId(type.id); setEditName(type.name); setEditSlug(type.slug); setEditIcon(type.icon || '👕') }}>✏</button>
                  <button className="btn-ghost sm" onClick={() => handleDelete(type.id, type.name)}>✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
