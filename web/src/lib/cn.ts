import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges conditional class lists and resolves conflicting Tailwind utility
 * classes (e.g. a caller-supplied `p-2` overriding a component's `p-4`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
