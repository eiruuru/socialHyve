export const MAX_CAROUSEL_ITEMS = 10;

export function normalizeMediaItem(item) {
  return {
    public_url: item.public_url || item.publicUrl,
    mime_type: item.mime_type || item.mimeType || 'image/png',
    source: item.source,
    sort_order: item.sort_order ?? 0,
  };
}

export function normalizeMediaList(items = []) {
  return [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(normalizeMediaItem);
}

export function isVideo(mimeType) {
  return (mimeType || '').startsWith('video/');
}

export function getAspectRatioClass(ratio, platform = 'instagram') {
  if (platform === 'facebook') return 'aspect-auto max-h-[500px]';
  if (ratio >= 1.5) return 'aspect-[1.91/1]';
  if (ratio <= 0.85) return 'aspect-[4/5]';
  return 'aspect-square';
}

export function computeAspectRatio(width, height) {
  if (!width || !height) return 1;
  return width / height;
}

export function getCarouselAspectRatio(items) {
  let maxHeightRatio = 1;
  for (const item of items) {
    if (item.aspectRatio) {
      const heightRatio = item.aspectRatio >= 1 ? 1 : 1 / item.aspectRatio;
      maxHeightRatio = Math.max(maxHeightRatio, heightRatio);
    }
  }
  if (maxHeightRatio > 1.15) return 4 / 5;
  if (maxHeightRatio < 0.9) return 1.91;
  return 1;
}

export function truncateCaption(text, limit = 125) {
  if (!text || text.length <= limit) return { text: text || '', truncated: false };
  const lastSpace = text.lastIndexOf(' ', limit);
  const cut = lastSpace > 80 ? lastSpace : limit;
  return { text: text.slice(0, cut), truncated: true };
}

export function reorderMedia(items, fromIndex, toIndex) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((item, index) => ({ ...item, sort_order: index }));
}
