import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Partner {
  id: string
  business_name: string
  email: string
  status: string
  tier: string
}

interface AuthState {
  token: string | null
  partner: Partner | null
  setAuth: (token: string, partner: Partner) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      partner: null,
      setAuth: (token, partner) => set({ token, partner }),
      logout: () => set({ token: null, partner: null }),
    }),
    {
      name: 'paykore_auth',
      // Only persist token and partner — not the actions.
      partialize: (state) => ({ token: state.token, partner: state.partner }),
    }
  )
)