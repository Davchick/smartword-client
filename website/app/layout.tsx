import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'SmartWord — Учи языки с ИИ',
  description: 'Создавай личные словари и практикуйся с Lexi — твоим ИИ-собеседником. Самый умный способ учить и запоминать новые слова навсегда.',
  keywords: ['изучение языков', 'ИИ репетитор', 'словарный запас', 'карточки', 'словарь', 'учить языки', 'английский'],
  openGraph: {
    title: 'SmartWord — Учи языки с ИИ',
    description: 'Создавай личные словари и практикуйся с Lexi — твоим ИИ-собеседником.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartWord — Учи языки с ИИ',
    description: 'Создавай личные словари и практикуйся с Lexi — твоим ИИ-собеседником.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
