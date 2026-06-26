import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '사업자번호 조회',
  description: '사업자번호 실시간 조회',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
        <Toaster />
      </body>
    </html>
  )
}
