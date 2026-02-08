import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA (e.g. Button) or custom content */
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className
      )}
      {...props}
    >
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-6">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
      {description && (
        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {action && <div className="flex flex-wrap justify-center gap-2">{action}</div>}
      {children}
    </div>
  )
);
EmptyState.displayName = "EmptyState";
