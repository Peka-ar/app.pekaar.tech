"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardError() {
  const router = useRouter();
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="Something went wrong loading your dashboard"
          description="We couldn't fetch your dashboard data. Please try again."
          action={
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-[#3A3A3A] transition-colors"
            >
              Retry
            </button>
          }
        />
      </CardBody>
    </Card>
  );
}