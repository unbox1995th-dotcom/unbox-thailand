'use client'
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase'

// ============================================================
// Types
// ============================================================
type SizeQty = { s: string; q: number }

type Order = {
  id: string
  rd: string | null       // receive date
  ag: string | null       // agent
  cu: string | null       // customer
  br: string | null       // brand
  pv: string | null       // province
  pr: string | null       // project name
  co: string | null       // color
  fb: string | null       // fabric
  ls: boolean | null      // logo screen
  ss: boolean | null      // sublimation screen
  sz: SizeQty[] | null    // sizes
  cl: string | null       // collar
  pt: string | null       // pattern
  ps: string | null       // patch
  pn: string | null       // machine
  gd: string | null       // design group
  gp: string | null       // group
  qt: number | null       // quantity
  px: number | null       // price
  du: string | null       // due date
  st: string | null       // status
  urgent: boolean | null
  created_at: string
  updated_at: string
}

// ============================================================
// Constants
// ============================================================
const STATUS_LIST = [
  'รอแบบ',
  'สรุปแบบ',
  'ส่งผลิต',
  'กำลังเย็บ',
  'รอซ่อม',
  'ยังไม่ได้รับสินค้า',
  'จัดส่งสำเร็จ',
]

const STATUS_COLOR: Record<string, string> = {
  'รอแบบ':              '#888',
  'สรุปแบบ':           '#3b82f6',
  'ส่งผลิต':           '#f59e0b',
  'กำลังเย็บ':         '#8b5cf6',
  'รอซ่อม':            '#ef4444',
  'ยังไม่ได้รับสินค้า': '#f97316',
  'จัดส่งสำเร็จ':      '#22c55e',
}

const ADMIN_ACCOUNTS: Record<string, string> = {
  'ceo edit00': '00000000', 'ceo edit01': '00001111', 'ceo edit02': '00002222',
  'ceo edit03': '00003333', 'ceo edit04': '00004444', 'ceo edit05': '00005555',
  'ceo edit06': '00006666', 'ceo edit07': '00007777', 'ceo edit08': '00008888',
  'ceo edit09': '00009999',
}

const EMPTY: Order = {
  id: '', rd: '', ag: 'ตัวแทน CEO', cu: '', br: 'EVO SPORT', pv: '', pr: '',
  co: '', fb: '', ls: false, ss: false, sz: [], cl: '', pt: '', ps: 'ไม่มี',
  pn: 'เครื่อง 1', gd: '', gp: 'BIG', qt: 0, px: 0, du: '', st: 'รอแบบ',
  urgent: false, created_at: '', updated_at: '',
}

type View = 'login' | 'list'
type Toast = { msg: string; type: 'ok' | 'err' }

// ============================================================
// Helpers
// ============================================================
function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}
function totalQty(sz: SizeQty[] | null) {
  if (!sz) return 0
  return sz.reduce((a, b) => a + (b.q || 0), 0)
}

// ============================================================
// Component
// ============================================================
export default function OrdersPage() {
  const [view, setView]             = useState<View>('login')
  const [adminUser, setAdminUser]   = useState<string | null>(null)
  const [orders, setOrders]         = useState<Order[]>([])
  const [loading, setLoading]       = useState(false)
  const [toast, setToast]           = useState<Toast | null>(null)

  // filters
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด')
  const [filterAgent, setFilterAgent]   = useState('ทั้งหมด')
  const [filterUrgent, setFilterUrgent] = useState(false)

  // modal
  const [showModal, setShowModal]   = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<Order>(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // detail drawer
  const [detail, setDetail]         = useState<Order | null>(null)

  // login
  const [loginUser, setLoginUser]   = useState('')
  const [loginPass, setLoginPass]   = useState('')

  // ── notify ──────────────────────────────────────────────
  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── auth ─────────────────────────────────────────────────
  useEffect(() => {
    const u = sessionStorage.getItem('adminUser')
    if (u && ADMIN_ACCOUNTS[u] !== undefined) {
      setAdminUser(u); setView('list')
    }
  }, [])

  function handleLogin() {
    const u = loginUser.trim().toLowerCase()
    if (ADMIN_ACCOUNTS[u] && ADMIN_ACCOUNTS[u] === loginPass) {
      sessionStorage.setItem('adminUser', u)
      setAdminUser(u); setView('list')
    } else {
      notify('รหัสผ่านไม่ถูกต้อง', 'err')
    }
  }
  function handleLogout() {
    sessionStorage.removeItem('adminUser')
    setAdminUser(null); setView('login')
  }

  // ── fetch ────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await db.from('orders').select('*').order('created_at', { ascending: false })
    setOrders((data as Order[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (view === 'list') fetchOrders() }, [view, fetchOrders])

  // ── filtered list ─────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (filterStatus !== 'ทั้งหมด' && o.st !== filterStatus) return false
    if (filterAgent  !== 'ทั้งหมด' && o.ag !== filterAgent)  return false
    if (filterUrgent && !o.urgent) return false
    if (search) {
      const q = search.toLowerCase()
      return [o.id, o.cu, o.br, o.pv, o.pr, o.co].some(v => v?.toLowerCase().includes(q))
    }
    return true
  })

  // ── save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!form.id.trim()) { notify('กรุณากรอก Order ID', 'err'); return }
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    if (editId) {
      const { error } = await db.from('orders').update(payload).eq('id', editId)
      if (error) { notify('แก้ไขไม่สำเร็จ', 'err'); setSaving(false); return }
      setOrders(prev => prev.map(o => o.id === editId ? { ...o, ...payload } : o))
      notify('แก้ไขสำเร็จ ✓')
    } else {
      const { data, error } = await db.from('orders').insert([payload]).select().single()
      if (error) { notify('เพิ่มไม่สำเร็จ: ' + error.message, 'err'); setSaving(false); return }
      setOrders(prev => [data as Order, ...prev])
      notify('เพิ่ม Order สำเร็จ ✓')
    }
    setSaving(false); setShowModal(false); setEditId(null); setForm(EMPTY)
  }

  // ── delete ────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await db.from('orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
    setConfirmDel(null); notify('ลบ Order สำเร็จ')
  }

  // ── status quick-change ───────────────────────────────────
  async function handleStatusChange(id: string, st: string) {
    await db.from('orders').update({ st, updated_at: new Date().toISOString() }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, st } : o))
  }

  // ── size helper ───────────────────────────────────────────
  function setSizeQty(sz: SizeQty[], s: string, q: number): SizeQty[] {
    const exists = sz.find(x => x.s === s)
    if (exists) return q <= 0 ? sz.filter(x => x.s !== s) : sz.map(x => x.s === s ? { ...x, q } : x)
    return q > 0 ? [...sz, { s, q }] : sz
  }
  const SIZE_OPTS = ['XS','S','M','L','XL','2XL','3XL','4XL','5XL']

  // ── stats ─────────────────────────────────────────────────
  const stats = {
    total:    orders.length,
    active:   orders.filter(o => o.st !== 'จัดส่งสำเร็จ').length,
    urgent:   orders.filter(o => o.urgent).length,
    revenue:  orders.reduce((a, o) => a + (o.px || 0) * (o.qt || 0), 0),
  }

  // ============================================================
  // Render: Login
  // ============================================================
  if (view === 'login') return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 40, width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#cc0000', letterSpacing: 2 }}>EVO SPORT</div>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Orders Management</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>Username</div>
          <input value={loginUser} onChange={e => setLoginUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="ceo edit00"
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>Password</div>
          <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleLogin}
          style={{ width: '100%', background: '#cc0000', border: 'none', borderRadius: 8, padding: '12px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          เข้าสู่ระบบ
        </button>
        {toast && <div style={{ marginTop: 16, textAlign: 'center', color: toast.type === 'err' ? '#ef4444' : '#22c55e', fontSize: 13 }}>{toast.msg}</div>}
      </div>
    </div>
  )

  // ============================================================
  // Render: Main
  // ============================================================
  const inp: React.CSSProperties = { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp }
  const lbl: React.CSSProperties = { color: '#666', fontSize: 11, marginBottom: 4, display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'ok' ? '#22c55e' : '#ef4444', color: '#fff', borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#cc0000', letterSpacing: 1 }}>EVO SPORT</span>
          <span style={{ color: '#333', fontSize: 18 }}>|</span>
          <span style={{ color: '#888', fontSize: 14 }}>Orders</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#555', fontSize: 12 }}>{adminUser}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #333', borderRadius: 6, padding: '5px 12px', color: '#888', fontSize: 12, cursor: 'pointer' }}>ออกจากระบบ</button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'ทั้งหมด',     value: stats.total,                         color: '#fff' },
            { label: 'กำลังดำเนินการ', value: stats.active,                    color: '#f59e0b' },
            { label: 'เร่งด่วน',    value: stats.urgent,                        color: '#ef4444' },
            { label: 'มูลค่ารวม',   value: '฿' + stats.revenue.toLocaleString(), color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ color: '#555', fontSize: 11, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Filters + Add ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ค้นหา ID, ลูกค้า, แบรนด์, จังหวัด..."
            style={{ ...inp, width: 260, flex: 'none' }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...sel, width: 140, flex: 'none' }}>
            <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
            {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ ...sel, width: 160, flex: 'none' }}>
            <option value="ทั้งหมด">ตัวแทน: ทั้งหมด</option>
            <option>ตัวแทน CEO</option>
            <option>ตัวแทนนอก</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#ef4444', fontSize: 13, flex: 'none' }}>
            <input type="checkbox" checked={filterUrgent} onChange={e => setFilterUrgent(e.target.checked)} />
            เร่งด่วนเท่านั้น
          </label>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#555', fontSize: 12 }}>{filtered.length} รายการ</span>
          <button onClick={() => { setForm(EMPTY); setEditId(null); setShowModal(true) }}
            style={{ background: '#cc0000', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + เพิ่ม Order
          </button>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#444', padding: 60 }}>กำลังโหลด...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #1e1e1e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#111', borderBottom: '1px solid #222' }}>
                  {['Order ID','วันรับ','ตัวแทน','ลูกค้า / แบรนด์','จังหวัด','โปรเจกต์','สี / ผ้า','จำนวน','ราคา/ตัว','ส่ง','สถานะ',''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: 48, color: '#333' }}>ไม่พบ Order</td></tr>
                )}
                {filtered.map((o, i) => (
                  <tr key={o.id}
                    style={{ background: i % 2 === 0 ? '#0d0d0d' : '#0a0a0a', borderBottom: '1px solid #161616', cursor: 'pointer' }}
                    onClick={() => setDetail(o)}>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{o.id}</span>
                      {o.urgent && <span style={{ marginLeft: 6, background: '#7f1d1d', color: '#fca5a5', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>เร่ง</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(o.rd)}</td>
                    <td style={{ padding: '11px 14px', color: '#aaa', whiteSpace: 'nowrap' }}>{o.ag || '-'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#ddd' }}>{o.cu || '-'}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{o.br}</div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#888' }}>{o.pv || '-'}</td>
                    <td style={{ padding: '11px 14px', color: '#aaa', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.pr || '-'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ color: '#ddd' }}>{o.co || '-'}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{o.fb}</div>
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>{totalQty(o.sz) || o.qt || 0}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                      {o.px ? '฿' + o.px.toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(o.du)}</td>
                    <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                      <select value={o.st || ''} onChange={e => handleStatusChange(o.id, e.target.value)}
                        style={{ background: STATUS_COLOR[o.st || ''] + '22', border: `1px solid ${STATUS_COLOR[o.st || ''] || '#333'}`, borderRadius: 6, padding: '4px 8px', color: STATUS_COLOR[o.st || ''] || '#888', fontSize: 12, cursor: 'pointer' }}>
                        {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setForm({ ...o }); setEditId(o.id); setShowModal(true) }}
                          style={{ background: '#1e3a5f', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#60a5fa', fontSize: 12, cursor: 'pointer' }}>แก้ไข</button>
                        <button onClick={() => setConfirmDel(o.id)}
                          style={{ background: '#3f1111', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}
          onClick={() => setDetail(null)}>
          <div style={{ flex: 1 }} />
          <div style={{ width: 420, background: '#111', borderLeft: '1px solid #222', height: '100%', overflowY: 'auto', padding: 28 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>{detail.id}</div>
                {detail.urgent && <span style={{ background: '#7f1d1d', color: '#fca5a5', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>เร่งด่วน</span>}
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'inline-block', background: STATUS_COLOR[detail.st || ''] + '22', border: `1px solid ${STATUS_COLOR[detail.st || ''] || '#333'}`, borderRadius: 8, padding: '6px 14px', color: STATUS_COLOR[detail.st || ''] || '#888', fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
              {detail.st}
            </div>

            {[
              ['ลูกค้า', detail.cu], ['แบรนด์', detail.br], ['ตัวแทน', detail.ag],
              ['จังหวัด', detail.pv], ['โปรเจกต์', detail.pr], ['สี', detail.co],
              ['ผ้า', detail.fb], ['คอเสื้อ', detail.cl], ['แพทเทิร์น', detail.pt],
              ['แพทช์', detail.ps], ['เครื่อง', detail.pn], ['กลุ่มดีไซน์', detail.gd],
              ['กลุ่ม', detail.gp], ['วันรับออเดอร์', fmtDate(detail.rd)],
              ['กำหนดส่ง', fmtDate(detail.du)],
              ['Logo Screen', detail.ls ? 'มี' : 'ไม่มี'],
              ['Sublimation', detail.ss ? 'มี' : 'ไม่มี'],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ color: '#555', fontSize: 13 }}>{k}</span>
                <span style={{ color: '#ddd', fontSize: 13, textAlign: 'right', maxWidth: 220 }}>{String(v) || '-'}</span>
              </div>
            ))}

            {/* Sizes */}
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <div style={{ color: '#555', fontSize: 13, marginBottom: 10 }}>ไซส์</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(detail.sz || []).map(s => (
                  <div key={s.s} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}>
                    <span style={{ color: '#888' }}>{s.s}</span>
                    <span style={{ color: '#fff', fontWeight: 700, marginLeft: 6 }}>×{s.q}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, color: '#888', fontSize: 13 }}>
                รวม <span style={{ color: '#fff', fontWeight: 700 }}>{totalQty(detail.sz)}</span> ตัว
                {detail.px ? <span> · ราคา <span style={{ color: '#f59e0b', fontWeight: 700 }}>฿{detail.px.toLocaleString()}</span>/ตัว</span> : null}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
              <button onClick={() => { setForm({ ...detail }); setEditId(detail.id); setDetail(null); setShowModal(true) }}
                style={{ flex: 1, background: '#cc0000', border: 'none', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                แก้ไข Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{editId ? 'แก้ไข Order' : 'เพิ่ม Order ใหม่'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Order ID */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Order ID *</label>
                <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                  placeholder="EV-T-001" style={inp} disabled={!!editId} />
              </div>

              {/* Row: rd, du */}
              <div>
                <label style={lbl}>วันรับออเดอร์</label>
                <input type="date" value={form.rd || ''} onChange={e => setForm(f => ({ ...f, rd: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>กำหนดส่ง</label>
                <input type="date" value={form.du || ''} onChange={e => setForm(f => ({ ...f, du: e.target.value }))} style={inp} />
              </div>

              {/* ag, br */}
              <div>
                <label style={lbl}>ตัวแทน</label>
                <select value={form.ag || ''} onChange={e => setForm(f => ({ ...f, ag: e.target.value }))} style={sel}>
                  <option>ตัวแทน CEO</option>
                  <option>ตัวแทนนอก</option>
                </select>
              </div>
              <div>
                <label style={lbl}>แบรนด์</label>
                <input value={form.br || ''} onChange={e => setForm(f => ({ ...f, br: e.target.value }))} style={inp} />
              </div>

              {/* cu, pv */}
              <div>
                <label style={lbl}>ชื่อลูกค้า</label>
                <input value={form.cu || ''} onChange={e => setForm(f => ({ ...f, cu: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>จังหวัด</label>
                <input value={form.pv || ''} onChange={e => setForm(f => ({ ...f, pv: e.target.value }))} style={inp} />
              </div>

              {/* pr full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>ชื่อโปรเจกต์</label>
                <input value={form.pr || ''} onChange={e => setForm(f => ({ ...f, pr: e.target.value }))} style={inp} />
              </div>

              {/* co, fb */}
              <div>
                <label style={lbl}>สี</label>
                <input value={form.co || ''} onChange={e => setForm(f => ({ ...f, co: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>ผ้า</label>
                <input value={form.fb || ''} onChange={e => setForm(f => ({ ...f, fb: e.target.value }))} style={inp} />
              </div>

              {/* cl, pt */}
              <div>
                <label style={lbl}>คอเสื้อ</label>
                <input value={form.cl || ''} onChange={e => setForm(f => ({ ...f, cl: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>แพทเทิร์น</label>
                <input value={form.pt || ''} onChange={e => setForm(f => ({ ...f, pt: e.target.value }))} style={inp} />
              </div>

              {/* ps, pn */}
              <div>
                <label style={lbl}>แพทช์</label>
                <input value={form.ps || ''} onChange={e => setForm(f => ({ ...f, ps: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>เครื่อง</label>
                <input value={form.pn || ''} onChange={e => setForm(f => ({ ...f, pn: e.target.value }))} style={inp} />
              </div>

              {/* gd, gp */}
              <div>
                <label style={lbl}>กลุ่มดีไซน์</label>
                <input value={form.gd || ''} onChange={e => setForm(f => ({ ...f, gd: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>กลุ่ม</label>
                <input value={form.gp || ''} onChange={e => setForm(f => ({ ...f, gp: e.target.value }))} style={inp} />
              </div>

              {/* px */}
              <div>
                <label style={lbl}>ราคาต่อตัว (฿)</label>
                <input type="number" value={form.px || ''} onChange={e => setForm(f => ({ ...f, px: +e.target.value }))} style={inp} />
              </div>

              {/* st */}
              <div>
                <label style={lbl}>สถานะ</label>
                <select value={form.st || ''} onChange={e => setForm(f => ({ ...f, st: e.target.value }))} style={sel}>
                  {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Sizes full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>ไซส์และจำนวน</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
                  {SIZE_OPTS.map(s => {
                    const cur = (form.sz || []).find(x => x.s === s)?.q || 0
                    return (
                      <div key={s} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#555', fontSize: 10, marginBottom: 3 }}>{s}</div>
                        <input type="number" min={0} value={cur || ''}
                          onChange={e => setForm(f => ({ ...f, sz: setSizeQty(f.sz || [], s, +e.target.value) }))}
                          style={{ ...inp, padding: '6px 4px', textAlign: 'center' }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>
                  รวม <span style={{ color: '#fff', fontWeight: 700 }}>{totalQty(form.sz)}</span> ตัว
                </div>
              </div>

              {/* flags */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#aaa' }}>
                  <input type="checkbox" checked={!!form.ls} onChange={e => setForm(f => ({ ...f, ls: e.target.checked }))} />
                  Logo Screen
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#aaa' }}>
                  <input type="checkbox" checked={!!form.ss} onChange={e => setForm(f => ({ ...f, ss: e.target.checked }))} />
                  Sublimation
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>
                  <input type="checkbox" checked={!!form.urgent} onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} />
                  🚨 เร่งด่วน
                </label>
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ marginTop: 24, width: '100%', background: saving ? '#555' : '#cc0000', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่ม Order'}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmDel(null)}>
          <div style={{ background: '#1a1a1a', border: '1px solid #cc0000', borderRadius: 14, padding: 32, textAlign: 'center', width: 320 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>ลบ Order?</div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>Order ID:</div>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 16, marginBottom: 24 }}>{confirmDel}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, background: '#222', border: '1px solid #333', borderRadius: 8, padding: 11, color: '#aaa', cursor: 'pointer' }}>
                ยกเลิก
              </button>
              <button onClick={() => handleDelete(confirmDel)}
                style={{ flex: 1, background: '#cc0000', border: 'none', borderRadius: 8, padding: 11, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
