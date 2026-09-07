const DRAFT_FOLDER = '/draft/';

export function isDraftStoragePath(storagePath) {
  return typeof storagePath === 'string' && storagePath.includes(DRAFT_FOLDER);
}

export function buildSavedMediaPath(storagePath, postId) {
  if (!storagePath || !postId || !isDraftStoragePath(storagePath)) return storagePath;
  return storagePath.replace(DRAFT_FOLDER, `/${postId}/`);
}
