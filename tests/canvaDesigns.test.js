import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canvaDesignsQueryKey,
  mapCachedCanvaDesigns,
  mergeCanvaDesignPages,
} from '../src/lib/canvaDesigns.js';

test('canvaDesignsQueryKey is scoped to the client', () => {
  assert.deepEqual(canvaDesignsQueryKey('client-1'), ['canva-designs', 'client-1']);
});

test('mapCachedCanvaDesigns maps storage rows into picker items', () => {
  assert.deepEqual(
    mapCachedCanvaDesigns([
      {
        canva_design_id: 'DAHUgqmCfM4',
        title: 'Barong',
        thumbnail_url: 'https://example.com/thumb.png',
        last_synced_at: '2026-09-07T00:00:00.000Z',
      },
      { canva_design_id: 'x', title: null, thumbnail_url: null },
    ]),
    [
      {
        id: 'DAHUgqmCfM4',
        title: 'Barong',
        thumbnailUrl: 'https://example.com/thumb.png',
        updatedAt: '2026-09-07T00:00:00.000Z',
      },
      {
        id: 'x',
        title: 'Untitled',
        thumbnailUrl: null,
        updatedAt: null,
      },
    ],
  );
});

test('mergeCanvaDesignPages appends unique designs and keeps the latest continuation', () => {
  const merged = mergeCanvaDesignPages(
    {
      designs: [{ id: 'a', title: 'One' }, { id: 'b', title: 'Two' }],
      continuation: 'page-1',
    },
    {
      designs: [{ id: 'b', title: 'Two again' }, { id: 'c', title: 'Three' }],
      continuation: 'page-2',
    },
  );

  assert.deepEqual(
    merged.designs.map((design) => design.id),
    ['a', 'b', 'c'],
  );
  assert.equal(merged.continuation, 'page-2');
  assert.equal(merged.cached, false);
});
