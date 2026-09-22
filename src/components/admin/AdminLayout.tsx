"use client";
import React, { useState } from 'react';
import { LayoutDashboard, Users, ListTodo, Bell, BarChart2, Inbox, Menu } from 'lucide-react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { AdminMobileNavDrawer } from './AdminMobileNavDrawer';
import { Button } from '../ui/Button';
import Image from 'next/image';
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
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { name: 'Requests', path: '/admin/requests', icon: Inbox },
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
          backgroundColor: 'var(--canvas)',
        }}
      >
        <div
          className="h-16 flex items-center px-6"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <Link href="/" className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]" aria-label="Go to Home">
            <Image src="/peka_logo.png" alt="" width={427} height={429} className="h-8 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'var(--accent-pale)' : 'transparent',
                  color: isActive ? 'var(--ink-deep)' : 'var(--text-secondary)',
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
                <Icon
                  className="w-4 h-4"
                  aria-hidden="true"
                  style={{ color: isActive ? 'var(--ink-deep)' : 'var(--text-muted)' }}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold font-sans"
              style={{
                backgroundColor: 'var(--canvas-soft)',
                color: 'var(--text-primary)',
              }}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {user?.role ?? 'Admin'}
              </span>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full mt-1 px-3 py-2 text-sm font-semibold text-left rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--text-secondary)', outlineColor: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--canvas-soft)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 className="sr-only">{title}</h1>

        {/* Mobile-only top bar: hamburger + logo */}
        <header
          className="md:hidden h-16 flex items-center justify-between gap-3 px-4 sticky top-0 z-20 shrink-0"
          style={{
            backgroundColor: 'var(--canvas)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-1 min-w-0">
            <Button
              variant="ghost"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)]"
              aria-label="Go to Home"
            >
              <Image src="/peka_logo.png" alt="" width={427} height={429} className="h-8 w-auto" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[var(--canvas-soft)] overflow-x-hidden">
          {action && (
            <div className="hidden sm:flex justify-end mb-6 shrink-0">
              {action}
            </div>
          )}
          {children}
        </main>
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
