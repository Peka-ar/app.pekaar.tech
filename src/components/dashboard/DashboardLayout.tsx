"use client";
import React from 'react';
import { Box, LayoutDashboard, ListTodo, Bell, Link as LinkIcon, BarChart2, CreditCard } from 'lucide-react';
import Link from "next/link";
import NotificationBell from './NotificationBell';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children, title, action }: DashboardLayoutProps) {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks Pipeline', path: '/tasks', icon: ListTodo },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Integrations', path: '/integrations', icon: LinkIcon },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Billing', path: '/billing', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-[#EFEDEA] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-[#E5E2DD] hidden md:flex flex-col sticky top-0 h-screen shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E2DD]">
          <Link href="/" className="flex items-center gap-2" aria-label="Go to Home">
            <div className="w-8 h-8 rounded-full border border-[#1A1A1A] flex items-center justify-center bg-transparent">
              <Box className="w-4 h-4 text-[#1A1A1A]" aria-hidden="true" />
            </div>
            <span className="text-[12px] font-light tracking-[0.2em] uppercase font-serif text-[#1A1A1A]">STUDIO.V</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[9px] uppercase tracking-widest text-[#A3A3A3] font-mono mb-4 px-3 pt-2">Menu</div>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-mono transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] ${
                  isActive 
                    ? 'bg-[#1A1A1A] text-white' 
                    : 'text-[#7A7670] hover:bg-[#EFEDEA] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[#E5E2DD]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#EFEDEA] border border-[#E5E2DD] flex items-center justify-center text-[10px] font-bold font-mono">
              PM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#1A1A1A]">Product Manager</span>
              <span className="text-[9px] text-[#7A7670] font-mono">D2C Brand Co.</span>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E2DD] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-serif italic text-[#1A1A1A]">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            {action && <div>{action}</div>}
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 p-6 sm:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
