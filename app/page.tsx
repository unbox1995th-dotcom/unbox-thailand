'use client'

export default function Home() {
  // Redirect to client-side app
  if (typeof window !== 'undefined') {
    window.location.href = '/catalog'
  }
  return null
}
