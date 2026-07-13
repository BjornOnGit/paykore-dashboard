import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VerifyOtpState {
  email: string
  purpose: 'signup' | 'login'
}

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const state = location.state as VerifyOtpState | null

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  // If someone lands here directly (refresh, bookmarked link) without the
  // email/purpose passed via navigation state, send them back to register
  // rather than rendering a broken form.
  if (!state?.email || !state?.purpose) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              We couldn't find a pending verification. Please register or sign in again.
            </p>
            <Link to="/register" className="text-primary font-medium hover:underline text-sm">
              Back to registration
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/v1/auth/verify-otp', {
        email: state!.email,
        code,
        purpose: state!.purpose,
      })
      const { token, partner_id, business_name, email, status, tier } = res.data.data
      setAuth(token, { id: partner_id, business_name, email, status, tier })
      navigate('/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message ?? 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendMessage('')
    setError('')
    setResending(true)
    try {
      await api.post('/v1/auth/resend-otp', { email: state!.email, purpose: state!.purpose })
      setResendMessage('A new code has been sent.')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        setResendMessage('Please wait a moment before requesting another code.')
      } else {
        setResendMessage('Could not resend code. Please try again shortly.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <span className="text-foreground">{state.email}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="code">Verification code</label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {resendMessage && <p className="text-sm text-muted-foreground">{resendMessage}</p>}
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-center w-full mt-4 text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {resending ? 'Sending…' : "Didn't get a code? Resend"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}