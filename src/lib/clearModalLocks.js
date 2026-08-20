/** Reset scroll/pointer locks left behind by Radix Dialog / RemoveScroll. */
export function clearModalLocks() {
  const unlockTargets = [
    document.documentElement,
    document.body,
    document.getElementById('root'),
  ];

  for (const el of unlockTargets) {
    if (!el) continue;
    el.style.pointerEvents = '';
    el.style.removeProperty('overflow');
    el.style.removeProperty('padding-right');
    el.style.removeProperty('margin-right');
    el.removeAttribute('data-scroll-locked');
    el.removeAttribute('aria-hidden');
    el.removeAttribute('inert');
  }

  document.querySelectorAll('[data-scroll-locked]').forEach((el) => {
    el.removeAttribute('data-scroll-locked');
    if (el.style) el.style.pointerEvents = '';
  });
}

function isAppRoot(element) {
  return element.id === 'root';
}

function removeRadixDialogOverlays({ force = false } = {}) {
  document.querySelectorAll('[data-radix-dialog-overlay]').forEach((overlay) => {
    if (!force && overlay.getAttribute('data-state') === 'open') return;
    const portal = overlay.closest('[data-radix-portal]');
    if (portal) portal.remove();
    else overlay.remove();
  });
}

function removeStaleBodyPortals({ force = false } = {}) {
  for (const child of [...document.body.children]) {
    if (child.nodeType !== 1) continue;
    if (isAppRoot(child)) continue;

    const hasOpenLayer = child.querySelector('[data-state="open"]');
    if (hasOpenLayer && !force) continue;

    const isDialogPortal = child.hasAttribute('data-radix-portal')
      || child.querySelector('[data-radix-portal]')
      || child.querySelector('[role="dialog"]');

    if (isDialogPortal) {
      child.remove();
    }
  }
}

/** Clear style locks and remove stale Radix portal layers left after bad unmounts. */
export function recoverStaleDialogLayers({ force = false } = {}) {
  clearModalLocks();
  removeRadixDialogOverlays({ force });
  removeStaleBodyPortals({ force });
}

/** Unlock the UI and tear down stale overlays before SPA navigation. */
export function prepareForRouteChange() {
  recoverStaleDialogLayers({ force: true });
}

/** Run recovery after async UI flows (duplicate, toast actions, etc.). */
export function recoverUiAfterAsyncAction() {
  clearModalLocks();
  window.requestAnimationFrame(() => {
    recoverStaleDialogLayers({ force: true });
  });
}

/** Run recovery after navigation completes — style unlock first, portal removal deferred. */
export function recoverUiAfterNavigation() {
  clearModalLocks();
  window.requestAnimationFrame(() => {
    recoverStaleDialogLayers({ force: true });
  });
}
