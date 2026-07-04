import { useAuthStore } from '@/store/auth'

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().token
}

export function getToken(): string | null {
  return useAuthStore.getState().token
}