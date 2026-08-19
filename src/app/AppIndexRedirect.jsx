import { Navigate } from 'react-router-dom';
import { getDefaultAppPath, useDeviceTier } from '@/lib/deviceTier';

export function AppIndexRedirect() {
  const tier = useDeviceTier();
  const target = getDefaultAppPath(tier).replace('/app/', '');
  return <Navigate to={target} replace />;
}
