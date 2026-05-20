import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'รวมแบบเสื้อและสินค้าทั้งหมด',
  description: 'Shirt Catalog — ระบบจัดการแบบเสื้อ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
