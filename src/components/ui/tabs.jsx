import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export function TabsRoot({ className, ...props }) {
  return <Tabs.Root className={cn('w-full', className)} {...props} />;
}

export function TabsList({ className, ...props }) {
  return (
    <Tabs.List
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-full bg-neutral-100 p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <Tabs.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ring-offset-background transition-all data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-hyve-sm',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <Tabs.Content className={cn('mt-4', className)} {...props} />;
}
