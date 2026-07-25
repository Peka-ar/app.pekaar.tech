"use client";
import { MobileNavDrawer } from '../dashboard/MobileNavDrawer';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

interface AdminMobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  pathname: string;
}

export function AdminMobileNavDrawer({ isOpen, onClose, navItems, pathname }: AdminMobileNavDrawerProps) {
  return (
    <MobileNavDrawer
      isOpen={isOpen}
      onClose={onClose}
      navItems={navItems}
      pathname={pathname}
    />
  );
}
