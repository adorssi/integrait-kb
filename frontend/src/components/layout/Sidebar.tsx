import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, AlertCircle,
  Tags, ChevronLeft, ChevronRight, LogOut, Monitor, UserCircle, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { ProfileDialog } from '@/components/ProfileDialog';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/incidents', icon: AlertCircle, label: 'Incidentes' },
  { to: '/clients', icon: Building2, label: 'Clientes' },
  { to: '/technicians', icon: Users, label: 'Técnicos', adminOnly: true },
  { to: '/tags', icon: Tags, label: 'Tags', adminOnly: true },
];

export function Sidebar() {
  const [isMd, setIsMd] = useState(() => window.innerWidth >= 768);
  const [collapsed, setCollapsed] = useState(() => {
    if (window.innerWidth < 768) return true;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [profileOpen, setProfileOpen] = useState(false);

  const { technician, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMd(e.matches);
      if (!e.matches) setCollapsed(true);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMd) localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed, isMd]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <aside
        className={cn(
          'sidebar-transition flex h-screen flex-col border-r border-border bg-card',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center border-b border-border p-4', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <Monitor className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold">Integra IT SRL</span>
            </div>
          )}
          {collapsed && <Monitor className="h-5 w-5 text-primary" />}
          {isMd && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                'rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors',
                collapsed && 'mt-0',
              )}
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {visibleItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      collapsed && 'justify-center px-2',
                    )
                  }
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
        <div className="border-t border-border p-3 space-y-2">
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2 px-1')}>
            <ThemeToggle />
            {!collapsed && <span className="text-xs text-muted-foreground">Tema</span>}
          </div>

          {/* Perfil / 2FA */}
          {collapsed ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Mi perfil"
            >
              <UserCircle className="h-4 w-4" />
            </button>
          ) : (
            technician && (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full rounded-md bg-muted px-3 py-2 text-left hover:bg-accent transition-colors group"
                title="Mi perfil"
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-medium">{technician.name}</p>
                  {technician.twoFactorEnabled && (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-green-500" aria-label="2FA activado" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {technician.role === 'ADMIN' ? 'Administrador' : 'Técnico'} · Mi perfil
                </p>
              </button>
            )
          )}

          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={handleLogout}
            className={cn('w-full text-muted-foreground hover:text-destructive', collapsed && 'px-2')}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </aside>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
