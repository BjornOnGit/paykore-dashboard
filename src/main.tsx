import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthenticated } from '@/lib/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Overview from '@/pages/Overview'
import Transactions from '@/pages/Transactions'
import APIKeys from '@/pages/APIKeys'
import Compliance from '@/pages/Compliance'
import Webhooks from '@/pages/Webhooks'
import Settlements from '@/pages/Settlements'
import Register from '@/pages/Register'
import VerifyOtp from '@/pages/VerifyOtp'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout>{children}</AppLayout>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Overview />
              </ProtectedLayout>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedLayout>
                <Transactions />
              </ProtectedLayout>
            }
          />
          <Route
            path="/api-keys"
            element={
              <ProtectedLayout>
                <APIKeys />
              </ProtectedLayout>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedLayout>
                <Compliance />
              </ProtectedLayout>
            }
          />
          <Route path="/webhooks" element={<ProtectedLayout><Webhooks /></ProtectedLayout>} />
          <Route path="/settlements" element={<ProtectedLayout><Settlements /></ProtectedLayout>} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          {/* Catch-all: redirect unknown paths to overview */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)