/** Reset scroll/pointer locks left behind by Radix Dialog / RemoveScroll. */
export function clearModalLocks() {
  document.body.style.removeProperty('pointer-events');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.body.style.removeProperty('margin-right');
  document.documentElement.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('pointer-events');
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');
  document.body.removeAttribute('aria-hidden');

  // Orphaned Radix dialog layers can block clicks after abrupt unmount.
  for (const overlay of document.querySelectorAll('[data-state="open"]')) {
    if (overlay.classList.contains('fixed') && overlay.classList.contains('inset-0')) {
      overlay.remove();
    }
  }
  for (const dialog of document.querySelectorAll('[role="dialog"][data-state="open"]')) {
    dialog.remove();
  }
}
