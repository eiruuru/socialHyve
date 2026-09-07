import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function PostMediaThumb({
  item,
  className,
  alt = '',
  muted = true,
  playsInline = true,
  loop = false,
  onLoad,
  placeholder,
}) {
  const publicUrl = item?.public_url || item?.publicUrl || '';
  const storagePath = item?.storage_path || item?.storagePath || null;
  const mimeType = item?.mime_type || item?.mimeType;
  const [src, setSrc] = useState(publicUrl);
  const [failed, setFailed] = useState(!publicUrl && !storagePath);
  const triedSignedRef = useRef(false);

  useEffect(() => {
    setSrc(publicUrl);
    setFailed(!publicUrl && !storagePath);
    triedSignedRef.current = false;
  }, [publicUrl, storagePath]);

  const handleError = async () => {
    if (!triedSignedRef.current && storagePath) {
      triedSignedRef.current = true;
      try {
        const { data, error } = await supabase.storage
          .from('post-media')
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
        if (!error && data?.signedUrl) {
          setSrc(data.signedUrl);
          return;
        }
      } catch {
        // Fall through to the placeholder.
      }
    }
    setFailed(true);
  };

  if (failed || !src) {
    if (placeholder) return placeholder;
    return <div className={cn('bg-neutral-100', className)} aria-hidden />;
  }

  if (isVideo(mimeType)) {
    return (
      <video
        src={src}
        className={className}
        muted={muted}
        playsInline={playsInline}
        loop={loop}
        onError={handleError}
        onLoadedMetadata={onLoad}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={onLoad}
    />
  );
}
