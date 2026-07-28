import { describe, expect, it } from 'vitest';

import {
  decodeAdminCursor,
  encodeAdminCursor,
  toCursorPage,
} from './admin-cursor';

describe('admin cursor helpers', () => {
  it('encodes and decodes deterministic createdAt/id cursors', () => {
    const cursor = encodeAdminCursor({
      createdAt: '2026-07-28T12:00:00.000Z',
      id: 'run-1',
    });

    expect(decodeAdminCursor(cursor)).toEqual({
      createdAt: '2026-07-28T12:00:00.000Z',
      id: 'run-1',
    });
  });

  it('builds a next cursor only when a page has more rows than the requested limit', () => {
    const page = toCursorPage(
      [
        { id: 'run-3', createdAt: '2026-07-28T12:03:00.000Z' },
        { id: 'run-2', createdAt: '2026-07-28T12:02:00.000Z' },
        { id: 'run-1', createdAt: '2026-07-28T12:01:00.000Z' },
      ],
      2,
      (item) => ({ createdAt: item.createdAt, id: item.id }),
    );

    expect(page.items).toEqual([
      { id: 'run-3', createdAt: '2026-07-28T12:03:00.000Z' },
      { id: 'run-2', createdAt: '2026-07-28T12:02:00.000Z' },
    ]);
    expect(page.nextCursor).toBe(
      encodeAdminCursor({
        createdAt: '2026-07-28T12:02:00.000Z',
        id: 'run-2',
      }),
    );
  });

  it('rejects malformed cursor payloads', () => {
    expect(() => decodeAdminCursor('not-a-valid-cursor')).toThrow('Invalid admin cursor');
  });
});
