import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { EstoqueProvider } from '@/contexts/EstoqueContext'
import { DobraProvider } from '@/contexts/DobraContext'
import { DesenvolvimentoProvider } from '@/contexts/DesenvolvimentoContext'
import { ConjuntosProvider } from '@/contexts/ConjuntosContext'
import { Toaster } from '@/components/ui/toast'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    template: `%s — ${APP_NAME} ERP`,
    default: `${APP_NAME} — ${APP_DESCRIPTION}`,
  },
  description: APP_DESCRIPTION,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
          storageKey="forge-erp-theme"
        >
          <AuthProvider>
            <EstoqueProvider>
              <DobraProvider>
                <DesenvolvimentoProvider>
                  <ConjuntosProvider>
                    {children}
                    <Toaster />
                  </ConjuntosProvider>
                </DesenvolvimentoProvider>
              </DobraProvider>
            </EstoqueProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
