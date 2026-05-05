'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">載入中...</p></div>}>
      <LoginPage />
    </Suspense>
  )
}

function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const errorParam = searchParams.get('error')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(
    errorParam === 'AccessDenied'
      ? '您的帳號不是員工或管理員，請聯絡 mim 管理員開通 EMPLOYEE 權限。'
      : ''
  )

  const handleCredentials = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await signIn('credentials', {
      account,
      password,
      callbackUrl,
      redirect: false,
    })
    if (res?.error) {
      setError('帳號或密碼錯誤，或您不是員工/管理員。')
      setSubmitting(false)
      return
    }
    if (res?.ok) {
      window.location.href = callbackUrl
    } else {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#1a365d]">冠毅進銷存</h1>
          <p className="text-sm text-gray-500 mt-1">員工登入</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email 或手機號碼</label>
            <input
              type="text"
              value={account}
              onChange={e => setAccount(e.target.value)}
              placeholder="your@email.com 或 0912345678"
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-[#1a365d] focus:outline-none"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-[#1a365d] focus:outline-none"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-[#1a365d] text-white text-sm hover:bg-[#0f2540] disabled:opacity-50"
          >
            {submitting ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="my-4 flex items-center text-xs text-gray-400">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="mx-3">或</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        <button
          onClick={() => signIn('line', { callbackUrl })}
          className="w-full px-4 py-2 bg-[#06C755] text-white text-sm hover:bg-[#04a93f]"
        >
          使用 LINE 帳號登入
        </button>

        <p className="mt-6 text-xs text-gray-400 text-center">
          只有 ADMIN / EMPLOYEE 角色可進入進銷存系統
        </p>
      </div>
    </div>
  )
}
