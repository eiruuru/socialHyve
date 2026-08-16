import { PostImportView } from '@/features/posts/import/PostImportView';
import { DocumentMeta } from '@/components/DocumentMeta';
import { PAGE_DESCRIPTIONS } from '@/lib/pageMeta';

export default function PostImportPage() {
  return (
    <>
      <DocumentMeta title="Import posts" description={PAGE_DESCRIPTIONS.importPosts} />
      <PostImportView />
    </>
  );
}
