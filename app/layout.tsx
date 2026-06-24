import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UNBOX THAILAND-เสื้อพิมพ์ลายราคาถูกจากโรงงาน',
  description: 'เสื้อพิมพ์ลายราคาถูกจากโรงงาน คุณภาพสูง สั่งผลิตได้ตามใจ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}

