"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardError() {
  const router = useRouter();
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="Failed to load dashboard data"
          description="We couldn&apos;t fetch the admin dashboard data. Please try again."
          action={
            <Button variant="primary" onClick={() => router.refresh()}>
              Retry
            </Button>
          }
        />
      </CardBody>
    </Card>
  );
}
