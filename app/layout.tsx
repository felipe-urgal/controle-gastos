import type { Metadata, Viewport } from "next";

import { AuthProvider, ThemeProvider, UIProvider } from "@/app/context";
import { ClientLayout } from "@/app/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    siteName: 'Controle de Gastos',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Logo do Controle de Gastos',
      },
      {
        url: '/logo.png',
        width: 800,
        height: 418,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: {
      url: '/logo.png',
      width: 800,
      height: 418,
      alt: 'Controle de Gastos - Organize suas finanças',
    }
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' }
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Controle de Gastos" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Controle de Gastos" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="overscroll-none">
        <ThemeProvider>
          <AuthProvider>
            <UIProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </UIProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}