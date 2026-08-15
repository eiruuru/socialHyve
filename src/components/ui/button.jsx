import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'rounded-full border-2 border-transparent bg-primary text-primary-foreground hover:bg-honey-dark',
        secondary: 'rounded-full border-2 border-transparent bg-secondary text-secondary-foreground hover:bg-neutral-200',
        outline: 'rounded-full border-2 border-ink bg-transparent text-ink hover:bg-neutral-100',
        ghost: 'rounded-full border-none bg-transparent text-ink hover:bg-neutral-100',
        destructive: 'rounded-full border-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        dark: 'rounded-full border-2 border-transparent bg-ink text-white hover:bg-ink-soft',
        'outline-light': 'rounded-full border-2 border-white bg-transparent text-white hover:bg-white/10',
      },
      size: {
        default: 'h-11 px-6 py-2 text-sm',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
