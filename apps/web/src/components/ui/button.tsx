import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold',
    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card',
    'disabled:pointer-events-none disabled:opacity-40 select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /* Primary = azure blue — the Mawaqie identity action */
        default:
          'bg-brand text-text-inverted hover:bg-brand-400 active:bg-brand-600 shadow-sm',
        /* Secondary outline */
        outline:
          'border border-surface-border bg-transparent text-text-primary hover:bg-surface-hover hover:border-brand/40',
        /* Ghost — no border */
        ghost:
          'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        /* Destructive */
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
        /* Brand alias (kept for compatibility — same as default) */
        gold:
          'bg-brand text-text-inverted hover:bg-brand-400 active:bg-brand-600 shadow-sm',
        /* Subtle — tinted ghost */
        subtle:
          'bg-brand/10 text-brand hover:bg-brand/18',
        /* Link style */
        link:
          'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default:   'h-9 px-4 py-2',
        sm:        'h-7 rounded-md px-3 text-xs',
        lg:        'h-11 rounded-xl px-6 text-base',
        icon:      'h-9 w-9 rounded-lg',
        'icon-sm': 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
