"use client";
import React, { useState } from 'react';
import { Box, LayoutDashboard, ListTodo, Bell, Link as LinkIcon, BarChart2, Menu } from 'lucide-react';
import Link from "next/link";
import NotificationBell from './NotificationBell';
import { MobileNavDrawer } from './MobileNavDrawer';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ThemeToggle';
import { logout } from '@/app/actions/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children, title, action }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks Pipeline', path: '/tasks', icon: ListTodo },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Integrations', path: '/integrations', icon: LinkIcon },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  ];

  return (
    <div
      className="min-h-screen font-sans flex flex-col md:flex-row"
      style={{
        backgroundColor: 'var(--canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Sidebar Navigation */}
      <aside
        className="w-64 hidden md:flex flex-col sticky top-0 h-screen shrink-0"
        style={{
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        <div
          className="h-16 flex items-center px-6"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Go to Home">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent"
              style={{ border: '1px solid var(--text-primary)' }}
            >
              <Box className="w-4 h-4" style={{ color: 'var(--text-primary)' }} aria-hidden="true" />
            </div>
            <span
              className="text-[12px] font-light tracking-[0.2em] uppercase font-serif"
              style={{ color: 'var(--text-primary)' }}
            >
              STUDIO.V
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div
            className="text-[9px] uppercase tracking-widest font-mono mb-4 px-3 pt-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Menu
          </div>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-mono transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'var(--text-primary)' : 'transparent',
                  color: isActive ? 'var(--on-primary)' : 'var(--text-secondary)',
                  outlineColor: 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--canvas-secondary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold font-mono"
              style={{
                backgroundColor: 'var(--canvas-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              PM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Product Manager
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                D2C Brand Co.
              </span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full mt-1 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-left rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--canvas-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 flex items-center justify-between px-6 sticky top-0 z-20"
          style={{
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-serif italic" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {action && <div>{action}</div>}
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6 sm:p-8 overflow-x-hidden">{children}</main>
      </div>

      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        navItems={navItems}
        pathname={pathname}
      />
    </div>
  );
}
