'use client'
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, uploadBase64Image, deleteImage, logDeletion } from '@/lib/supabase'
import type { Shirt, Banner, Collar, ProductType, Customer } from '@/lib/supabase'

type ShopSettings = { id: string; shop_name: string; shop_subtitle: string; logo_url: string | null }
type FabricType = { id: string; name: string; sort_order: number }
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
  { id: 'new', label: 'เนเธเธเน€เธชเธทเนเธญเนเธซเธกเน', badge: 'New' },
  { id: 'collar', label: 'เธเธญเน€เธชเธทเนเธญเธ—เธฑเนเธเธซเธกเธ”' },
  { id: 'promotion', label: 'เนเธเธฃเนเธกเธเธฑเนเธ' },
  { id: 'other', label: 'เนเธเธเน€เธชเธทเนเธญเธญเธทเนเธเน' },
  { id: 'fabric', label: 'เน€เธเธทเนเธญเธเนเธฒ' },
  { id: 'photo', label: 'เธ เธฒเธเธ–เนเธฒเธขเธเธฒเธเธเธฃเธดเธ' },
  { id: 'all', label: 'เธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”' },
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

  const [editShirt, setEditShirt] = useState<Shirt | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCustMgr, setShowCustMgr] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [showShopAdmin, setShowShopAdmin] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [shopSettings, setShopSettings] = useState<ShopSettings>({ id: 'main', shop_name: 'เธญเธตเนเธงเธชเธเธญเธฃเนเธ•', shop_subtitle: 'เธฃเธงเธกเนเธเธเน€เธชเธทเนเธญเนเธฅเธฐเธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”', logo_url: null })
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
      const [{ data: b }, { data: s }, { data: c }, { data: p }, { data: cu }, { data: ft }, { data: promo }, { data: ship }] =
        await Promise.all([
          supabase.from('banners').select('*').order('sort_order'),
          supabase.from('shirts').select('*').order('sort_order').order('created_at', { ascending: false }),
          supabase.from('collars').select('*').order('sort_order'),
          supabase.from('product_types').select('*').order('sort_order'),
          supabase.from('customers').select('*').order('joined_at', { ascending: false }),
          supabase.from('fabric_types').select('*').order('sort_order'),
          supabase.from('promotions').select('*').order('sort_order'),
          supabase.from('shipping_rules').select('*').order('sort_order'),
        ])
      const { data: ss } = await supabase.from('shop_settings').select('*').eq('id', 'main').single()
      if (b) setBanners(b)
      if (s) setShirts(s)
      if (c) setCollars(c)
      if (p) setProdTypes(p)
      if (cu) setCustomers(cu)
      if (ft) setFabricTypes(ft as FabricType[])
      if (promo) setPromotions(promo as Promotion[])
      if (ship) setShippingRules(ship as ShippingRule[])
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
  })

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
        await supabase.from('shirts').update({ sort_order: u.sort_order }).eq('id', u.id)
      }
      notify('เธเธฑเธเธ—เธถเธเธฅเธณเธ”เธฑเธเนเธฅเนเธง')
    }, 800)
  }

  if (!ready) return <LoadingScreen />
  if (view === 'admin-login') return (
    <AdminLogin onLogin={(u) => { setAdminUser(u); setView('front'); notify(`เธขเธดเธเธ”เธตเธ•เนเธญเธเธฃเธฑเธ Admin: ${u}`) }}
      onBack={() => setView('front')} />
  )
  if (view === 'cust-login') return (
    <CustLogin customers={customers} onLogin={(u) => { setCustUser(u); setView('front'); notify(`เธขเธดเธเธ”เธตเธ•เนเธญเธเธฃเธฑเธ ${u.name}`) }}
      onBack={() => setView('front')} onReg={() => setView('register')} />
  )
  if (view === 'register') return (
    <Register onSave={async (data) => {
      const { data: newCust, error } = await supabase.from('customers').insert([data]).select().single()
      if (error) { notify('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message, 'err'); return }
      setCustomers((prev) => [newCust, ...prev])
      setView('cust-login')
      notify('เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธชเธณเน€เธฃเนเธ')
    }} onBack={() => setView('cust-login')} customers={customers} />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'ok' ? '#0c2210' : '#220c0c', border: `1px solid ${toast.type === 'ok' ? '#266626' : '#c00'}`, color: toast.type === 'ok' ? '#6fdf6f' : '#ff8080', padding: '11px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'ok' ? 'โ“' : 'โ•'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff' }}>S</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>เธฃเธงเธกเนเธเธเน€เธชเธทเนเธญเนเธฅเธฐเธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”</div>
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
                <button className="btn-outline sm" onClick={() => setShowCustMgr(!showCustMgr)}>{showCustMgr ? 'โ เธเธฅเธฑเธ' : `เธชเธกเธฒเธเธดเธ (${customers.length})`}</button>
                <button className="btn-outline sm" onClick={() => { setAdminUser(null); setShowCustMgr(false); notify('เธญเธญเธเธเธฒเธเธฃเธฐเธเธเนเธฅเนเธง', 'err') }}>เธญเธญเธ</button>
              </>
            ) : custUser ? (
              <>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>๐‘ค {custUser.name}</span>
                <button className="btn-outline sm" onClick={() => { setCustUser(null); notify('เธญเธญเธเธเธฒเธเธฃเธฐเธเธเนเธฅเนเธง', 'err') }}>เธญเธญเธ</button>
              </>
            ) : (
              <>
                <button className="btn-outline sm" onClick={() => setView('cust-login')}>เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</button>
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
                <div key={n.id} className={`nav-item${activeNav === n.id ? ' active' : ''}`} onClick={() => setActiveNav(n.id)}>
                  {n.label}
                  {n.badge && <span style={{ display: 'inline-block', background: '#c00', color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700, marginLeft: 6, verticalAlign: 'middle' }}>{n.badge}</span>}
                </div>
              ))}
            </div>
          </div>

          {adminUser && (
            <div style={{ background: 'rgba(200,0,0,0.07)', borderBottom: '1px solid rgba(200,0,0,0.18)', padding: '9px 20px' }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#ff6060', fontWeight: 700 }}>โ Admin Mode โ€” เธเธฑเธเธ—เธถเธเธชเธนเน Supabase เธญเธฑเธ•เนเธเธกเธฑเธ•เธด</span>
                {activeNav === 'new' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเนเธเธเน€เธชเธทเนเธญเนเธซเธกเน</button>}
                {activeNav === 'collar' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเธเธญเน€เธชเธทเนเธญ</button>}
                {activeNav === 'promotion' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเนเธเธฃเนเธกเธเธฑเนเธ</button>}
                {activeNav === 'other' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธซเธกเน</button>}
                {activeNav === 'fabric' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเน€เธเธทเนเธญเธเนเธฒ</button>}
                {activeNav === 'photo' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเธฃเธนเธเธ เธฒเธ</button>}
                {activeNav === 'all' && <button className="btn-red sm" onClick={() => setShowAdd(true)}>+ เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธซเธกเน</button>}
                <button className="btn-outline sm" onClick={() => setShowSettings(true)}>เธเธฑเธ”เธเธฒเธฃเธเธฃเธฐเน€เธ เธ—</button>
                <button className="btn-outline sm" onClick={() => setShowContactAdmin(true)}>๐“ เธเนเธญเธเธ—เธฒเธเธ•เธดเธ”เธ•เนเธญ</button>
                <button className="btn-outline sm" onClick={() => setShowShopAdmin(true)}>๐ช เธซเธเนเธฒเธ•เนเธญเธเธฃเธฑเธ</button>
                <a href={`/export?admin=${encodeURIComponent(adminUser || '')}`} style={{ background: 'transparent', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: 5, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .18s' }}
                  onMouseOver={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor='#c00'; (e.currentTarget as HTMLAnchorElement).style.color='#c00' }}
                  onMouseOut={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor='rgba(255,255,255,0.22)'; (e.currentTarget as HTMLAnchorElement).style.color='#f5f5f5' }}>
                  ๐“ฅ Export เธ เธฒเธ
                </a>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginLeft: 'auto' }}>
                  เธ—เธฑเนเธเธซเธกเธ” {shirts.length} | เนเธชเธ”เธ {filtered.length} เธฃเธฒเธขเธเธฒเธฃ
                </span>
              </div>
            </div>
          )}

          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 20px' }}>
            {canDrag && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>โฐ</span> เธเธ”เธเนเธฒเธเธ—เธตเนเธเธฒเธฃเนเธ”เนเธฅเนเธงเธฅเธฒเธเน€เธเธทเนเธญเน€เธฃเธตเธขเธเธฅเธณเธ”เธฑเธ โ€” เธเธฑเธเธ—เธถเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธด
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '70px 20px' }}>
                <div style={{ fontSize: 50, marginBottom: 16, opacity: .2 }}>๐‘•</div>
                <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 14, marginBottom: adminUser ? 18 : 0 }}>เธขเธฑเธเนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธเธซเธกเธงเธ”เธเธตเน</div>
                {adminUser && (
                  <button className="btn-red" style={{ padding: '10px 30px' }} onClick={() => setShowAdd(true)}>
                    {activeNav === 'new' ? '+ เน€เธเธดเนเธกเนเธเธเน€เธชเธทเนเธญเนเธฃเธ' : activeNav === 'collar' ? '+ เน€เธเธดเนเธกเธเธญเน€เธชเธทเนเธญ' : activeNav === 'promotion' ? '+ เน€เธเธดเนเธกเนเธเธฃเนเธกเธเธฑเนเธ' : activeNav === 'other' ? '+ เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธฃเธ' : activeNav === 'fabric' ? '+ เน€เธเธดเนเธกเน€เธเธทเนเธญเธเนเธฒ' : activeNav === 'photo' ? '+ เน€เธเธดเนเธกเธฃเธนเธเธ เธฒเธ' : '+ เน€เธเธดเนเธกเธชเธดเธเธเนเธฒเนเธซเธกเน'}
                  </button>
                )}
              </div>
            ) : (activeNav === 'photo' || activeNav === 'promotion') ? (
              <div style={{ columns: '2 160px', gap: 12 }}>
                {filtered.map((s) => (
                  <PhotoCard key={s.id} shirt={s} isAdmin={!!adminUser}
                    onEdit={() => setEditShirt(s)}
                    onDelete={async () => {
                      await logDeletion({ table_name: 'shirts', record_id: s.id, record_name: s.name, image_url: s.image_url, deleted_by: adminUser || 'admin' })
                      await supabase.from('shirts').delete().eq('id', s.id)
                      setShirts((prev) => prev.filter((x) => x.id !== s.id))
                      notify('เธฅเธเธฃเธนเธเนเธฅเนเธง', 'err')
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
                      await supabase.from('shirts').delete().eq('id', s.id)
                      setShirts((prev) => prev.filter((x) => x.id !== s.id))
                      notify('เธฅเธเธชเธดเธเธเนเธฒเนเธฅเนเธง', 'err')
                    }}
                    onDupe={async () => {
                      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s
                      const { data } = await supabase.from('shirts').insert([{ ...rest, name: s.name + ' (เธชเธณเน€เธเธฒ)' }]).select().single()
                      if (data) { setShirts((prev) => [data, ...prev]); notify('เธเธฑเธ”เธฅเธญเธเธชเธณเน€เธฃเนเธ') }
                    }}
                    onContact={() => setShowContact(true)}
                    onCalculate={() => setShowCalculator(true)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.13)' }}>
        Shirt Catalog ยฉ 2025 โ€” Powered by Supabase + Vercel
      </div>

      {/* Modals */}
      {showAdd && (
        <ShirtModal collars={collars} prodTypes={prodTypes} fabricTypes={fabricTypes}
          category={activeNav === 'all' ? 'new' : activeNav}
          onSave={async (data, imgFile) => {
            let image_url = null
            if (imgFile) image_url = await uploadBase64Image(imgFile)
            const { data: newShirt } = await supabase.from('shirts').insert([{ ...data, image_url }]).select().single()
            if (newShirt) { setShirts((prev) => [newShirt, ...prev]); setShowAdd(false); notify('เน€เธเธดเนเธกเนเธเธเน€เธชเธทเนเธญเนเธฅเนเธง โ€” เธเธฑเธเธ—เธถเธเธชเธนเน Supabase') }
          }}
          onClose={() => setShowAdd(false)} />
      )}
      {editShirt && (
        <ShirtModal initial={editShirt} collars={collars} prodTypes={prodTypes} fabricTypes={fabricTypes}
          onSave={async (data, imgFile) => {
            let image_url = editShirt.image_url
            if (imgFile) {
              const newUrl = await uploadBase64Image(imgFile)
              if (newUrl) {
                // เนเธกเนเธฅเธเธฃเธนเธเน€เธเนเธฒ โ€” เน€เธเนเธเนเธงเนเนเธ Storage เธ•เธฅเธญเธ”
                image_url = newUrl
              }
            }
            const { data: updated } = await supabase.from('shirts').update({ ...data, image_url, updated_at: new Date().toISOString() }).eq('id', editShirt.id).select().single()
            if (updated) { setShirts((prev) => prev.map((x) => x.id === editShirt.id ? updated : x)); setEditShirt(null); notify('เธเธฑเธเธ—เธถเธเธเธฒเธฃเนเธเนเนเธเนเธฅเนเธง') }
          }}
          onClose={() => setEditShirt(null)} />
      )}
      {showSettings && (
        <SettingsModal collars={collars} setCollars={setCollars} prodTypes={prodTypes} setProdTypes={setProdTypes} fabricTypes={fabricTypes} setFabricTypes={setFabricTypes} promotions={promotions} setPromotions={setPromotions} shippingRules={shippingRules} setShippingRules={setShippingRules}
          onClose={() => setShowSettings(false)} notify={notify} />
      )}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showCalculator && <PriceCalculator shirts={shirts} collars={collars as CollarWithPrice[]} promotions={promotions} shippingRules={shippingRules} onClose={() => setShowCalculator(false)} />}
      {showContactAdmin && <ContactAdminModal notify={notify} onClose={() => setShowContactAdmin(false)} />}
      {showShopAdmin && <ShopAdminModal shopSettings={shopSettings} setShopSettings={setShopSettings} notify={notify} onClose={() => setShowShopAdmin(false)} />}
      {showWelcome && <WelcomeModal shopSettings={shopSettings} onBrowse={() => setShowWelcome(false)} onAdmin={() => { setShowWelcome(false); setView('admin-login') }} />}
    </div>
  )
}

/* โ”€โ”€ Loading โ”€โ”€ */
function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#fff' }}>S</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธเธฒเธ Supabase...</div>
      <div style={{ width: 160, height: 3, background: '#1c1c1c', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#c00', animation: 'loading 1.2s ease-in-out infinite', borderRadius: 2 }} />
      </div>
    </div>
  )
}

/* โ”€โ”€ Banner Section โ”€โ”€ */
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
    if (!url) { notify('เธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเนเธกเนเธชเธณเน€เธฃเนเธ', 'err'); return }
    const { data } = await supabase.from('banners').insert([{ name: file.name, image_url: url, sort_order: banners.length }]).select().single()
    if (data) { setBanners((prev) => [...prev, data]); notify('เน€เธเธดเนเธก Banner เนเธฅเนเธง') }
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
                <button onClick={() => setCur((c) => (c - 1 + banners.length) % banners.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>โ€น</button>
                <button onClick={() => setCur((c) => (c + 1) % banners.length)} style={{ position: 'absolute', right: isAdmin ? 130 : 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }}>โ€บ</button>
                <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {banners.map((_, i) => <div key={i} onClick={() => setCur(i)} style={{ width: i === idx ? 22 : 7, height: 7, borderRadius: 4, background: i === idx ? '#c00' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all .3s' }} />)}
                </div>
              </>
            )}
            {isAdmin && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                <button className="btn-red sm" onClick={() => ref.current?.click()}>+ เน€เธเธดเนเธก</button>
                <button className="btn-outline sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={async () => {
                  const b = banners[idx]
                  await supabase.from('banners').delete().eq('id', b.id)
                  setBanners((prev) => prev.filter((_, i) => i !== idx))
                  setCur(0); notify('เธฅเธ Banner เนเธฅเนเธง', 'err')
                }}>เธฅเธ</button>
              </div>
            )}
          </div>
        ) : isAdmin ? (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ minHeight: 120, aspectRatio: '16/5', maxHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 32 }}>๐–ผ</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 14 }}>เธฅเธฒเธ-เธงเธฒเธเธฃเธนเธ Banner เธซเธฃเธทเธญเธเธฅเธดเธเน€เธฅเธทเธญเธเนเธเธฅเน</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG ยท PNG ยท WEBP โ€” เธญเธฑเธเนเธซเธฅเธ”เธชเธนเน Supabase Storage</div>
          </div>
        ) : (
          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>เธขเธฑเธเนเธกเนเธกเธต Banner</div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}

/* โ”€โ”€ Shirt Card โ”€โ”€ */
function ShirtCard({ shirt, isAdmin, canDrag, isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onEdit, onDelete, onDupe, onContact, onCalculate }: {
  shirt: Shirt, isAdmin: boolean,
  canDrag?: boolean, isDragging?: boolean, isDragOver?: boolean,
  onDragStart?: () => void, onDragOver?: () => void, onDragEnd?: () => void,
  onEdit: () => void, onDelete: () => void, onDupe: () => void,
  onContact?: () => void, onCalculate?: () => void
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
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>โ ฟ</div>
      )}
      <div style={{ aspectRatio: '1', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
        {shirt.image_url
          ? <img src={shirt.image_url} alt={shirt.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 44 }}>๐‘•</div>
        }
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shirt.category === 'new' && <span style={{ background: '#c00', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>NEW</span>}
          {shirt.is_promo && <span style={{ background: '#e07800', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>เนเธเธฃ</span>}
        </div>
      </div>
      <div style={{ padding: '13px 14px 12px' }}>
        {shirt.category === 'fabric' ? (
          <>
            <div style={{ background: '#c00', borderRadius: 6, padding: '5px 10px', marginBottom: 8, display: 'inline-block' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'เนเธกเนเธกเธตเธเธทเนเธญ'}</span>
            </div>
            {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.7)', background: '#111', borderRadius: 4, padding: '4px 8px', marginBottom: 4 }}><span style={{ color: '#ff4444', fontWeight: 700 }}>เธเธธเธ“เธชเธกเธเธฑเธ•เธดเธเนเธฒ:</span> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{shirt.collar_type}</span></div>}
            {shirt.product_type && <div style={{ fontSize: 11, background: '#111', borderRadius: 4, padding: '4px 8px', marginBottom: 8 }}><span style={{ color: '#ff4444', fontWeight: 700 }}>เธเธฃเธฐเน€เธ เธ—เธเนเธฒ:</span> <span style={{ color: 'rgba(255,255,255,0.6)' }}>{shirt.product_type}</span></div>}
            <div style={{ fontWeight: 700, fontSize: 15, color: Number(shirt.price) > 0 ? '#ff4444' : 'rgba(255,255,255,0.4)' }}>{Number(shirt.price) > 0 ? `+ ${Number(shirt.price).toLocaleString()}.- เธเธฒเธ—/เธ•เธฑเธง` : 'เนเธกเนเธเธงเธเน€เธเธดเนเธก'}</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#fff', lineHeight: 1.3 }}>{shirt.name || 'เนเธกเนเธกเธตเธเธทเนเธญ'}</div>
            {shirt.collar_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 2 }}>เธเธญ: {shirt.collar_type}</div>}
            {shirt.product_type && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', marginBottom: 8 }}>เธเธฃเธฐเน€เธ เธ—: {shirt.product_type}</div>}
            <div style={{ fontWeight: 700, fontSize: 16, color: Number(shirt.price) > 0 ? '#ff4444' : 'rgba(255,255,255,0.3)' }}>{Number(shirt.price) > 0 ? `${Number(shirt.price).toLocaleString()}.- เธเธฒเธ—/เธ•เธฑเธง` : 'โ€”'}</div>
          </>
        )}
        {showActionBtns && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn-red sm" style={{ flex: 1 }} onClick={onContact}>๐“ เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ</button>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={onCalculate}>๐งฎ เธเธณเธเธงเธ“เธฃเธฒเธเธฒ</button>
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={onEdit}>โ เนเธเนเนเธ</button>
            <button className="btn-outline sm" style={{ flex: 1 }} onClick={onDupe}>โง เธเธฑเธ”เธฅเธญเธ</button>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onDelete}>โ•</button>
          </div>
        )}
      </div>
    </div>
  )
}


/* โ”€โ”€ Photo Card (responsive image) โ”€โ”€ */
function PhotoCard({ shirt, isAdmin, onEdit, onDelete }: {
  shirt: Shirt, isAdmin: boolean,
  onEdit: () => void, onDelete: () => void
}) {
  return (
    <div className="card-shirt" style={{ breakInside: 'avoid', marginBottom: 12, position: 'relative' }}>
      {shirt.image_url ? (
        <img src={shirt.image_url} alt={shirt.name || ''} style={{ width: '100%', display: 'block', borderRadius: '8px 8px 0 0' }} />
      ) : (
        <div style={{ width: '100%', aspectRatio: '4/3', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.08)', fontSize: 44, borderRadius: '8px 8px 0 0' }}>๐–ผ</div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 5, padding: '8px 10px' }}>
          <button className="btn-outline sm" style={{ flex: 1 }} onClick={onEdit}>โ เนเธเนเนเธ</button>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onDelete}>โ•</button>
        </div>
      )}
    </div>
  )
}

/* โ”€โ”€ Shirt Modal โ”€โ”€ */
function ShirtModal({ initial, collars, prodTypes, fabricTypes, category, onSave, onClose }: {
  initial?: Shirt, collars: Collar[], prodTypes: ProductType[], fabricTypes: FabricType[],
  category?: string,
  onSave: (data: Partial<Shirt>, img: string | null) => Promise<void>,
  onClose: () => void
}) {
  const [f, setF] = useState({ name: initial?.name || '', collar_type: initial?.collar_type || '', product_type: initial?.product_type || 'เนเธกเนเธเธฃเนเธเธฅเธตเน€เธญเธชเน€เธ•เธญเธฃเน (Micro Polyester)', price: initial?.price || 0, category: initial?.category || category || 'new', is_promo: initial?.is_promo || false })
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
            ? (f.category === 'fabric' ? 'โ เนเธเนเนเธเน€เธเธทเนเธญเธเนเธฒ' : f.category === 'collar' ? 'โ เนเธเนเนเธเธเธญเน€เธชเธทเนเธญ' : f.category === 'promotion' ? 'โ เนเธเนเนเธเนเธเธฃเนเธกเธเธฑเนเธ' : f.category === 'photo' ? 'โ เนเธเนเนเธเธฃเธนเธเธ เธฒเธ' : 'โ เนเธเนเนเธเนเธเธเน€เธชเธทเนเธญ')
            : (f.category === 'fabric' ? '+ เน€เธเธดเนเธกเน€เธเธทเนเธญเธเนเธฒเนเธซเธกเน' : f.category === 'collar' ? '+ เน€เธเธดเนเธกเธเธญเน€เธชเธทเนเธญ' : f.category === 'promotion' ? '+ เน€เธเธดเนเธกเนเธเธฃเนเธกเธเธฑเนเธ' : f.category === 'photo' ? '+ เน€เธเธดเนเธกเธฃเธนเธเธ เธฒเธ' : '+ เน€เธเธดเนเธกเนเธเธเน€เธชเธทเนเธญเนเธซเธกเน')}</div>
          <button className="btn-outline sm" onClick={onClose}>โ• เธเธดเธ”</button>
        </div>
        <div className="section-label">เธฃเธนเธเธ เธฒเธ (เธญเธฑเธเนเธซเธฅเธ”เธชเธนเน Supabase Storage)</div>
        {imgPreview ? (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 170, marginBottom: 16 }}>
            <img src={imgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button className="btn-red sm" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => { setImgPreview(null); setNewImgData('__remove__') }}>เน€เธเธฅเธตเนเธขเธเธฃเธนเธ</button>
          </div>
        ) : (
          <div className={`drag-zone${ov ? ' ov' : ''}`} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            onDragOver={(e) => { e.preventDefault(); setOv(true) }}
            onDragLeave={() => setOv(false)}
            onDrop={(e) => { e.preventDefault(); setOv(false); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]) }}
            onClick={() => ref.current?.click()}>
            <div style={{ fontSize: 28 }}>๐“ท</div>
            <div style={{ color: '#c00', fontWeight: 700, fontSize: 13 }}>เธฅเธฒเธ-เธงเธฒเธเธฃเธนเธเธ เธฒเธ เธซเธฃเธทเธญเธเธฅเธดเธเน€เธฅเธทเธญเธ</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG ยท PNG ยท WEBP โ€” เธญเธฑเธเนเธซเธฅเธ”เธชเธนเน Supabase Storage</div>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) loadImg(e.target.files[0]); e.target.value = '' }} />
        <div className="divider" />
        <div style={{ display: 'grid', gap: 13 }}>
          {/* โ”€โ”€ fabric โ”€โ”€ */}
          {f.category === 'fabric' && (<>
            <div><div className="section-label">เน€เธเธทเนเธญเธเนเธฒ</div><input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เธเธทเนเธญเน€เธเธทเนเธญเธเนเธฒ" /></div>
            <div><div className="section-label">เน€เธเธทเนเธญเธเนเธฒ +เธเธงเธเน€เธเธดเนเธก เธ•เธฑเธงเธฅเธฐ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>เธเธฒเธ—/เธ•เธฑเธง</span>
              </div>
            </div>
            <div><div className="section-label">เธเธฃเธฐเน€เธ เธ—เน€เธเธทเนเธญเธเนเธฒ</div>
              <select className="select-d" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
                {fabricTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">เธเธธเธ“เธชเธกเธเธฑเธ•เธดเน€เธเธทเนเธญเธเนเธฒ</div>
              <textarea className="input-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}
                placeholder="เน€เธเนเธ เธเนเธณเธซเธเธฑเธ 150 เธเธฃเธฑเธก เธฃเธฐเธเธฒเธขเธญเธฒเธเธฒเธจเนเธ”เนเธ”เธต เนเธกเนเธซเธ”เธ•เธฑเธง..."
                style={{ minHeight: 80, resize: 'vertical' as const }} />
            </div>
          </>)}
          {/* โ”€โ”€ collar โ”€โ”€ */}
          {f.category === 'collar' && (<>
            <div><div className="section-label">เธเธญเน€เธชเธทเนเธญ / เธเธฒเธเน€เธเธ / เธชเธดเธเธเนเธฒ</div>
              <select className="select-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเธญ โ€”</option>
                {collars.map((col) => <option key={col.id} value={col.name}>{col.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">เธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ</div>
              <select className="select-d" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ โ€”</option>
                {prodTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">เธฃเธฒเธเธฒ (THB)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>THB.-</span>
              </div>
            </div>
          </>)}
          {/* โ”€โ”€ photo / promotion: เธฃเธนเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธง โ”€โ”€ */}
          {(f.category === 'photo' || f.category === 'promotion') && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '8px 0' }}>เธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเธ เธฒเธเธ”เนเธฒเธเธเธเน€เธเธทเนเธญเธเธฑเธเธ—เธถเธ</div>
          )}
          {/* โ”€โ”€ new / other / all โ”€โ”€ */}
          {(f.category === 'new' || f.category === 'other') && (<>
            <div><div className="section-label">เธเธทเนเธญเธ—เธตเธก / เธเธทเนเธญเธเธฒเธ</div><input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เธเธทเนเธญเนเธเธเน€เธชเธทเนเธญ / เธเธทเนเธญเธ—เธตเธก" /></div>
            <div><div className="section-label">เธเธญเน€เธชเธทเนเธญ / เธเธฒเธเน€เธเธ / เธชเธดเธเธเนเธฒ</div>
              <select className="select-d" value={f.collar_type} onChange={(e) => set('collar_type', e.target.value)}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเธญ โ€”</option>
                {collars.map((col) => <option key={col.id} value={col.name}>{col.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">เธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ</div>
              <select className="select-d" value={f.product_type} onChange={(e) => set('product_type', e.target.value)}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ โ€”</option>
                {prodTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div><div className="section-label">เธฃเธฒเธเธฒ (THB)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>THB.-</span>
              </div>
            </div>
            <div><div className="section-label">เธซเธกเธงเธ”เธซเธกเธนเน</div>
              <select className="select-d" value={f.category} onChange={(e) => set('category', e.target.value)}>
                <option value="new">เนเธเธเน€เธชเธทเนเธญเนเธซเธกเน (New)</option>
                <option value="collar">เธเธญเน€เธชเธทเนเธญเธ—เธฑเนเธเธซเธกเธ”</option>
                <option value="other">เนเธเธเน€เธชเธทเนเธญเธญเธทเนเธเน</option>
                <option value="photo">เธ เธฒเธเธ–เนเธฒเธขเธเธฒเธเธเธฃเธดเธ</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={f.is_promo} onChange={(e) => set('is_promo', e.target.checked)} />
              <span style={{ fontSize: 13 }}>เนเธชเธ”เธเนเธเธซเธกเธงเธ”เนเธเธฃเนเธกเธเธฑเนเธ</span>
            </label>
          </>)}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn-red" style={{ flex: 1 }} disabled={saving} onClick={async () => { setSaving(true); await onSave(f, newImgData); setSaving(false) }}>
            {saving ? 'โณ เธเธณเธฅเธฑเธเธญเธฑเธเนเธซเธฅเธ”...' : '๐’พ เธเธฑเธเธ—เธถเธ'}
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>เธขเธเน€เธฅเธดเธ</button>
        </div>
      </div>
    </div>
  )
}

/* โ”€โ”€ Settings Modal โ”€โ”€ */
function SettingsModal({ collars, setCollars, prodTypes, setProdTypes, fabricTypes, setFabricTypes, promotions, setPromotions, shippingRules, setShippingRules, onClose, notify }: {
  collars: Collar[], setCollars: React.Dispatch<React.SetStateAction<Collar[]>>,
  prodTypes: ProductType[], setProdTypes: React.Dispatch<React.SetStateAction<ProductType[]>>,
  fabricTypes: FabricType[], setFabricTypes: React.Dispatch<React.SetStateAction<FabricType[]>>,
  promotions: Promotion[], setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>,
  shippingRules: ShippingRule[], setShippingRules: React.Dispatch<React.SetStateAction<ShippingRule[]>>,
  onClose: () => void, notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [tab, setTab] = useState<'collar'|'prod'|'fabric'|'price'|'promo'|'ship'>('collar')
  const TABS = [
    ['collar', `เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ (${collars.length})`],
    ['prod', `เธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ (${prodTypes.length})`],
    ['fabric', `เธเธฃเธฐเน€เธ เธ—เน€เธเธทเนเธญเธเนเธฒ (${fabricTypes.length})`],
    ['price', 'เธฃเธฒเธเธฒเธเธญเน€เธชเธทเนเธญ'],
    ['promo', 'เนเธเธฃเนเธกเธเธฑเนเธ'],
    ['ship', 'เธเนเธฒเธเธเธชเนเธ'],
  ] as const
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>โ เธเธฑเธ”เธเธฒเธฃเธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ</div>
          <button className="btn-outline sm" onClick={onClose}>โ•</button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, flexWrap: 'wrap' }}>
          {TABS.map(([id, lbl]) => (
            <div key={id} className={`nav-item${tab === id ? ' active' : ''}`} style={{ padding: '5px 12px', borderRadius: 5, fontSize: 12 }} onClick={() => setTab(id as any)}>{lbl}</div>
          ))}
        </div>
        {tab === 'collar' && <SupabaseTypeList table="collars" items={collars} setItems={setCollars} ph="เน€เธเธดเนเธกเธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ..." notify={notify} />}
        {tab === 'prod' && <SupabaseTypeList table="product_types" items={prodTypes} setItems={setProdTypes} ph="เน€เธเธดเนเธกเธเธฃเธฐเน€เธ เธ—เธชเธดเธเธเนเธฒ..." notify={notify} />}
        {tab === 'fabric' && <SupabaseTypeList table="fabric_types" items={fabricTypes} setItems={setFabricTypes as any} ph="เน€เธเธดเนเธกเธเธฃเธฐเน€เธ เธ—เน€เธเธทเนเธญเธเนเธฒ..." notify={notify} />}
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
    const { data } = await supabase.from(table).insert([{ name: nv.trim(), sort_order: items.length }]).select().single()
    if (data) { setItems((prev: any[]) => [...prev, data]); setNv(''); notify('เน€เธเธดเนเธกเธชเธณเน€เธฃเนเธ') }
  }
  const save = async (i: number) => {
    const item = items[i]
    await supabase.from(table).update({ name: ev }).eq('id', item.id)
    setItems((prev: any[]) => prev.map((x, j) => j === i ? { ...x, name: ev } : x))
    setEi(null); notify('เธเธฑเธเธ—เธถเธเนเธฅเนเธง')
  }
  const del = async (i: number) => {
    await supabase.from(table).delete().eq('id', items[i].id)
    setItems((prev: any[]) => prev.filter((_, j) => j !== i)); notify('เธฅเธเนเธฅเนเธง', 'err')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input-d" value={nv} onChange={(e) => setNv(e.target.value)} placeholder={ph} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn-red sm" style={{ whiteSpace: 'nowrap' }} onClick={add}>+ เน€เธเธดเนเธก</button>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '7px 12px', borderRadius: 5 }}>
            {ei === i
              ? <><input className="input-d" value={ev} onChange={(e) => setEv(e.target.value)} style={{ flex: 1 }} autoFocus onKeyDown={(e) => e.key === 'Enter' && save(i)} />
                <button className="btn-red sm" onClick={() => save(i)}>เธเธฑเธเธ—เธถเธ</button>
                <button className="btn-outline sm" onClick={() => setEi(null)}>เธขเธเน€เธฅเธดเธ</button></>
              : <><span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <button className="btn-outline sm" onClick={() => { setEi(i); setEv(item.name) }}>เนเธเนเนเธ</button>
                <button className="btn-ghost" onClick={() => del(i)}>เธฅเธ</button></>
            }
          </div>
        ))}
      </div>
    </div>
  )
}


/* โ”€โ”€ Collar Price List โ”€โ”€ */
function CollarPriceList({ collars, setCollars, notify }: {
  collars: CollarWithPrice[], setCollars: React.Dispatch<React.SetStateAction<any[]>>,
  notify: (m: string, t?: 'ok' | 'err') => void
}) {
  const [editing, setEditing] = useState<Record<string, string>>({})
  const save = async (col: CollarWithPrice) => {
    const price = Number(editing[col.id] ?? col.price)
    await supabase.from('collars').update({ price }).eq('id', col.id)
    setCollars((prev: any[]) => prev.map((x) => x.id === col.id ? { ...x, price } : x))
    setEditing((prev) => { const n = { ...prev }; delete n[col.id]; return n })
    notify('เธเธฑเธเธ—เธถเธเธฃเธฒเธเธฒเนเธฅเนเธง')
  }
  return (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>เธเธณเธซเธเธ”เธฃเธฒเธเธฒเธ•เนเธญเธ•เธฑเธงเธชเธณเธซเธฃเธฑเธเนเธ•เนเธฅเธฐเธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ</div>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {collars.map((col) => (
          <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '7px 12px', borderRadius: 5 }}>
            <span style={{ flex: 1, fontSize: 13 }}>{col.name}</span>
            <input className="input-d" type="number" value={editing[col.id] ?? col.price ?? 0}
              onChange={(e) => setEditing((prev) => ({ ...prev, [col.id]: e.target.value }))}
              style={{ width: 90, textAlign: 'right' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>THB</span>
            <button className="btn-red sm" onClick={() => save(col)}>เธเธฑเธเธ—เธถเธ</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* โ”€โ”€ Promotion List โ”€โ”€ */
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
      await supabase.from('promotions').update({ ...f, updated_at: new Date().toISOString() }).eq('id', editId)
      setPromotions((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x))
      notify('เธเธฑเธเธ—เธถเธเนเธเธฃเนเธกเธเธฑเนเธเนเธฅเนเธง')
    } else {
      const { data } = await supabase.from('promotions').insert([{ ...f, sort_order: promotions.length }]).select().single()
      if (data) { setPromotions((prev) => [...prev, data as Promotion]); notify('เน€เธเธดเนเธกเนเธเธฃเนเธกเธเธฑเนเธเนเธฅเนเธง') }
    }
    setShowAdd(false); setEditId(null); setF(empty)
  }
  const del = async (id: string) => {
    await supabase.from('promotions').delete().eq('id', id)
    setPromotions((prev) => prev.filter((x) => x.id !== id)); notify('เธฅเธเนเธฅเนเธง', 'err')
  }
  const toggleActive = async (p: Promotion) => {
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id)
    setPromotions((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  const TYPE_LABELS: Record<string,string> = { free: 'เนเธ–เธกเธเธฃเธต', discount_qty: 'เธฅเธ”เธเธณเธเธงเธเธ•เธฑเธง', discount_pct: 'เธฅเธ” %', discount_thb: 'เธฅเธ”เน€เธเนเธเธเธฒเธ—' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>เนเธเธฃเนเธกเธเธฑเนเธเธ—เธตเน active เธเธฐเธเธณเธกเธฒเธเธณเธเธงเธ“เธฃเธฒเธเธฒ</div>
        <button className="btn-red sm" onClick={() => { setShowAdd(true); setEditId(null); setF(empty) }}>+ เน€เธเธดเนเธก</button>
      </div>
      {(showAdd || editId) && (
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <div><div className="section-label">เธเธทเนเธญเนเธเธฃเนเธกเธเธฑเนเธ</div>
            <input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เน€เธเนเธ เนเธเธฃ 15 เธ•เธฑเธง เนเธ–เธก 1" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><div className="section-label">เธเธณเธเธงเธเธเธฑเนเธเธ•เนเธณ (เธ•เธฑเธง)</div>
              <input className="input-d" type="number" value={f.min_qty} onChange={(e) => set('min_qty', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">เธเธฃเธฐเน€เธ เธ—เนเธเธฃเนเธกเธเธฑเนเธ</div>
              <select className="select-d" value={f.type} onChange={(e) => set('type', e.target.value)}>
                <option value="free">เนเธ–เธกเธเธฃเธต (เธ•เธฑเธง)</option>
                <option value="discount_qty">เธฅเธ”เธเธณเธเธงเธ (เธ•เธฑเธง)</option>
                <option value="discount_pct">เธฅเธ” %</option>
                <option value="discount_thb">เธฅเธ”เน€เธเนเธเธเธฒเธ—</option>
              </select>
            </div>
          </div>
          {f.type === 'free' && <div><div className="section-label">เธเธณเธเธงเธเนเธ–เธกเธเธฃเธต (เธ•เธฑเธง)</div><input className="input-d" type="number" value={f.free_qty} onChange={(e) => set('free_qty', Number(e.target.value))} /></div>}
          {f.type === 'discount_qty' && <div><div className="section-label">เธฅเธ”เธเธณเธเธงเธ (เธ•เธฑเธง)</div><input className="input-d" type="number" value={f.discount_qty} onChange={(e) => set('discount_qty', Number(e.target.value))} /></div>}
          {f.type === 'discount_pct' && <div><div className="section-label">เธฅเธ” (%)</div><input className="input-d" type="number" value={f.discount_pct} onChange={(e) => set('discount_pct', Number(e.target.value))} /></div>}
          {f.type === 'discount_thb' && <div><div className="section-label">เธฅเธ” (เธเธฒเธ—)</div><input className="input-d" type="number" value={f.discount_thb} onChange={(e) => set('discount_thb', Number(e.target.value))} /></div>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            <span style={{ fontSize: 13 }}>เน€เธเธดเธ”เนเธเนเธเธฒเธเนเธเธฃเนเธกเธเธฑเนเธเธเธตเน</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-red sm" onClick={save}>๐’พ เธเธฑเธเธ—เธถเธ</button>
            <button className="btn-outline sm" onClick={() => { setShowAdd(false); setEditId(null) }}>เธขเธเน€เธฅเธดเธ</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {promotions.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 12px', borderRadius: 5, border: p.is_active ? '1px solid #c00' : '1px solid transparent' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>เธชเธฑเนเธ {p.min_qty}+ เธ•เธฑเธง ยท {TYPE_LABELS[p.type]}{p.type==='free'?` ${p.free_qty} เธ•เธฑเธง`:p.type==='discount_qty'?` ${p.discount_qty} เธ•เธฑเธง`:p.type==='discount_pct'?` ${p.discount_pct}%`:` เธฟ${p.discount_thb}`}</div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: p.is_active ? '#c00' : '#333', color: '#fff', cursor: 'pointer' }} onClick={() => toggleActive(p)}>{p.is_active ? 'เน€เธเธดเธ”' : 'เธเธดเธ”'}</span>
            <button className="btn-outline sm" onClick={() => { setEditId(p.id); setShowAdd(false); setF({ name: p.name, is_active: p.is_active, min_qty: p.min_qty, type: p.type, free_qty: p.free_qty, discount_qty: p.discount_qty, discount_pct: p.discount_pct, discount_thb: p.discount_thb }) }}>เนเธเนเนเธ</button>
            <button className="btn-ghost" onClick={() => del(p.id)}>เธฅเธ</button>
          </div>
        ))}
        {promotions.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 20 }}>เธขเธฑเธเนเธกเนเธกเธตเนเธเธฃเนเธกเธเธฑเนเธ</div>}
      </div>
    </div>
  )
}

/* โ”€โ”€ Shipping List โ”€โ”€ */
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
      await supabase.from('shipping_rules').update({ ...f, updated_at: new Date().toISOString() }).eq('id', editId)
      setShippingRules((prev) => prev.map((x) => x.id === editId ? { ...x, ...f } : x))
      notify('เธเธฑเธเธ—เธถเธเนเธฅเนเธง')
    } else {
      const { data } = await supabase.from('shipping_rules').insert([{ ...f, sort_order: shippingRules.length }]).select().single()
      if (data) { setShippingRules((prev) => [...prev, data as ShippingRule]); notify('เน€เธเธดเนเธกเธเนเธญเธเธ—เธฒเธเธเธเธชเนเธเนเธฅเนเธง') }
    }
    setShowAdd(false); setEditId(null); setF(empty)
  }
  const del = async (id: string) => {
    await supabase.from('shipping_rules').delete().eq('id', id)
    setShippingRules((prev) => prev.filter((x) => x.id !== id)); notify('เธฅเธเนเธฅเนเธง', 'err')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>เธเนเธฒเธเธเธชเนเธ 0 เธเธฒเธ— = เนเธกเนเธเธดเธ”เธเนเธฒเธเธฑเธ”เธชเนเธ</div>
        <button className="btn-red sm" onClick={() => { setShowAdd(true); setEditId(null); setF(empty) }}>+ เน€เธเธดเนเธก</button>
      </div>
      {(showAdd || editId) && (
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <div><div className="section-label">เธเธทเนเธญเธเนเธญเธเธ—เธฒเธ</div>
            <input className="input-d" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เน€เธเนเธ เธเธเธชเนเธเธ—เธฑเนเธงเนเธ, เธฃเธ–เนเธ EMS" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><div className="section-label">เธเธณเธเธงเธเธเธฑเนเธเธ•เนเธณ</div>
              <input className="input-d" type="number" value={f.min_qty} onChange={(e) => set('min_qty', Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">เธเธณเธเธงเธเธชเธนเธเธชเธธเธ” (เธงเนเธฒเธ = เนเธกเนเธเธณเธเธฑเธ”)</div>
              <input className="input-d" type="number" value={f.max_qty ?? ''} onChange={(e) => set('max_qty', e.target.value === '' ? null : Number(e.target.value))} placeholder="เนเธกเนเธเธณเธเธฑเธ”" />
            </div>
            <div style={{ flex: 1 }}><div className="section-label">เธฃเธฒเธเธฒ (THB)</div>
              <input className="input-d" type="number" value={f.price} onChange={(e) => set('price', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-red sm" onClick={save}>๐’พ เธเธฑเธเธ—เธถเธ</button>
            <button className="btn-outline sm" onClick={() => { setShowAdd(false); setEditId(null) }}>เธขเธเน€เธฅเธดเธ</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {shippingRules.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 12px', borderRadius: 5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.min_qty}{r.max_qty != null ? `โ€“${r.max_qty}` : '+'} เธ•เธฑเธง ยท เธฟ{Number(r.price).toLocaleString()}</div>
            </div>
            <button className="btn-outline sm" onClick={() => { setEditId(r.id); setShowAdd(false); setF({ name: r.name, min_qty: r.min_qty, max_qty: r.max_qty, price: r.price }) }}>เนเธเนเนเธ</button>
            <button className="btn-ghost" onClick={() => del(r.id)}>เธฅเธ</button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* โ”€โ”€ Customer Manager โ”€โ”€ */
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
          <div style={{ fontWeight: 700, fontSize: 18 }}>เธเนเธญเธกเธนเธฅเธชเธกเธฒเธเธดเธ</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Supabase Database ยท {customers.length} เธเธ</div>
        </div>
        <input className="input-d" style={{ width: 260 }} placeholder="เธเนเธเธซเธฒเธเธทเนเธญ / เธญเธตเน€เธกเธฅ / Facebook..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0
        ? <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>เนเธกเนเธเธเธชเธกเธฒเธเธดเธ</div>
        : <div style={{ display: 'grid', gap: 10 }}>
          {list.map((c) => (
            <div key={c.id} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#c00,#800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>{(c.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {c.email && <span>๐“ง {c.email}</span>}
                  {c.phone && <span>๐“ {c.phone}</span>}
                  {c.facebook && <span>๐“ {c.facebook}</span>}
                  {c.joined_at && <span>๐• {new Date(c.joined_at).toLocaleDateString('th-TH')}</span>}
                </div>
              </div>
              <button className="btn-ghost" onClick={async () => {
                await supabase.from('customers').delete().eq('id', c.id)
                setCustomers((prev) => prev.filter((x) => x.id !== c.id))
                notify('เธฅเธเธชเธกเธฒเธเธดเธเนเธฅเนเธง', 'err')
              }}>โ• เธฅเธ</button>
            </div>
          ))}
        </div>
      }
    </div>
  )
}

/* โ”€โ”€ Auth Pages โ”€โ”€ */
function AdminLogin({ onLogin, onBack }: { onLogin: (u: string) => void, onBack: () => void }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  return (
    <AuthShell title="เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ Admin" badge="ADMIN ONLY">
      <input className="input-d" placeholder="Name ID เน€เธเนเธ ceo edit00" value={id} onChange={(e) => setId(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('เธเธทเนเธญเธเธนเนเนเธเนเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ'))} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={() => ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('เธเธทเนเธญเธเธนเนเนเธเนเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ')}>เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ Admin</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>โ เธเธฅเธฑเธ</button>
    </AuthShell>
  )
}

function CustLogin({ customers, onLogin, onBack, onReg }: {
  customers: Customer[], onLogin: (u: Customer) => void, onBack: () => void, onReg: () => void
}) {
  const [em, setEm] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const go = () => { const u = customers.find((c) => c.email === em && c.password === pw); if (u) onLogin(u); else setErr('เธญเธตเน€เธกเธฅเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ') }
  return (
    <AuthShell title="เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธชเธกเธฒเธเธดเธ">
      <input className="input-d" placeholder="เธญเธตเน€เธกเธฅ" value={em} onChange={(e) => setEm(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="เธฃเธซเธฑเธชเธเนเธฒเธ" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={go}>เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</button>
      <button className="btn-outline" style={{ width: '100%', marginBottom: 8 }} onClick={onReg}>เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเนเธซเธกเน</button>
      <button className="btn-outline" style={{ width: '100%', opacity: .65, fontSize: 12 }} onClick={onBack}>เนเธกเนเธฅเนเธญเธเธญเธดเธ โ€” เน€เธเนเธฒเธเธกเนเธ”เนเน€เธฅเธข</button>
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
    if (!f.name || !f.email || !f.password) return setErr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเธ—เธตเนเธเธณเน€เธเนเธ')
    if (f.password !== f.confirm) return setErr('เธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ•เธฃเธเธเธฑเธ')
    if (customers.find((c) => c.email === f.email)) return setErr('เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเธเธฒเธเนเธฅเนเธง')
    setSaving(true)
    await onSave({ name: f.name, email: f.email, phone: f.phone, facebook: f.facebook, password: f.password })
    setSaving(false)
  }
  return (
    <AuthShell title="เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ" sub="เธเนเธญเธกเธนเธฅเธ–เธนเธเน€เธเนเธเนเธ Supabase เธญเธขเนเธฒเธเธเธฅเธญเธ”เธ เธฑเธข">
      {([['name', 'เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ *', 'text'], ['email', 'เธญเธตเน€เธกเธฅ *', 'email'], ['phone', 'เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'tel'], ['facebook', 'Facebook (เนเธเธฐเธเธณ)', 'text'], ['password', 'เธฃเธซเธฑเธชเธเนเธฒเธ *', 'password'], ['confirm', 'เธขเธทเธเธขเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธ *', 'password']] as const).map(([k, lb, tp]) => (
        <input key={k} className="input-d" type={tp} placeholder={lb} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} style={{ marginBottom: 10 }} />
      ))}
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} disabled={saving} onClick={go}>{saving ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : 'เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ'}</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>โ เธเธฅเธฑเธ</button>
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

/* โ”€โ”€ Contact Modal โ”€โ”€ */
function ContactModal({ onClose }: { onClose: () => void }) {
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contact_settings').select('*').eq('id', 'main').single()
      .then(({ data }) => { if (data) setContact(data); setLoading(false) })
  }, [])

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              ๐“ เธเนเธญเธเธ—เธฒเธเธเธฒเธฃเธ•เธดเธ”เธ•เนเธญ
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธ•เธดเธ”เธ•เนเธญเน€เธฃเธฒเนเธ”เนเน€เธฅเธข</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>โ•</button>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>
          ) : !contact ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#ff6060' }}>เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธ”เน</div>
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
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>เธเธฅเธดเธเน€เธเธทเนเธญเนเธเธขเธฑเธ Facebook</div>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>โ’</span>
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
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>เธเธฅเธดเธเน€เธเธทเนเธญเน€เธเธดเนเธกเน€เธเธทเนเธญเธเนเธ Line</div>
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>โ’</span>
                  </a>
                  {/* QR เนเธ•เนเธเธธเนเธก Line */}
                  {contact.line_qr_url && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src={contact.line_qr_url} alt="Line QR" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>เธชเนเธเธ QR เน€เธเธดเนเธกเน€เธเธทเนเธญเธ Line</div>
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
                      <span style={{ fontSize: 20 }}>๐“ฑ</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>เนเธ—เธฃเธจเธฑเธเธ—เน</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone1}</div>
                      </div>
                    </a>
                  )}
                  {contact.phone2 && (
                    <a href={`tel:${contact.phone2}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'border-color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = '#c00')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                      <span style={{ fontSize: 20 }}>๐“ฑ</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>เนเธ—เธฃเธจเธฑเธเธ—เน</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone2}</div>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {/* Address */}
              {contact.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 20, marginTop: 2 }}>๐“</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>เธ•เธดเธ”เธ•เนเธญเธ—เธตเนเธซเธเนเธฒเธฃเนเธฒเธ</div>
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

/* โ”€โ”€ Price Calculator โ”€โ”€ */
function PriceCalculator({ shirts, collars, promotions, shippingRules, onClose }: {
  shirts: Shirt[], collars: CollarWithPrice[],
  promotions: Promotion[], shippingRules: ShippingRule[],
  onClose: () => void
}) {
  const [useCollar, setUseCollar] = useState(false)
  const [collarId, setCollarId] = useState('')
  const [shirtId, setShirtId] = useState('')       // เน€เธฅเธทเธญเธเนเธเธ (เธ”เธถเธเธฃเธฒเธเธฒเธเธฒเธเธเธฒเธฃเนเธ”)
  const [fabricId, setFabricId] = useState('')
  const [qty, setQty] = useState(1)
  const [shippingId, setShippingId] = useState('')
  const [promoChoice, setPromoChoice] = useState<'free'|'discount'|''>('')
  const [calculated, setCalculated] = useState(false)
  const [contact, setContact] = useState<any>(null)

  useEffect(() => {
    supabase.from('contact_settings').select('*').eq('id','main').single()
      .then(({ data }) => { if (data) setContact(data) })
  }, [])

  // เน€เธฅเธทเธญเธเนเธเธ: เธ”เธถเธเธฃเธฒเธเธฒเธเธฒเธเธเธฒเธฃเนเธ” (new/other/collar category)
  const selectableShirts = shirts.filter((s) => s.category !== 'fabric' && s.category !== 'photo' && s.category !== 'promotion')
  const selectedShirt = selectableShirts.find((s) => s.id === shirtId)
  const shirtPrice = selectedShirt ? Number(selectedShirt.price) : 0

  // เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ (เนเธเนเน€เธเธเธฒเธฐเธ•เธญเธ useCollar = true)
  const collar = collars.find((col) => col.id === collarId)
  const collarPrice = (useCollar && collar) ? Number(collar.price) : 0

  // เธฃเธฒเธเธฒเธเธฒเธ = เธฃเธฒเธเธฒเธเธฒเธเธเธฒเธฃเนเธ” + เธเธญเน€เธชเธทเนเธญ (เธ–เนเธฒเน€เธเธฅเธตเนเธขเธ)
  const basePrice = shirtPrice + collarPrice

  // เน€เธเธทเนเธญเธเนเธฒ (เน€เธเธเธฒเธฐ category=fabric, เธเนเธญเธเธฃเธฒเธขเธเธฒเธฃเธ—เธตเน price=0 เธขเธเน€เธงเนเธ default)
  const fabricShirts = shirts.filter((s) => s.category === 'fabric')
  const fabric = fabricShirts.find((s) => s.id === fabricId)
  const fabricPrice = fabric ? Number(fabric.price) : 0

  // เธฃเธฒเธเธฒเธเธเธชเนเธ
  const shipping = shippingRules.find((r) => r.id === shippingId)
  const shippingPrice = (shipping && Number(shipping.price) > 0) ? Number(shipping.price) : 0
  const isCustomShipping = shipping && Number(shipping.price) === 0 && shipping.name !== 'เธฃเธฑเธเธซเธเนเธฒเธฃเนเธฒเธ / เธเธฑเธ”เธฃเธฑเธ'

  // เนเธเธฃเนเธกเธเธฑเนเธ active
  const activePromo = promotions.find((p) => p.is_active && qty >= p.min_qty)

  // เธชเธนเธ•เธฃ: ((เธฃเธฒเธเธฒ + เน€เธเธทเนเธญเธเนเธฒ) * เธเธณเธเธงเธ) + เธเธเธชเนเธ
  const unitPrice = basePrice + fabricPrice
  let subtotal = unitPrice * qty
  let promoLabel = ''
  let promoValue = 0
  let bonusQty = 0

  if (activePromo && promoChoice) {
    if (promoChoice === 'free') {
      bonusQty = activePromo.free_qty
      promoLabel = `เนเธ–เธกเธเธฃเธต ${bonusQty} เธ•เธฑเธง`
    } else {
      if (activePromo.type === 'free' || activePromo.type === 'discount_qty') {
        const dq = activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty
        promoValue = unitPrice * dq
        promoLabel = `เธฅเธ”เน€เธ—เธตเธขเธเน€เธ—เนเธฒ ${dq} เธ•เธฑเธง`
      } else if (activePromo.type === 'discount_pct') {
        promoValue = Math.round(subtotal * activePromo.discount_pct / 100)
        promoLabel = `เธฅเธ” ${activePromo.discount_pct}%`
      } else if (activePromo.type === 'discount_thb') {
        promoValue = activePromo.discount_thb
        promoLabel = `เธฅเธ” เธฟ${activePromo.discount_thb.toLocaleString()}`
      }
      subtotal = Math.max(0, subtotal - promoValue)
    }
  }

  const grandTotal = subtotal + shippingPrice
  const reset = () => setCalculated(false)

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440, maxHeight: '92vh', padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', maxHeight: '92vh' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>๐งฎ เธเธณเธเธงเธ“เธฃเธฒเธเธฒเน€เธเธทเนเธญเธเธ•เนเธ</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>((เธฃเธฒเธเธฒ + เน€เธเธทเนเธญเธเนเธฒ) ร— เธเธณเธเธงเธ) + เธเธเธชเนเธ</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>โ•</button>
          </div>

          <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>

            {/* เน€เธฅเธทเธญเธเนเธเธ */}
            <div>
              <div className="section-label">เน€เธฅเธทเธญเธเนเธเธ</div>
              <select className="select-d" value={shirtId} onChange={(e) => { setShirtId(e.target.value); reset() }}>
                <option value="">เน€เธฅเธทเธญเธเธ•เธฒเธกเนเธเธ</option>
                {selectableShirts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{Number(s.price) > 0 ? ` (เธฟ${Number(s.price).toLocaleString()})` : ''}</option>
                ))}
              </select>
            </div>

            {/* เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ */}
            <div style={{ background: useCollar ? 'transparent' : 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: useCollar ? 10 : 0 }}>
                <input type="checkbox" checked={useCollar} onChange={(e) => { setUseCollar(e.target.checked); setCollarId(''); reset() }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>เน€เธเธฅเธตเนเธขเธเธเธญเน€เธชเธทเนเธญ</span>
                {!useCollar && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>โ€” เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ (เนเธเนเธ•เธฒเธกเนเธเธเธ—เธตเนเน€เธฅเธทเธญเธ)</span>}
              </label>
              {useCollar && (
                <select className="select-d" value={collarId} onChange={(e) => { setCollarId(e.target.value); reset() }}>
                  <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ โ€”</option>
                  {collars.map((col) => (
                    <option key={col.id} value={col.id}>{col.name} {Number(col.price) > 0 ? `(เธฟ${Number(col.price).toLocaleString()})` : '(เธขเธฑเธเนเธกเนเธเธณเธซเธเธ”เธฃเธฒเธเธฒ)'}</option>
                  ))}
                </select>
              )}
            </div>

            {/* เน€เธเธทเนเธญเธเนเธฒ */}
            <div>
              <div className="section-label">เน€เธเธทเนเธญเธเนเธฒ</div>
              <select className="select-d" value={fabricId} onChange={(e) => { setFabricId(e.target.value); reset() }}>
                <option value="">เนเธกเนเธเธฃเน€เธฃเธตเธขเธ (เนเธกเนเธเธงเธเน€เธเธดเนเธก)</option>
                {fabricShirts.filter((s) => Number(s.price) > 0).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (+เธฟ{Number(s.price).toLocaleString()})</option>
                ))}
              </select>
            </div>

            {/* เธเธณเธเธงเธ */}
            <div>
              <div className="section-label">เธเธณเธเธงเธ (เธ•เธฑเธง)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-outline sm" onClick={() => { setQty((q) => Math.max(1, q - 1)); reset() }}>โ’</button>
                <input className="input-d" type="number" min={1} value={qty}
                  onChange={(e) => { setQty(Math.max(1, Number(e.target.value))); reset() }}
                  style={{ width: 80, textAlign: 'center' }} />
                <button className="btn-outline sm" onClick={() => { setQty((q) => q + 1); reset() }}>+</button>
              </div>
            </div>

            {/* เนเธเธฃเนเธกเธเธฑเนเธ active */}
            {activePromo && (
              <div style={{ background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: '#ff6060', fontWeight: 700, marginBottom: 8 }}>๐ {activePromo.name} โ€” เธชเธฑเนเธ {activePromo.min_qty}+ เธ•เธฑเธง</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activePromo.type === 'free' && (
                    <button className={promoChoice === 'free' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                      onClick={() => { setPromoChoice('free'); reset() }}>
                      เนเธ–เธกเธเธฃเธต {activePromo.free_qty} เธ•เธฑเธง
                    </button>
                  )}
                  <button className={promoChoice === 'discount' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                    onClick={() => { setPromoChoice('discount'); reset() }}>
                    {activePromo.type === 'free' || activePromo.type === 'discount_qty'
                      ? `เธฃเธฑเธเธชเนเธงเธเธฅเธ” ${activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty} เธ•เธฑเธง`
                      : activePromo.type === 'discount_pct' ? `เธฅเธ” ${activePromo.discount_pct}%`
                      : `เธฅเธ” เธฟ${activePromo.discount_thb.toLocaleString()}`}
                  </button>
                  <button className={promoChoice === '' ? 'btn-outline sm' : 'btn-ghost'} style={{ flex: 0.6 }}
                    onClick={() => { setPromoChoice(''); reset() }}>เนเธกเนเนเธเน</button>
                </div>
              </div>
            )}

            {/* เธเนเธญเธเธ—เธฒเธเธเธฑเธ”เธชเนเธ */}
            <div>
              <div className="section-label">เธเนเธญเธเธ—เธฒเธเธเธฑเธ”เธชเนเธ</div>
              <select className="select-d" value={shippingId} onChange={(e) => { setShippingId(e.target.value); reset() }}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเนเธญเธเธ—เธฒเธ โ€”</option>
                {shippingRules.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} {Number(r.price) > 0 ? `(เธฟ${Number(r.price).toLocaleString()})` : Number(r.price) === 0 && r.name === 'เธฃเธฑเธเธซเธเนเธฒเธฃเนเธฒเธ / เธเธฑเธ”เธฃเธฑเธ' ? '(เธเธฃเธต)' : '(เธชเธญเธเธ–เธฒเธก Admin)'}</option>
                ))}
              </select>
              {isCustomShipping && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#ffaa44', background: 'rgba(255,170,68,0.08)', border: '1px solid rgba(255,170,68,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                  โ ๏ธ เธเนเธญเธเธเธฒเธฃเธเธฑเธ”เธชเนเธเธเธญเธเธเธฒเธเธ—เธตเนเธกเธตเนเธซเนเน€เธฅเธทเธญเธ เธฃเธเธเธงเธเธชเธญเธเธ–เธฒเธก Admin
                </div>
              )}
            </div>

            {/* เธเธธเนเธกเธเธณเธเธงเธ“ */}
            <button className="btn-red" style={{ width: '100%', padding: '12px', fontSize: 15 }}
              onClick={() => setCalculated(true)}>
              ๐งฎ เธเธณเธเธงเธ“
            </button>

            {/* เธเธฅเธฅเธฑเธเธเน */}
            {calculated && (
              <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>๐“ เธชเธฃเธธเธเธฃเธฒเธเธฒเน€เธเธทเนเธญเธเธ•เนเธ</div>
                {[
                  ['เนเธเธเธ—เธตเนเน€เธฅเธทเธญเธ', selectedShirt ? `${selectedShirt.name} (เธฟ${shirtPrice.toLocaleString()})` : 'เธ•เธฒเธกเนเธเธ'],
                  ...(useCollar && collar ? [['เน€เธเธฅเธตเนเธขเธเธเธญเน€เธชเธทเนเธญ', `${collar.name} +เธฟ${collarPrice.toLocaleString()}`]] : []),
                  ['เน€เธเธทเนเธญเธเนเธฒ', fabricPrice > 0 ? `+เธฟ${fabricPrice.toLocaleString()}/เธ•เธฑเธง` : 'เนเธกเนเธเธฃเน€เธฃเธตเธขเธ (เนเธกเนเธเธงเธเน€เธเธดเนเธก)'],
                  [`เธฃเธงเธก/เธ•เธฑเธง ร— ${qty}`, `เธฟ${unitPrice.toLocaleString()} ร— ${qty} = เธฟ${(unitPrice*qty).toLocaleString()}`],
                  ...(promoChoice && activePromo ? [[`เนเธเธฃเนเธกเธเธฑเนเธ (${promoLabel})`, promoChoice === 'free' ? `๐ +${bonusQty} เธ•เธฑเธงเธเธฃเธต` : `-เธฟ${promoValue.toLocaleString()}`]] : []),
                  [`เธเนเธฒเธเธเธชเนเธ`, isCustomShipping ? 'เธชเธญเธเธ–เธฒเธก Admin' : shippingPrice > 0 ? `+เธฟ${shippingPrice.toLocaleString()}` : shipping ? 'เธเธฃเธต' : 'เธขเธฑเธเนเธกเนเน€เธฅเธทเธญเธ'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                    <span style={{ color: String(val).startsWith('-') ? '#6fdf6f' : String(val).startsWith('๐') ? '#ff6060' : '#fff' }}>{val}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 20, color: '#ff4444' }}>
                  <span>เธฃเธงเธกเธ—เธฑเนเธเธซเธกเธ”</span>
                  <span>{isCustomShipping ? 'เธฟ' + subtotal.toLocaleString() + ' + เธเธเธชเนเธ' : 'เธฟ' + grandTotal.toLocaleString()}</span>
                </div>
                {promoChoice === 'free' && bonusQty > 0 && (
                  <div style={{ background: 'rgba(200,0,0,0.1)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#ff6060' }}>
                    ๐ เธฃเนเธฒเธเธเธฐเธ—เธณเน€เธชเธทเนเธญเนเธซเน {qty + bonusQty} เธ•เธฑเธง (เธชเธฑเนเธ {qty} + เนเธ–เธก {bonusQty})
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>* เธฃเธฒเธเธฒเธเธฃเธฐเธกเธฒเธ“เธเธฒเธฃ เธเธฃเธธเธ“เธฒเธขเธทเธเธขเธฑเธเธฃเธฒเธเธฒเธเธฃเธดเธเธเธฑเธเธ—เธฒเธเธฃเนเธฒเธ</div>

                {/* เธเธธเนเธกเธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ */}
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  {contact?.facebook_url && (
                    <a href={contact.facebook_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#1877f2', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      ๐“ เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธเนเธฒเธ Facebook
                    </a>
                  )}
                  {contact?.line_url && (
                    <a href={contact.line_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#06c755', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      ๐’ฌ เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธเนเธฒเธ Line{contact.line_add ? ` (${contact.line_add})` : ''}
                    </a>
                  )}
                  {contact?.phone1 && (
                    <a href={`tel:${contact.phone1}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)', color: '#ffaa44', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      ๐“ฑ เนเธ—เธฃ {contact.phone1}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* โ”€โ”€ Auth Pages โ”€โ”€ */
function AdminLogin({ onLogin, onBack }: { onLogin: (u: string) => void, onBack: () => void }) {
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  return (
    <AuthShell title="เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ Admin" badge="ADMIN ONLY">
      <input className="input-d" placeholder="Name ID เน€เธเนเธ ceo edit00" value={id} onChange={(e) => setId(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('เธเธทเนเธญเธเธนเนเนเธเนเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ'))} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={() => ADMIN_ACCOUNTS[id] === pw ? onLogin(id) : setErr('เธเธทเนเธญเธเธนเนเนเธเนเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ')}>เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ Admin</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>โ เธเธฅเธฑเธ</button>
    </AuthShell>
  )
}

function CustLogin({ customers, onLogin, onBack, onReg }: {
  customers: Customer[], onLogin: (u: Customer) => void, onBack: () => void, onReg: () => void
}) {
  const [em, setEm] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const go = () => { const u = customers.find((c) => c.email === em && c.password === pw); if (u) onLogin(u); else setErr('เธญเธตเน€เธกเธฅเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ') }
  return (
    <AuthShell title="เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธชเธกเธฒเธเธดเธ">
      <input className="input-d" placeholder="เธญเธตเน€เธกเธฅ" value={em} onChange={(e) => setEm(e.target.value)} style={{ marginBottom: 10 }} />
      <input className="input-d" type="password" placeholder="เธฃเธซเธฑเธชเธเนเธฒเธ" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} style={{ marginBottom: 14 }} />
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} onClick={go}>เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ</button>
      <button className="btn-outline" style={{ width: '100%', marginBottom: 8 }} onClick={onReg}>เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเนเธซเธกเน</button>
      <button className="btn-outline" style={{ width: '100%', opacity: .65, fontSize: 12 }} onClick={onBack}>เนเธกเนเธฅเนเธญเธเธญเธดเธ โ€” เน€เธเนเธฒเธเธกเนเธ”เนเน€เธฅเธข</button>
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
    if (!f.name || !f.email || !f.password) return setErr('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเธ—เธตเนเธเธณเน€เธเนเธ')
    if (f.password !== f.confirm) return setErr('เธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ•เธฃเธเธเธฑเธ')
    if (customers.find((c) => c.email === f.email)) return setErr('เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเธเธฒเธเนเธฅเนเธง')
    setSaving(true)
    await onSave({ name: f.name, email: f.email, phone: f.phone, facebook: f.facebook, password: f.password })
    setSaving(false)
  }
  return (
    <AuthShell title="เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ" sub="เธเนเธญเธกเธนเธฅเธ–เธนเธเน€เธเนเธเนเธ Supabase เธญเธขเนเธฒเธเธเธฅเธญเธ”เธ เธฑเธข">
      {([['name', 'เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ *', 'text'], ['email', 'เธญเธตเน€เธกเธฅ *', 'email'], ['phone', 'เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน', 'tel'], ['facebook', 'Facebook (เนเธเธฐเธเธณ)', 'text'], ['password', 'เธฃเธซเธฑเธชเธเนเธฒเธ *', 'password'], ['confirm', 'เธขเธทเธเธขเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธ *', 'password']] as const).map(([k, lb, tp]) => (
        <input key={k} className="input-d" type={tp} placeholder={lb} value={(f as any)[k]} onChange={(e) => set(k, e.target.value)} style={{ marginBottom: 10 }} />
      ))}
      {err && <ErrMsg msg={err} />}
      <button className="btn-red" style={{ width: '100%', marginBottom: 8 }} disabled={saving} onClick={go}>{saving ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : 'เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธ'}</button>
      <button className="btn-outline" style={{ width: '100%' }} onClick={onBack}>โ เธเธฅเธฑเธ</button>
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

/* โ”€โ”€ Contact Modal โ”€โ”€ */
function ContactModal({ onClose }: { onClose: () => void }) {
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contact_settings').select('*').eq('id', 'main').single()
      .then(({ data }) => { if (data) setContact(data); setLoading(false) })
  }, [])

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              ๐“ เธเนเธญเธเธ—เธฒเธเธเธฒเธฃเธ•เธดเธ”เธ•เนเธญ
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธ•เธดเธ”เธ•เนเธญเน€เธฃเธฒเนเธ”เนเน€เธฅเธข</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>โ•</button>
        </div>

        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>
          ) : !contact ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#ff6060' }}>เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธ”เน</div>
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
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>เธเธฅเธดเธเน€เธเธทเนเธญเนเธเธขเธฑเธ Facebook</div>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>โ’</span>
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
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>เธเธฅเธดเธเน€เธเธทเนเธญเน€เธเธดเนเธกเน€เธเธทเนเธญเธเนเธ Line</div>
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>โ’</span>
                  </a>
                  {/* QR เนเธ•เนเธเธธเนเธก Line */}
                  {contact.line_qr_url && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src={contact.line_qr_url} alt="Line QR" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>เธชเนเธเธ QR เน€เธเธดเนเธกเน€เธเธทเนเธญเธ Line</div>
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
                      <span style={{ fontSize: 20 }}>๐“ฑ</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>เนเธ—เธฃเธจเธฑเธเธ—เน</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone1}</div>
                      </div>
                    </a>
                  )}
                  {contact.phone2 && (
                    <a href={`tel:${contact.phone2}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', transition: 'border-color .15s' }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = '#c00')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>
                      <span style={{ fontSize: 20 }}>๐“ฑ</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>เนเธ—เธฃเธจเธฑเธเธ—เน</div>
                        <div style={{ fontWeight: 600, color: '#ffaa44', fontSize: 13 }}>{contact.phone2}</div>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {/* Address */}
              {contact.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 10, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 20, marginTop: 2 }}>๐“</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>เธ•เธดเธ”เธ•เนเธญเธ—เธตเนเธซเธเนเธฒเธฃเนเธฒเธ</div>
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

/* โ”€โ”€ Price Calculator โ”€โ”€ */
function PriceCalculator({ shirts, collars, promotions, shippingRules, onClose }: {
  shirts: Shirt[], collars: CollarWithPrice[],
  promotions: Promotion[], shippingRules: ShippingRule[],
  onClose: () => void
}) {
  const [collarId, setCollarId] = useState('')
  const [fabricId, setFabricId] = useState('')
  const [qty, setQty] = useState(1)
  const [shippingId, setShippingId] = useState('')
  const [promoChoice, setPromoChoice] = useState<'free'|'discount'|''>('')
  const [calculated, setCalculated] = useState(false)
  const [contact, setContact] = useState<any>(null)
  const [showContact, setShowContact] = useState(false)

  useEffect(() => {
    supabase.from('contact_settings').select('*').eq('id','main').single()
      .then(({ data }) => { if (data) setContact(data) })
  }, [])

  // เธฃเธฒเธเธฒเธเธญเน€เธชเธทเนเธญ
  const collar = collars.find((c) => c.id === collarId)
  const collarPrice = collar ? Number(collar.price) : 0

  // เธฃเธฒเธเธฒเน€เธเธทเนเธญเธเนเธฒ (เน€เธเธเธฒเธฐ category=fabric, default=0)
  const fabricShirts = shirts.filter((s) => s.category === 'fabric')
  const fabric = fabricShirts.find((s) => s.id === fabricId)
  const fabricPrice = fabric ? Number(fabric.price) : 0

  // เธฃเธฒเธเธฒเธเธเธชเนเธ
  const shipping = shippingRules.find((r) => r.id === shippingId)
  const shippingPrice = shipping ? Number(shipping.price) : 0

  // เนเธเธฃเนเธกเธเธฑเนเธ active
  const activePromo = promotions.find((p) => p.is_active && qty >= p.min_qty)

  // เธเธณเธเธงเธ“
  const unitPrice = collarPrice + fabricPrice
  let subtotal = unitPrice * qty
  let promoLabel = ''
  let promoValue = 0
  let bonusQty = 0

  if (activePromo && promoChoice) {
    if (promoChoice === 'free') {
      bonusQty = activePromo.free_qty
      promoLabel = `เนเธ–เธกเธเธฃเธต ${bonusQty} เธ•เธฑเธง`
      promoValue = 0
    } else {
      if (activePromo.type === 'free' || activePromo.type === 'discount_qty') {
        const dq = activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty
        promoValue = unitPrice * dq
        promoLabel = `เธฅเธ”เธฃเธฒเธเธฒเน€เธ—เธตเธขเธเน€เธ—เนเธฒ ${dq} เธ•เธฑเธง`
      } else if (activePromo.type === 'discount_pct') {
        promoValue = Math.round(subtotal * activePromo.discount_pct / 100)
        promoLabel = `เธฅเธ” ${activePromo.discount_pct}%`
      } else if (activePromo.type === 'discount_thb') {
        promoValue = activePromo.discount_thb
        promoLabel = `เธฅเธ” เธฟ${activePromo.discount_thb.toLocaleString()}`
      }
      subtotal = Math.max(0, subtotal - promoValue)
    }
  }

  const grandTotal = subtotal + shippingPrice

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440, maxHeight: '92vh', overflowY: 'auto', padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowY: 'auto', maxHeight: '92vh' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#c00,#800)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>๐งฎ เธเธณเธเธงเธ“เธฃเธฒเธเธฒเน€เธเธทเนเธญเธเธ•เนเธ</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>เธฃเธฒเธเธฒ = เธเธญเน€เธชเธทเนเธญ + เน€เธเธทเนเธญเธเนเธฒ + เธเธเธชเนเธ - เนเธเธฃเนเธกเธเธฑเนเธ</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>โ•</button>
          </div>

          <div style={{ padding: '16px 20px', display: 'grid', gap: 14 }}>
            {/* เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ */}
            <div>
              <div className="section-label">เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ</div>
              <select className="select-d" value={collarId} onChange={(e) => { setCollarId(e.target.value); setCalculated(false) }}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ โ€”</option>
                {collars.map((col) => (
                  <option key={col.id} value={col.id}>{col.name} {Number(col.price) > 0 ? `(เธฟ${Number(col.price).toLocaleString()})` : '(เธขเธฑเธเนเธกเนเธเธณเธซเธเธ”เธฃเธฒเธเธฒ)'}</option>
                ))}
              </select>
            </div>

            {/* เน€เธเธทเนเธญเธเนเธฒ */}
            <div>
              <div className="section-label">เน€เธเธทเนเธญเธเนเธฒ <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(เนเธกเนเธเธงเธเน€เธเธดเนเธก = เน€เธฅเธทเธญเธเนเธกเนเธเธฃเน€เธฃเธตเธขเธ)</span></div>
              <select className="select-d" value={fabricId} onChange={(e) => { setFabricId(e.target.value); setCalculated(false) }}>
                <option value="">เนเธกเนเธเธฃเน€เธฃเธตเธขเธ (เธฟ0)</option>
                {fabricShirts.filter((s) => Number(s.price) > 0).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {Number(s.price) > 0 ? `(+เธฟ${Number(s.price).toLocaleString()})` : '(เนเธกเนเธเธงเธเน€เธเธดเนเธก)'}</option>
                ))}
              </select>
            </div>

            {/* เธเธณเธเธงเธ */}
            <div>
              <div className="section-label">เธเธณเธเธงเธ (เธ•เธฑเธง)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-outline sm" onClick={() => { setQty((q) => Math.max(1, q - 1)); setCalculated(false) }}>โ’</button>
                <input className="input-d" type="number" min={1} value={qty}
                  onChange={(e) => { setQty(Math.max(1, Number(e.target.value))); setCalculated(false) }}
                  style={{ width: 80, textAlign: 'center' }} />
                <button className="btn-outline sm" onClick={() => { setQty((q) => q + 1); setCalculated(false) }}>+</button>
              </div>
            </div>

            {/* เนเธเธฃเนเธกเธเธฑเนเธ */}
            {activePromo && (
              <div style={{ background: 'rgba(200,0,0,0.1)', border: '1px solid rgba(200,0,0,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: '#ff6060', fontWeight: 700, marginBottom: 8 }}>๐ {activePromo.name} โ€” เธชเธฑเนเธ {activePromo.min_qty}+ เธ•เธฑเธง</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(activePromo.type === 'free') && (
                    <button className={promoChoice === 'free' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                      onClick={() => { setPromoChoice('free'); setCalculated(false) }}>
                      เนเธ–เธกเธเธฃเธต {activePromo.free_qty} เธ•เธฑเธง
                    </button>
                  )}
                  <button className={promoChoice === 'discount' ? 'btn-red sm' : 'btn-outline sm'} style={{ flex: 1 }}
                    onClick={() => { setPromoChoice('discount'); setCalculated(false) }}>
                    {activePromo.type === 'free' || activePromo.type === 'discount_qty'
                      ? `เธฃเธฑเธเธชเนเธงเธเธฅเธ” ${activePromo.type === 'free' ? activePromo.free_qty : activePromo.discount_qty} เธ•เธฑเธง`
                      : activePromo.type === 'discount_pct' ? `เธฅเธ” ${activePromo.discount_pct}%`
                      : `เธฅเธ” เธฟ${activePromo.discount_thb.toLocaleString()}`}
                  </button>
                  <button className={promoChoice === '' ? 'btn-outline sm' : 'btn-ghost'} style={{ flex: 0.6 }}
                    onClick={() => { setPromoChoice(''); setCalculated(false) }}>เนเธกเนเนเธเน</button>
                </div>
              </div>
            )}

            {/* เธเนเธฒเธเธเธชเนเธ */}
            <div>
              <div className="section-label">เธเนเธญเธเธ—เธฒเธเธเธฑเธ”เธชเนเธ</div>
              <select className="select-d" value={shippingId} onChange={(e) => { setShippingId(e.target.value); setCalculated(false) }}>
                <option value="">โ€” เน€เธฅเธทเธญเธเธเนเธญเธเธ—เธฒเธ โ€”</option>
                {shippingRules.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} {Number(r.price) > 0 ? `(เธฟ${Number(r.price).toLocaleString()})` : '(เธเธฃเธต)'}</option>
                ))}
              </select>
            </div>

            {/* เธเธธเนเธกเธเธณเธเธงเธ“ */}
            <button className="btn-red" style={{ width: '100%', padding: '12px' }}
              onClick={() => setCalculated(true)}>
              ๐งฎ เธเธณเธเธงเธ“
            </button>

            {/* เธเธฅเธฅเธฑเธเธเน */}
            {calculated && (
              <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>๐“ เธชเธฃเธธเธเธฃเธฒเธเธฒเน€เธเธทเนเธญเธเธ•เนเธ</div>
                {[
                  ['เธเธฃเธฐเน€เธ เธ—เธเธญเน€เธชเธทเนเธญ', `เธฟ${collarPrice.toLocaleString()}/เธ•เธฑเธง`],
                  ['เน€เธเธทเนเธญเธเนเธฒ', fabricPrice > 0 ? `+เธฟ${fabricPrice.toLocaleString()}/เธ•เธฑเธง` : 'เนเธกเนเธเธงเธเน€เธเธดเนเธก'],
                  [`เธฃเธฒเธเธฒเธ•เนเธญเธ•เธฑเธง ร— ${qty}`, `เธฟ${unitPrice.toLocaleString()} ร— ${qty} = เธฟ${(unitPrice*qty).toLocaleString()}`],
                  ...(promoChoice && activePromo ? [[`เนเธเธฃเนเธกเธเธฑเนเธ (${promoLabel})`, promoChoice === 'free' ? `+${bonusQty} เธ•เธฑเธงเธเธฃเธต` : `-เธฟ${promoValue.toLocaleString()}`]] : []),
                  [`เธเนเธฒเธเธเธชเนเธ (${shipping?.name ?? 'เธขเธฑเธเนเธกเนเน€เธฅเธทเธญเธ'})`, shippingPrice > 0 ? `+เธฟ${shippingPrice.toLocaleString()}` : 'เธเธฃเธต'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                    <span style={{ color: String(val).startsWith('-') ? '#6fdf6f' : '#fff' }}>{val}</span>
                  </div>
                ))}
                {promoChoice === 'free' && bonusQty > 0 && (
                  <div style={{ background: 'rgba(200,0,0,0.1)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#ff6060' }}>
                    ๐ เธฃเนเธฒเธเธเธฐเธ—เธณเน€เธชเธทเนเธญเนเธซเน {qty + bonusQty} เธ•เธฑเธง (เธชเธฑเนเธ {qty} + เนเธ–เธก {bonusQty})
                  </div>
                )}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 20, color: '#ff4444' }}>
                  <span>เธฃเธงเธกเธ—เธฑเนเธเธซเธกเธ”</span>
                  <span>เธฟ{grandTotal.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>* เธฃเธฒเธเธฒเธเธฃเธฐเธกเธฒเธ“เธเธฒเธฃ เธเธฃเธธเธ“เธฒเธขเธทเธเธขเธฑเธเธฃเธฒเธเธฒเธเธฃเธดเธเธเธฑเธเธ—เธฒเธเธฃเนเธฒเธ</div>

                {/* เธเธธเนเธกเธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ */}
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  {contact?.facebook_url && (
                    <a href={contact.facebook_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#1877f2', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      <span>๐“</span> เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธเนเธฒเธ Facebook
                    </a>
                  )}
                  {contact?.line_url && (
                    <a href={contact.line_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#06c755', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      <span>๐’ฌ</span> เธชเธเนเธเธชเธฑเนเธเธเธทเนเธญ เธเนเธฒเธ Line{contact.line_add ? ` (${contact.line_add})` : ''}
                    </a>
                  )}
                  {contact?.phone1 && (
                    <a href={`tel:${contact.phone1}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 8, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)', color: '#ffaa44', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                      <span>๐“ฑ</span> เนเธ—เธฃ {contact.phone1}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* โ”€โ”€ Contact Admin Modal โ”€โ”€ */
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
    supabase.from('contact_settings').select('*').eq('id', 'main').single()
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
    if (url) { set('line_qr_url', url); notify('เธญเธฑเธเนเธซเธฅเธ” QR เธชเธณเน€เธฃเนเธ') }
    else notify('เธญเธฑเธเนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ', 'err')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('contact_settings')
      .upsert({ id: 'main', ...f, updated_at: new Date().toISOString() })
    if (error) notify('เธเธฑเธเธ—เธถเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message, 'err')
    else { notify('เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธ•เธดเธ”เธ•เนเธญเนเธฅเนเธง โ“'); onClose() }
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
          <div style={{ fontWeight: 700, fontSize: 16 }}>๐“ เธเธฑเธ”เธเธฒเธฃเธเนเธญเธเธ—เธฒเธเธ•เธดเธ”เธ•เนเธญ</div>
          <button className="btn-outline sm" onClick={onClose}>โ• เธเธดเธ”</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>
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
                  <div className="section-label">เธเธทเนเธญเธ—เธตเนเนเธชเธ”เธ</div>
                  <input style={inp} value={f.facebook_label} onChange={e => set('facebook_label', e.target.value)} placeholder="เน€เธเนเธ Facebook Page" />
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
                  <div className="section-label">เธเธทเนเธญเธ—เธตเนเนเธชเธ”เธ</div>
                  <input style={inp} value={f.line_label} onChange={e => set('line_label', e.target.value)} placeholder="เน€เธเนเธ Line Official" />
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
                      <input style={{ ...inp, marginBottom: 6 }} value={f.line_qr_url} onChange={e => set('line_qr_url', e.target.value)} placeholder="URL เธฃเธนเธ QR เธซเธฃเธทเธญเธญเธฑเธเนเธซเธฅเธ”..." />
                      <button className="btn-outline sm" onClick={() => qrInputRef.current?.click()}>๐“ท เธญเธฑเธเนเธซเธฅเธ” QR</button>
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
                เน€เธเธญเธฃเนเนเธ—เธฃเธจเธฑเธเธ—เน
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div className="section-label">เน€เธเธญเธฃเนเธ—เธตเน 1</div>
                  <input style={inp} value={f.phone1} onChange={e => set('phone1', e.target.value)} placeholder="0xx-xxx-xxxx" />
                </div>
                <div>
                  <div className="section-label">เน€เธเธญเธฃเนเธ—เธตเน 2</div>
                  <input style={inp} value={f.phone2} onChange={e => set('phone2', e.target.value)} placeholder="0xx-xxx-xxxx" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>๐“ เธ—เธตเนเธญเธขเธนเนเธซเธเนเธฒเธฃเนเธฒเธ</div>
              <textarea
                style={{ ...inp, minHeight: 70, resize: 'vertical' as const }}
                value={f.address}
                onChange={e => set('address', e.target.value)}
                placeholder="เน€เธฅเธเธ—เธตเน เธ–เธเธ เธ•เธณเธเธฅ เธญเธณเน€เธ เธญ เธเธฑเธเธซเธงเธฑเธ” เธฃเธซเธฑเธชเนเธเธฃเธฉเธ“เธตเธขเน"
              />
            </div>

            {/* Save Button */}
            <button className="btn-red" style={{ width: '100%', padding: '12px' }} disabled={saving} onClick={handleSave}>
              {saving ? 'โณ เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : '๐’พ เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธ•เธดเธ”เธ•เนเธญ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* โ”€โ”€ Welcome Modal โ”€โ”€ */
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
          {shopSettings.shop_name || 'เธญเธตเนเธงเธชเธเธญเธฃเนเธ•'}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
          {shopSettings.shop_subtitle || 'เธฃเธงเธกเนเธเธเน€เธชเธทเนเธญเนเธฅเธฐเธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”'}
        </div>
        {/* Buttons */}
        <button onClick={onBrowse}
          style={{ width: '100%', background: '#c00', color: '#fff', border: 'none', padding: '14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          ๐‘• เน€เธเนเธฒเธเธกเนเธเธเน€เธชเธทเนเธญ
        </button>
        <button onClick={onAdmin}
          style={{ width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', padding: '13px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          ๐” เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ Admin
        </button>
      </div>
    </div>
  )
}

/* โ”€โ”€ Shop Admin Modal โ”€โ”€ */
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
    if (url) { setLogoUrl(url); notify('เธญเธฑเธเนเธซเธฅเธ”เนเธฅเนเธเนเธชเธณเน€เธฃเนเธ') }
    else notify('เธญเธฑเธเนเธซเธฅเธ”เนเธกเนเธชเธณเน€เธฃเนเธ', 'err')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('shop_settings').upsert({
      id: 'main', shop_name: name, shop_subtitle: subtitle, logo_url: logoUrl || null, updated_at: new Date().toISOString()
    })
    if (error) { notify('เธเธฑเธเธ—เธถเธเนเธกเนเธชเธณเน€เธฃเนเธ: ' + error.message, 'err') }
    else {
      setShopSettings((p: any) => ({ ...p, shop_name: name, shop_subtitle: subtitle, logo_url: logoUrl || null }))
      notify('เธเธฑเธเธ—เธถเธเธซเธเนเธฒเธ•เนเธญเธเธฃเธฑเธเนเธฅเนเธง โ“')
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
          <div style={{ fontWeight: 700, fontSize: 16 }}>๐ช เนเธเนเนเธเธซเธเนเธฒเธ•เนเธญเธเธฃเธฑเธ</div>
          <button className="btn-outline sm" onClick={onClose}>โ• เธเธดเธ”</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div className="section-label" style={{ textAlign: 'left', marginBottom: 8 }}>เนเธฅเนเธเนเธฃเนเธฒเธ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(200,0,0,0.4)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 28, color: '#fff', flexShrink: 0 }}>S</div>
              )}
              <div style={{ flex: 1 }}>
                <input style={{ ...inp, marginBottom: 6 }} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="URL เนเธฅเนเธเน เธซเธฃเธทเธญเธญเธฑเธเนเธซเธฅเธ”..." />
                <button className="btn-outline sm" onClick={() => logoInputRef.current?.click()}>๐“ท เธญเธฑเธเนเธซเธฅเธ”เนเธฅเนเธเน</button>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); e.target.value = '' }} />
          </div>

          {/* Shop Name */}
          <div>
            <div className="section-label">เธเธทเนเธญเธฃเนเธฒเธ</div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="เธเธทเนเธญเธฃเนเธฒเธ" />
          </div>

          {/* Subtitle */}
          <div>
            <div className="section-label">เธเธณเธญเธเธดเธเธฒเธขเนเธ•เนเธเธทเนเธญเธฃเนเธฒเธ</div>
            <input style={inp} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="เธฃเธงเธกเนเธเธเน€เธชเธทเนเธญเนเธฅเธฐเธชเธดเธเธเนเธฒเธ—เธฑเนเธเธซเธกเธ”" />
          </div>

          {/* Preview */}
          <div style={{ background: '#0d0d0d', borderRadius: 10, padding: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 12, letterSpacing: 1 }}>PREVIEW</div>
            {logoUrl ? (
              <img src={logoUrl} alt="preview" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block' }} />
            ) : (
              <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#c00,#800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#fff', margin: '0 auto 8px' }}>S</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 }}>{name || 'เธเธทเนเธญเธฃเนเธฒเธ'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle || 'เธเธณเธญเธเธดเธเธฒเธข'}</div>
          </div>

          <button className="btn-red" style={{ width: '100%', padding: '12px' }} disabled={saving} onClick={handleSave}>
            {saving ? 'โณ เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : '๐’พ เธเธฑเธเธ—เธถเธเธซเธเนเธฒเธ•เนเธญเธเธฃเธฑเธ'}
          </button>
        </div>
      </div>
    </div>
  )
}

