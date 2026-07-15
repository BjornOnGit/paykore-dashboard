import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  KeyRound,
  ShieldCheck,
  Webhook,
  Landmark,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'API Keys', to: '/api-keys', icon: KeyRound },
  { label: 'Compliance', to: '/compliance', icon: ShieldCheck },
  { label: 'Webhooks', to: '/webhooks', icon: Webhook },
  { label: 'Settlements', to: '/settlements', icon: Landmark },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const partner = useAuthStore((s) => s.partner)
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen shrink-0 border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / brand */}
      <div className={cn('flex items-center h-14 shrink-0 border-b border-border', collapsed ? 'justify-center' : 'px-4')}>
        {collapsed ? (
          <span className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            P
          </span>
        ) : (
          <span className="text-sm font-semibold text-foreground">PayKore</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer: partner identity, logout, collapse toggle */}
      <div className="border-t border-border p-2 space-y-1">
        {!collapsed && partner && (
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-foreground truncate">{partner.business_name}</p>
            <p className="text-xs text-muted-foreground truncate">{partner.email}</p>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-3 w-full rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}