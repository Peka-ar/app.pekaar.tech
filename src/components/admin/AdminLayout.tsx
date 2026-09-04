"use client";
import React, { useState } from 'react';
import { LayoutDashboard, Users, ListTodo, BarChart2, Box, Menu } from 'lucide-react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import NotificationBell from '../dashboard/NotificationBell';
import { AdminMobileNavDrawer } from './AdminMobileNavDrawer';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ThemeToggle';
import { Wordmark } from '../Wordmark';
import { logout } from '@/app/actions/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  user?: { name: string | null; email: string; role: string };
}

export default function AdminLayout({ children, title, action, user }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Tasks Management', path: '/admin/tasks', icon: ListTodo },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
  ];

  const displayName = user?.name ?? user?.email ?? 'Admin';
  const initials = displayName.charAt(0).toUpperCase();

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
            <Wordmark
              className="text-[12px] font-semibold tracking-[0.2em] uppercase font-display"
              dotClassName="text-[var(--accent)]"
            />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div
            className="label-mono mb-4 px-3 pt-2"
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'var(--accent-pale)' : 'transparent',
                  color: isActive ? 'var(--accent-copy)' : 'var(--text-secondary)',
                  outlineColor: 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--canvas-soft)';
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
                backgroundColor: 'var(--canvas-soft)',
                border: '1px solid var(--border-default)',
              }}
            >
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {user?.role ?? 'Admin'}
              </span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full mt-1 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-left rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'; }}
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
          className="h-16 flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-20"
          style={{
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 md:hidden shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {action && <div className="hidden sm:block">{action}</div>}
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>

      <AdminMobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        navItems={navItems}
        pathname={pathname}
      />
    </div>
  );
}
