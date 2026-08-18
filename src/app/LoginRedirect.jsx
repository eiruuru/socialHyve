import { Navigate, useLocation } from 'react-router-dom';

/** Preserve invite/signup query params when redirecting /login → /app/login */
export function LoginRedirect() {
  const location = useLocation();
  return <Navigate to={`/app/login${location.search}`} replace />;
}
