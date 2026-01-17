"use client";

/**
 * Role Select Component
 *
 * Dropdown for selecting user roles with descriptions.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, Eye } from "lucide-react";
import type { UserRole } from "@/db/schema";

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full system access including user management",
    icon: ShieldCheck,
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Manage tickets and assignments",
    icon: Shield,
  },
  {
    value: "VIEW_ONLY",
    label: "View Only",
    description: "View assigned tickets only",
    icon: Eye,
  },
];

interface RoleSelectProps {
  value: UserRole;
  onValueChange: (value: UserRole) => void;
  disabled?: boolean;
  className?: string;
}

export function RoleSelect({
  value,
  onValueChange,
  disabled,
  className,
}: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Simple role badge for display */
export function RoleBadge({ role }: { role: UserRole }) {
  const roleOption = ROLE_OPTIONS.find((r) => r.value === role);

  const variant =
    role === "SUPER_ADMIN"
      ? "default"
      : role === "ADMIN"
        ? "secondary"
        : "outline";

  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      {roleOption && <roleOption.icon className="h-3 w-3" />}
      {roleOption?.label || role}
    </Badge>
  );
}
