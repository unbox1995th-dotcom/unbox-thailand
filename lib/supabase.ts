import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// Delete image from storage by URL
export async function deleteImage(url: string): Promise<void> {
  try {
    const parts = url.split('/shirt-images/')
    if (parts[1]) {
      await supabase.storage.from('shirt-images').remove([parts[1]])
    }
  } catch {}
}
