import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

let globalToast = null;

export function showToast({ title, description, variant = 'default', duration = 4000 }) {
  globalToast?.({ title, description, variant, duration });
}

const variantStyles = {
  default: 'border-neutral-200 bg-white text-ink',
  success: 'border-emerald-200 bg-[#DFF3E6] text-status-published',
  error: 'border-red-200 bg-[#FCE4E3] text-[#A62E2B]',
  info: 'border-honey/30 bg-honey-light/40 text-ink',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, description, variant }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, duration);
    }
  }, []);

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
              'pointer-events-auto rounded-hyve-md border px-4 py-3 shadow-hyve-md',
              variantStyles[item.variant] || variantStyles.default,
            )}
          >
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-xs opacity-90">{item.description}</p>
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
