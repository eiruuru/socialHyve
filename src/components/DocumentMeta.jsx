import { useEffect } from 'react';
import { DEFAULT_DESCRIPTION, formatPageTitle, upsertDocumentMeta } from '@/lib/pageMeta';

export function useDocumentMeta({ title, description = DEFAULT_DESCRIPTION, noIndex = false }) {
  useEffect(() => {
    upsertDocumentMeta({
      title: formatPageTitle(title),
      description,
      noIndex,
    });
  }, [title, description, noIndex]);
}

export function DocumentMeta(props) {
  useDocumentMeta(props);
  return null;
}
