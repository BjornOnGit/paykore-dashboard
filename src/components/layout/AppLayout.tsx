import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'

const COLLAPSE_KEY = 'paykore_sidebar_collapsed'

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next))
      } catch {
        // localStorage unavailable — collapse state just won't persist across reloads
      }
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}