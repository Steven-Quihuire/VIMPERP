type AdminCursorPayload = {
  createdAt: string;
  id: string;
};

const isAdminCursorPayload = (value: unknown): value is AdminCursorPayload => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'id' in value &&
    typeof value.id === 'string'
  );
};

export const encodeAdminCursor = (payload: AdminCursorPayload) => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

export const decodeAdminCursor = (cursor: string): AdminCursorPayload => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;

    if (!isAdminCursorPayload(decoded)) {
      throw new Error('invalid-shape');
    }

    return decoded;
  } catch {
    throw new Error('Invalid admin cursor');
  }
};

export const toCursorPage = <TRow>(
  rows: TRow[],
  limit: number,
  getCursor: (row: TRow) => AdminCursorPayload,
) => {
  const items = rows.slice(0, limit);
  const lastItem = items.at(-1);
  const hasMore = rows.length > limit;

  return {
    items,
    nextCursor: hasMore && lastItem ? encodeAdminCursor(getCursor(lastItem)) : null,
  };
};
