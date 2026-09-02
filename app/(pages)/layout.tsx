// importing script
import Script from "next/script";

// importing metadata
import type { Metadata, Viewport } from "next";

// importing components
import { Providers } from "@/app/context";
import { ClientLayout } from "@/app/components/layout";

// importing css
import "@/app/stylesheets/globals.css";
import "@/app/stylesheets/app-shell.css";

// importing font
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://controle-gastos-pessoal.vercel.app/"),
  title: "Controle de Gastos",
  description: "Ferramenta para controlar seus gastos financeiros",
  openGraph: {
    title: "Controle de Gastos",
    description: "Ferramenta para controlar seus gastos financeiros",
    url: "https://controle-gastos-pessoal.vercel.app/",
    siteName: "Controle de Gastos",
    images: [
      {
        url: "https://controle-gastos-pessoal.vercel.app/logo.png",
        width: 1200,
        height: 630,
        alt: "Logo do Controle de Gastos",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Controle de Gastos",
    description: "Organize suas finanças de forma simples",
    images: [
      "https://controle-gastos-pessoal.vercel.app/logo.png"
    ],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Controle de Gastos",
  },
  applicationName: "Controle de Gastos",
  robots: {
    index: true,
    follow: true,
  },
  category: "finance",
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1115' }
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="format-detection" content="telephone=no" />

        <Script id="theme-script" strategy="beforeInteractive">
          {`
            try {
              const stored = localStorage.getItem('theme');
              const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const theme = stored || (system ? 'dark' : 'light');
              document.documentElement.dataset.theme = theme;
            } catch (e) {}
          `}
        </Script>
      </head>
      <body className={`${inter.className} overscroll-none`}>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
};
