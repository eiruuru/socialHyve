import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { shouldResolveSignedMediaUrl } from '@/lib/postMedia';
import { isVideo } from '@/features/posts/previews/mediaUtils';
import { cn } from '@/lib/utils';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function resolveSignedMediaUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('post-media')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

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
    let cancelled = false;
    triedSignedRef.current = false;

    if (publicUrl) {
      setSrc(publicUrl);
      setFailed(false);
      return undefined;
    }

    if (!storagePath) {
      setSrc('');
      setFailed(true);
      return undefined;
    }

    setSrc('');
    setFailed(false);

    if (!shouldResolveSignedMediaUrl(publicUrl, storagePath)) return undefined;

    triedSignedRef.current = true;
    resolveSignedMediaUrl(storagePath)
      .then((signedUrl) => {
        if (cancelled) return;
        if (signedUrl) {
          setSrc(signedUrl);
          return;
        }
        setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl, storagePath]);

  const handleError = async () => {
    if (!triedSignedRef.current && storagePath) {
      triedSignedRef.current = true;
      try {
        const signedUrl = await resolveSignedMediaUrl(storagePath);
        if (signedUrl) {
          setSrc(signedUrl);
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
