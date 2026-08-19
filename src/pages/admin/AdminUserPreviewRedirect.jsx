import { Navigate, useParams } from 'react-router-dom';

export default function AdminUserPreviewRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/app/admin/users/${userId}`} replace />;
}
