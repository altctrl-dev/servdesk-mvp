/**
 * Ticket Stats Component
 *
 * Displays statistics cards for ticket counts by status.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, CircleDot, Clock, CheckCircle2 } from "lucide-react";

interface TicketStatsProps {
  stats: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
  };
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon: Icon, description, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TicketStats({ stats, isLoading }: TicketStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Tickets"
        value={stats.total}
        icon={Ticket}
        isLoading={isLoading}
      />
      <StatCard
        title="Open"
        value={stats.open}
        icon={CircleDot}
        description="Awaiting response"
        isLoading={isLoading}
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={Clock}
        description="Waiting on customer"
        isLoading={isLoading}
      />
      <StatCard
        title="Resolved"
        value={stats.resolved}
        icon={CheckCircle2}
        description="Successfully resolved"
        isLoading={isLoading}
      />
    </div>
  );
}

export function TicketStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
