import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export function TabsRoot({ className, ...props }) {
  return <Tabs.Root className={cn('w-full', className)} {...props} />;
}

export function TabsList({ className, ...props }) {
  return (
    <Tabs.List
      className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <Tabs.Trigger
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <Tabs.Content className={cn('mt-4', className)} {...props} />;
}
