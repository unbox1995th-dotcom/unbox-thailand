import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client หลัก (สำหรับ Storage เท่านั้น)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const db = supabase

export type Shirt = {
  id: string
  name: string
  collar_type: string
  product_type: string
  price: number
  category: string
  is_promo: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export type Banner = {
  id: string
  name: string
  image_url: string
  sort_order: number
  created_at: string
}

export type Collar = {
  id: string
  name: string
  sort_order: number
}

export type ProductType = {
  id: string
  name: string
  sort_order: number
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  facebook: string
  password: string
  joined_at: string
}

// Upload image to Supabase Storage, return public URL
export async function uploadImage(file: File, folder = 'shirts'): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('shirt-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) { console.error('Upload error:', error); return null }
  const { data } = supabase.storage.from('shirt-images').getPublicUrl(path)
  return data.publicUrl
}

// Upload base64 image (from drag-drop preview)
export async function uploadBase64Image(base64: string, folder = 'shirts'): Promise<string | null> {
  const res = await fetch(base64)
  const blob = await res.blob()
  const file = new File([blob], `image.jpg`, { type: blob.type || 'image/jpeg' })
  return uploadImage(file, folder)
}

// ⚠️ SAFE DELETE — ไม่ลบไฟล์จาก Storage จริง เพื่อป้องกันรูปหาย
export async function deleteImage(_url: string): Promise<void> {
  return
}

// บันทึก log ก่อนลบ record
export async function logDeletion(params: {
  table_name: string
  record_id: string
  record_name?: string
  image_url?: string | null
  deleted_by?: string
}): Promise<void> {
  try {
    await db.from('deletion_log').insert([{
      table_name: params.table_name,
      record_id: params.record_id,
      record_name: params.record_name || '',
      image_url: params.image_url || null,
      deleted_by: params.deleted_by || 'admin',
    }])
  } catch (e) {
    console.error('Log deletion error:', e)
  }
}

