import { Outlet } from 'react-router-dom';
import { Sidebar, MobileTopBar, MobileBottomNav } from './Sidebar';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar lateral — se oculta en mobile, visible en md+ */}
      <Sidebar />

      {/* Área de contenido principal */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header top — sólo visible en mobile */}
        <MobileTopBar />

        {/* Contenido scrolleable */}
        <main className="flex-1 overflow-y-auto p-4 pb-[72px] md:p-6 md:pb-6">
          <Outlet />
        </main>

        {/* Bottom nav — sólo visible en mobile */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
