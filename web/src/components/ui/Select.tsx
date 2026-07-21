import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/** Native select, styled to match Input.tsx exactly — FR-17's item-list
 * filters and form pickers need a select, and this keeps it on the same
 * design tokens rather than a one-off styled element. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md border bg-surface px-4 text-base text-foreground',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-danger' : 'border-border-strong hover:border-foreground-muted',
        className,
      )}
      aria-invalid={error || undefined}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
