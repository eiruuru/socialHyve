import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyHiveState } from '@/components/EmptyHiveState';
import { invokeFunctionGet } from '@/lib/supabaseFunctions';

export default function ShortLinkRedirectPage() {
  const { slug } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setError('Invalid link');
      return;
    }

    invokeFunctionGet('shortLinkRedirect', { slug, json: '1' })
      .then((data) => {
        if (data?.url) {
          window.location.replace(data.url);
        } else {
          setError('Link not found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Link not found');
      });
  }, [slug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <EmptyHiveState title="Link unavailable" description={error} compact />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <EmptyHiveState title="Redirecting…" compact />
    </div>
  );
}
