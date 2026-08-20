import { Outlet, useLocation } from 'react-router-dom';

/** Nested layout for post detail + edit so inner Outlet swaps without remounting the app shell. */
export function PostPageLayout() {
  const location = useLocation();
  return <Outlet key={`${location.pathname}${location.search}`} />;
}
