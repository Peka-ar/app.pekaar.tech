"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from "next/link";
import { useClickOutside } from "@/lib/use-click-outside";
import { PROJECT_STATUS_META, BRAND_LABEL } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { ProjectStatus } from "@/lib/enums";

export interface NotificationProject {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: Date;
}

function NotificationSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 items-start animate-pulse">
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: 'var(--border-default)' }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 rounded w-3/4"
              style={{ backgroundColor: 'var(--border-default)' }}
            />
            <div
              className="h-2 rounded w-1/4"
              style={{ backgroundColor: 'var(--border-default)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);
  useClickOutside(popoverRef, () => setIsOpen(false));

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      setIsLoading(true);
      fetch('/api/notifications')
        .then((res) => res.json())
        .then((data) => {
          setNotifications(data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: 'var(--text-primary)',
          outlineColor: 'var(--text-primary)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--canvas-secondary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" style={{ color: 'var(--text-primary)' }} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-lg z-50 overflow-hidden transform transition-all duration-300 origin-top-right animate-in fade-in slide-in-from-top-2"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-default)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <h3
              className="text-sm font-bold font-mono tracking-widest uppercase"
              style={{ color: 'var(--text-primary)' }}
            >
              Notifications
            </h3>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <NotificationSkeleton />
            ) : notifications.length === 0 ? (
              <div
                className="p-6 text-center text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                No new notifications
              </div>
            ) : (
              <div style={{ borderColor: 'var(--border-default)' }} className="divide-y">
                {notifications.map((notification) => {
                  const meta = PROJECT_STATUS_META[notification.status];
                  const Icon = meta.icon;
                  return (
                    <Link
                      key={notification.id}
                      href="/notifications"
                      className="block p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                      style={{ outlineColor: 'var(--text-primary)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--canvas)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="mt-0.5 shrink-0">
                          <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                            {BRAND_LABEL[notification.status]}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-sans leading-relaxed"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {notification.name}
                          </p>
                          <p
                            className="text-[9px] font-mono mt-1.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="p-2"
            style={{
              borderTop: '1px solid var(--border-default)',
              backgroundColor: 'var(--canvas)',
            }}
          >
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 text-[10px] font-mono font-bold tracking-widest uppercase rounded-xl transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--canvas-secondary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}