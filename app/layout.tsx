'use client'

import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { AppStateProvider } from '@/components/AppStateProvider'
import { ToastProvider } from '@/components/ToastProvider'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>NutriPlan AI - Personalised Chronic Disease Dietary Planner</title>
        <meta
          name="description"
          content="Create personalized meal plans for chronic diseases using AI. Manage diabetes, hypertension, CKD, and more with culturally relevant Indian cuisine."
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          <AppStateProvider>
            <Navbar />
            <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">{children}</main>
          </AppStateProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
