"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import Link from "next/link";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'success',
    message: "Your model 'Eames Lounge Chair' is ready for review!",
    time: '2m ago',
    unread: true,
  },
  {
    id: 2,
    type: 'error',
    message: "Generation failed for 'SKU-123'. Please upload higher resolution source images.",
    time: '1h ago',
    unread: true,
  },
  {
    id: 3,
    type: 'system',
    message: "SDK version 2.0 is now available.",
    time: '1d ago',
    unread: false,
  }
];

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500 fill-red-50" />;
      default: return <Info className="w-4 h-4 text-blue-500 fill-blue-50" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#EFEDEA] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-[#E5E2DD] z-50 overflow-hidden transform transition-all duration-300 origin-top-right animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E2DD] bg-white">
            <h3 className="text-sm font-bold font-mono tracking-widest uppercase text-[#1A1A1A]">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] text-[#7A7670] hover:text-[#1A1A1A] font-mono tracking-widest uppercase transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#7A7670] text-sm">No new notifications</div>
            ) : (
              <div className="divide-y divide-[#E5E2DD]">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 hover:bg-[#F9F8F6] transition-colors cursor-pointer relative ${notification.unread ? 'bg-[#F9F8F6]/50' : ''}`}
                  >
                    {notification.unread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                    )}
                    <div className="flex gap-3 items-start">
                      <div className="mt-0.5 shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1A1A1A] font-sans leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[9px] text-[#7A7670] font-mono mt-1.5">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-[#E5E2DD] bg-[#F9F8F6] p-2">
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-[#1A1A1A] hover:bg-[#EFEDEA] rounded-xl transition-colors"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
