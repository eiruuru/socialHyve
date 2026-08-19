import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, formatPageTitle, OG_IMAGE, upsertDocumentMeta } from '@/lib/pageMeta';

export function useDocumentMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  noIndex = false,
  image = OG_IMAGE.url,
  imageAlt = OG_IMAGE.alt,
  url,
}) {
  useEffect(() => {
    upsertDocumentMeta({
      title: formatPageTitle(title),
      description,
      noIndex,
      image,
      imageAlt,
      url,
    });
  }, [title, description, noIndex, image, imageAlt, url]);
}

export function DocumentMeta(props) {
  useDocumentMeta(props);
  return null;
}
