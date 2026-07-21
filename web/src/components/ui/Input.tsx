import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // h-12 (48px) — comfortably above the 44px touch-target floor.
        'h-12 w-full rounded-md border bg-surface px-4 text-base text-foreground',
        'placeholder:text-foreground-muted transition-all duration-200 ease-out',
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
Input.displayName = 'Input';
