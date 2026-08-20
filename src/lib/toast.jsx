import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recoverUiAfterAsyncAction } from '@/lib/clearModalLocks';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

let globalToast = null;

export function showToast({
  toastId,
  title,
  description,
  variant = 'default',
  duration = 4000,
  actions = [],
  onDismiss,
}) {
  globalToast?.({ toastId, title, description, variant, duration, actions, onDismiss });
}

const variantStyles = {
  default: 'border-neutral-200 bg-white text-ink',
  success: 'border-emerald-200 bg-[#DFF3E6] text-status-published',
  error: 'border-red-200 bg-[#FCE4E3] text-[#A62E2B]',
  info: 'border-honey/30 bg-honey-light/40 text-ink',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    recoverUiAfterAsyncAction();
  }, []);

  const toast = useCallback(({
    toastId,
    title,
    description,
    variant = 'default',
    duration = 4000,
    actions = [],
    onDismiss,
  }) => {
    const id = toastId || crypto.randomUUID();
    setToasts((current) => {
      const without = toastId
        ? current.filter((item) => item.toastId !== toastId)
        : current;
      return [...without, {
        id,
        toastId: toastId || id,
        title,
        description,
        variant,
        actions,
        onDismiss,
      }];
    });
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  globalToast = toast;

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto relative rounded-hyve-md border px-4 py-3 pr-9 shadow-hyve-md',
              variantStyles[item.variant] || variantStyles.default,
            )}
          >
            {item.onDismiss && (
              <button
                type="button"
                aria-label="Dismiss"
                className="absolute right-2 top-2 rounded-sm p-0.5 opacity-60 hover:opacity-100"
                onClick={() => {
                  item.onDismiss?.();
                  dismiss(item.id);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-xs opacity-90">{item.description}</p>
            )}
            {item.actions?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.actions.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant || 'default'}
                    onClick={async () => {
                      await action.onClick?.();
                      dismiss(item.id);
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
