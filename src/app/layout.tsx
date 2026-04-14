import type { Metadata } from 'next'
import './globals.css'
import './page-styles.css'

export const metadata: Metadata = {
  title: 'Dashly',
  description: 'Food delivery marketplace',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
