/** Reset scroll/pointer locks left behind by Radix Dialog / RemoveScroll. */
export function clearModalLocks() {
  document.body.style.removeProperty('pointer-events');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
  document.body.style.removeProperty('margin-right');
  document.documentElement.style.removeProperty('overflow');
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');
}
