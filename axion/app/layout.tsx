import type { Metadata } from 'next'
import './globals.css'
import AIAnalysisTrigger from '@/components/AIAnalysisTrigger'

export const metadata: Metadata = {
  title: 'Axion — Estate Planning',
  description: 'The single place your entire estate lives.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#03040d', color: '#e8eaf6', margin: 0, fontFamily: "'Inter', sans-serif" }}>
        <AIAnalysisTrigger />
        {children}
      </body>
    </html>
  )
}
