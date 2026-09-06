"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function DashboardError() {
  const router = useRouter();
  return (
    <Card className="rounded-[24px]">
      <CardBody>
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="Something went wrong loading your dashboard"
          description="We couldn't fetch your dashboard data. Please try again."
          action={
            <Button
              variant="primary"
              onClick={() => router.refresh()}
            >
              Retry
            </Button>
          }
        />
      </CardBody>
    </Card>
  );
}