'use client'

import AuthScreen, { AuthUser } from '@/components/auth-screen'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback } from 'react'

const TOKEN_KEY = 'nutrilife_auth_token'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleAuthenticated = useCallback((token: string, _user: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, token)
    const requested = searchParams.get('redirect') || '/'
    const destination = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/'
    router.replace(destination)
  }, [router, searchParams])

  return <AuthScreen onAuthenticated={handleAuthenticated} onBack={() => router.push('/')} />
}

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-loading">Menyiapkan halaman masuk…</main>}>
    <LoginPageContent />
  </Suspense>
}
