import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, AlertCircle,
  Tags, ChevronLeft, ChevronRight, LogOut, Server, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/incidents', icon: AlertCircle, label: 'Incidentes' },
  { to: '/clients', icon: Building2, label: 'Clientes' },
  { to: '/technicians', icon: Users, label: 'Técnicos', adminOnly: true },
  { to: '/tags', icon: Tags, label: 'Tags', adminOnly: true },
];

/** Sidebar lateral — visible sólo en md+ */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true',
  );
  const { technician, logout, isAdmin } = useAuth();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'sidebar-transition hidden md:flex h-screen flex-col shrink-0 border-r border-border bg-card',
        collapsed ? 'w-[60px]' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-14 shrink-0 items-center border-b border-border',
        collapsed ? 'justify-center px-2' : 'justify-between px-4',
      )}>
        {collapsed ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Server className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Server className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-none">IntegraIT</p>
                <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground mt-0.5">
                  knowledge base
                </p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Colapsar sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center py-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Expandir sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border p-2 space-y-1">
        {!collapsed && technician && (
          <div className="mb-1 rounded-md bg-accent px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                {technician.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{technician.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{technician.role}</p>
              </div>
            </div>
          </div>
        )}

        <div className={cn('flex', collapsed ? 'flex-col items-center gap-1' : 'items-center gap-1 px-1')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Cambiar tema"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={handleLogout}
            className={cn(
              'text-muted-foreground hover:text-destructive',
              collapsed ? 'h-8 w-8' : 'flex-1 justify-start gap-2',
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}

/** Header top bar — visible sólo en mobile (< md) */
export function MobileTopBar() {
  const { technician } = useAuth();
  const { toggle, isDark } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Server className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">IntegraIT</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Cambiar tema"
          className="h-8 w-8 text-muted-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {technician && (
          <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {technician.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}

/** Bottom navigation bar — visible sólo en mobile (< md) */
export function MobileBottomNav() {
  const { isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).slice(0, 5);
  const cols = visibleItems.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card safe-area-pb md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-[56px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
