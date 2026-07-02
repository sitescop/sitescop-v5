import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/design-system/layouts/Sidebar';
import { TopBar } from '@/design-system/layouts/TopBar';
import { Footer } from '@/design-system/layouts/Footer';

interface AppShellProps {
  children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col lg:ml-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 px-4 py-6 lg:px-6">
          {children ?? <Outlet />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
