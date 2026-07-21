import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** FR-17: designed loading states, not a blank screen. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-secondary', className)} {...props} />;
}
