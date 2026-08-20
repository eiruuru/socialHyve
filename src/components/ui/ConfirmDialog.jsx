import { useCallback, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { clearModalLocks } from '@/lib/clearModalLocks';

const CLOSE_DELAY_MS = 200;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirm() {
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const resolveRef = useRef(null);
  const finishedRef = useRef(false);

  const finish = useCallback((result) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setOpen(false);
    clearModalLocks();
    window.setTimeout(() => {
      resolveRef.current?.(result);
      resolveRef.current = null;
      setState(null);
      finishedRef.current = false;
      clearModalLocks();
    }, CLOSE_DELAY_MS);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    finishedRef.current = false;
    resolveRef.current = resolve;
    setState(options);
    setOpen(true);
  }), []);

  const dialog = state ? (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finish(false);
      }}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={async () => {
        const result = await state.onConfirm?.();
        finish(result !== false);
      }}
    />
  ) : null;

  return { confirm, dialog };
}
