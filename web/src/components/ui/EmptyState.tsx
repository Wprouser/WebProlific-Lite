import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** FR-17: "every list/dashboard screen has a deliberately designed empty
 * state... not a blank table." A solid low-contrast surface rather than a
 * dashed placeholder border — reads as a designed state, not a dev
 * placeholder. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface-secondary/60 px-6 py-20 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-foreground-muted shadow-sm">
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-lg font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1.5 text-sm text-foreground-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
