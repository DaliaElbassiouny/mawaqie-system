import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        /* Azure blue = Mawaqie brand accent */
        default:  'bg-brand/12 text-brand border border-brand/20',
        /* Status */
        success:  'bg-emerald-500/12 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400',
        warning:  'bg-amber-500/12 text-amber-600 border border-amber-500/20 dark:text-amber-400',
        danger:   'bg-red-500/12 text-red-600 border border-red-500/20 dark:text-red-400',
        /* Neutral */
        muted:    'bg-surface-hover text-text-secondary border border-surface-border',
        outline:  'bg-transparent text-text-secondary border border-surface-border',
        /* Accent aliases */
        gold:     'bg-brand/12 text-brand border border-brand/20',
        purple:   'bg-purple-500/12 text-purple-600 border border-purple-500/20 dark:text-purple-400',
        info:     'bg-blue-500/12 text-blue-600 border border-blue-500/20 dark:text-blue-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
