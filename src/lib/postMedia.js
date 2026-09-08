const DRAFT_FOLDER = '/draft/';

export function isDraftStoragePath(storagePath) {
  return typeof storagePath === 'string' && storagePath.includes(DRAFT_FOLDER);
}

export function buildSavedMediaPath(storagePath, postId) {
  if (!storagePath || !postId || !isDraftStoragePath(storagePath)) return storagePath;
  return storagePath.replace(DRAFT_FOLDER, `/${postId}/`);
}

export function mediaRowStoragePaths(row) {
  if (!row) return [];
  return [
    row.storage_path || row.storagePath,
    row.preview_storage_path || row.previewStoragePath,
    row.original_storage_path || row.originalStoragePath,
  ].filter(Boolean);
}

export function unusedMediaStoragePaths(removedRows = [], keptPaths = []) {
  const kept = keptPaths instanceof Set ? keptPaths : new Set(keptPaths);
  const unused = [];
  const seen = new Set();
  for (const row of removedRows) {
    for (const path of mediaRowStoragePaths(row)) {
      if (kept.has(path) || seen.has(path)) continue;
      seen.add(path);
      unused.push(path);
    }
  }
  return unused;
}

export function shouldKeepMediaStorage(row, keptPaths = []) {
  const kept = keptPaths instanceof Set ? keptPaths : new Set(keptPaths);
  return mediaRowStoragePaths(row).some((path) => kept.has(path));
}

export function shouldResolveSignedMediaUrl(publicUrl, storagePath) {
  return !publicUrl && Boolean(storagePath);
}
