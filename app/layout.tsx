import type { Metadata } from 'next'
import { inter } from './fonts'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import TawkToScript from '@/components/TawkToScript'
import { headers } from 'next/headers'
import { Toaster } from "@/components/ui/toaster"
import { SidebarProvider } from '@/contexts/SidebarContext'
import { PWARegister } from './pwa'

export const metadata: Metadata = {
  title: 'Way of Glory Media',
  description: 'Professional Audio and Video Services for Churches',
  icons: [
    {
      rel: 'icon',
      type: 'image/x-icon',
      url: '/favicon.ico'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/apple-touch-icon.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/favicon-32x32.png'
    },
    {
      rel: 'icon', 
      type: 'image/png',
      sizes: '16x16',
      url: '/favicon-16x16.png'
    }
  ]
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const isAdmin = headersList.has('x-is-admin') && headersList.get('x-is-admin') === '1'
  const version = Date.now() // Add a version to force cache busting

  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1E3A8A" />
        
        {/* Preload critical assets */}
        <link 
          rel="preconnect" 
          href="https://fonts.googleapis.com" 
        />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="anonymous" 
        />
      </head>
      <body className="antialiased w-full" suppressHydrationWarning>
        <SidebarProvider>
          <div className="flex flex-col min-h-screen w-full relative">
            {children}
            <Analytics />
            <SpeedInsights />
          </div>
        </SidebarProvider>
        <TawkToScript />
        <Toaster />
      </body>
    </html>
  )
}
