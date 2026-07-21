import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
    'transition-all duration-200 ease-out active:scale-[0.98] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none ' +
    'disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      variant: {
        // Subtle gradient + a soft colored glow on hover — restrained, not neon.
        primary:
          'bg-gradient-to-b from-primary to-primary-strong text-primary-foreground shadow-sm ' +
          'hover:shadow-glow hover:brightness-110',
        // Neutral "inverted" treatment, not a second brand color — restraint.
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:opacity-90',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-primary hover:bg-surface-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-surface-secondary',
        danger: 'bg-danger text-danger-foreground shadow-sm hover:brightness-110',
      },
      size: {
        // Generous, confidently-tappable by default (not just meeting the
        // 44px floor) — chefs/store staff use this on phones/tablets.
        sm: 'h-10 px-4 text-sm',
        md: 'h-12 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
        icon: 'h-12 w-12 shrink-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
