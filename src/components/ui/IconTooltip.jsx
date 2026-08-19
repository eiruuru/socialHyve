import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export const IconTooltip = forwardRef(function IconTooltip(
  { title, description, children, className, side = 'top' },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    const estimatedHeight = description ? 52 : 28;

    if (side === 'right') {
      setPosition({
        left: rect.right + gap,
        top: rect.top + rect.height / 2,
        transform: 'translate(0, -50%)',
      });
      return;
    }

    const preferTop = side === 'top' && rect.top - gap - estimatedHeight > 8;
    const placeAbove = side === 'top' ? preferTop : false;

    setPosition({
      left: rect.left + rect.width / 2,
      top: placeAbove ? rect.top - gap : rect.bottom + gap,
      transform: placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    });
  }, [description, side]);

  const show = () => {
    updatePosition();
    setVisible(true);
  };

  const hide = () => setVisible(false);

  useEffect(() => {
    if (!visible) return undefined;

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [visible, updatePosition]);

  const setRefs = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <>
      <span
        ref={setRefs}
        className={cn('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && position && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            transform: position.transform,
            zIndex: 9999,
          }}
          className="pointer-events-none w-max max-w-[220px] rounded-hyve-sm bg-ink px-2.5 py-1.5 text-left shadow-lg"
        >
          <span className="block text-xs font-medium text-white">{title}</span>
          {description && (
            <span className="mt-0.5 block text-[10px] leading-snug text-neutral-300">
              {description}
            </span>
          )}
        </span>,
        document.body,
      )}
    </>
  );
});
