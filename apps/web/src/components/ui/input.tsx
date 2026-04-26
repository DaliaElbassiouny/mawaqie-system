import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg px-3 py-1 text-sm',
          /* Light mode: white bg, dark mode: card bg — both via CSS var */
          'bg-surface-card border border-surface-border text-text-primary',
          'placeholder:text-text-muted',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-brand/50 focus-visible:border-brand/60',
          'transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-surface-hover',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-secondary',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
