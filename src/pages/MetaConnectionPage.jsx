import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy route — OAuth and old links redirect to Account → Meta Accounts tab. */
export default function MetaConnectionPage() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams({ tab: 'meta' });
  for (const key of ['connected', 'error']) {
    const value = searchParams.get(key);
    if (value) next.set(key, value);
  }
  return <Navigate to={`/app/settings/account?${next}`} replace />;
}
