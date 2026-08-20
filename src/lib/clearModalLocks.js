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
}

/** Clear style locks and remove stale Radix portal layers left after bad unmounts. */
export function recoverStaleDialogLayers() {
  clearModalLocks();

  for (const portal of document.body.children) {
    if (portal.nodeType !== 1) continue;
    if (portal.id === 'root' || portal.querySelector('#root')) continue;
    if (portal.querySelector('[data-state="open"]')) continue;
    const overlay = portal.querySelector('.fixed.inset-0');
    if (!overlay) continue;
    if (overlay.getAttribute('data-state') === 'open') continue;
    portal.remove();
  }
}
