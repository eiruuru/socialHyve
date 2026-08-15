/**
 * Parse Loomly-style page ranges: "1-5, 8, 11-13" → [1,2,3,4,5,8,11,12,13]
 */
export function parsePageRange(input) {
  if (!input?.trim()) return null;

  const pages = new Set();
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);
      if (Number.isNaN(start) || Number.isNaN(end) || start < 1 || end < start) {
        throw new Error(`Invalid page range: "${part}"`);
      }
      for (let i = start; i <= end; i += 1) pages.add(i);
    } else {
      const n = Number.parseInt(part, 10);
      if (Number.isNaN(n) || n < 1) throw new Error(`Invalid page number: "${part}"`);
      pages.add(n);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

export function validatePages(pages, pageCount) {
  if (!pages?.length) return null;
  const invalid = pages.filter((p) => p < 1 || p > pageCount);
  if (invalid.length) {
    throw new Error(`Page(s) out of range (1–${pageCount}): ${invalid.join(', ')}`);
  }
  return pages;
}

export const FORMAT_OPTIONS = [
  { value: 'png', label: 'Photo (PNG)' },
  { value: 'jpg', label: 'Photo (JPG)' },
  { value: 'pdf', label: 'Document (PDF)' },
  { value: 'gif', label: 'Animated GIF' },
  { value: 'mp4', label: 'Video (MP4)' },
];
