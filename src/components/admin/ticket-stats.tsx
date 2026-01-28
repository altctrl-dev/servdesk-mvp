/**
 * Ticket Stats Component
 *
 * Displays statistics cards for ticket counts.
 * Cards: Unresolved, Overdue, Due Today, Open, Unassigned
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CircleDot,
  UserX,
} from "lucide-react";

interface TicketStatsProps {
  stats: {
    unresolved: number;
    overdue: number;
    dueToday: number;
    open: number;
    unassigned: number;
  };
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  isLoading?: boolean;
  variant?: "default" | "warning" | "danger";
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
  variant = "default",
}: StatCardProps) {
  const iconColor =
    variant === "danger"
      ? "text-red-500"
      : variant === "warning"
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
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
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        title="Unresolved"
        value={stats.unresolved}
        icon={AlertCircle}
        description="Requires attention"
        isLoading={isLoading}
      />
      <StatCard
        title="Overdue"
        value={stats.overdue}
        icon={AlertTriangle}
        description="Past SLA deadline"
        isLoading={isLoading}
        variant={stats.overdue > 0 ? "danger" : "default"}
      />
      <StatCard
        title="Due Today"
        value={stats.dueToday}
        icon={Clock}
        description="SLA expires today"
        isLoading={isLoading}
        variant={stats.dueToday > 0 ? "warning" : "default"}
      />
      <StatCard
        title="Open"
        value={stats.open}
        icon={CircleDot}
        description="Awaiting response"
        isLoading={isLoading}
      />
      <StatCard
        title="Unassigned"
        value={stats.unassigned}
        icon={UserX}
        description="Needs assignment"
        isLoading={isLoading}
        variant={stats.unassigned > 0 ? "warning" : "default"}
      />
    </div>
  );
}

export function TicketStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
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
