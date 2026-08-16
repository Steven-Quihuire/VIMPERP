import { afterEach, describe, expect, it } from 'vitest';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { createMigrationTestDatabase } from './migration-test-helpers';

const execFileAsync = promisify(execFile);
const cleanups: Array<() => Promise<void>> = [];

const migrationsRoot = path.resolve(__dirname, '..');
const metaRoot = path.join(migrationsRoot, 'meta');

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();

    if (cleanup) {
      await cleanup();
    }
  }
});

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type SnapshotMeta = {
  id: string;
  prevId: string;
  tables: Record<string, unknown>;
  enums: Record<string, unknown>;
};

const expectedSnapshotTags = [
  '0013_daily_clint_barton',
  '0014_roles_management',
  '0016_canonical_scope_nodes',
  '0017_role_assignment_scope_fk',
  '0026_timesheets',
  '0027_inventory_foundation',
] as const;

const expectedJournalTags = [
  '0013_daily_clint_barton',
  '0014_roles_management',
  '0016_canonical_scope_nodes',
  '0017_role_assignment_scope_fk',
  '0023_employee_master',
  '0024_hr_reporting_line_integrity',
  '0025_hr_responsibility_invitations',
  '0026_timesheets',
  '0027_inventory_foundation',
] as const;

describe('migration journal metadata', () => {
  it('restores the missing 0013/0014/0016/0017 journal entries and matching snapshots', async () => {
    const journal = JSON.parse(
      await readFile(path.join(metaRoot, '_journal.json'), 'utf8'),
    ) as {
      entries: JournalEntry[];
    };
    const snapshotFiles = new Set(await readdir(metaRoot));

    const entriesByTag = new Map(journal.entries.map((entry) => [entry.tag, entry]));

    const snapshots = await Promise.all(
      expectedSnapshotTags.map(async (tag) => {
        const snapshotName = `${tag.slice(0, 4)}_snapshot.json`;
        const snapshot = JSON.parse(
          await readFile(path.join(metaRoot, snapshotName), 'utf8'),
        ) as SnapshotMeta;

        return {
          tag,
          snapshotName,
          snapshot,
          entry: entriesByTag.get(tag) ?? null,
        };
      }),
    );

    expect(snapshots.map(({ snapshotName }) => snapshotFiles.has(snapshotName))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);

    expect(snapshots.map(({ entry }) => entry?.tag ?? null)).toEqual([
      ...expectedSnapshotTags,
    ]);
    expect(snapshots.map(({ entry }) => entry?.idx ?? null)).toEqual([13, 14, 15, 16, 25, 26]);
    expect(snapshots.map(({ entry }) => entry?.version ?? null)).toEqual([
      '7',
      '7',
      '7',
      '7',
      '7',
      '7',
    ]);
    expect(snapshots.map(({ entry }) => entry?.breakpoints ?? null)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(snapshots[0]?.snapshot.prevId).toBe('8995b5f3-1658-4938-a246-23de21e83697');
    expect(snapshots[1]?.snapshot.prevId).toBe(snapshots[0]?.snapshot.id);
    expect(snapshots[2]?.snapshot.prevId).toBe(snapshots[1]?.snapshot.id);
    expect(snapshots[3]?.snapshot.prevId).toBe(snapshots[2]?.snapshot.id);
    expect(snapshots[4]?.snapshot.prevId).toBe(snapshots[3]?.snapshot.id);
    expect(snapshots[5]?.snapshot.prevId).toBe(snapshots[4]?.snapshot.id);

    expect(
      expectedJournalTags.map((tag) => entriesByTag.get(tag)?.tag ?? null),
    ).toEqual([...expectedJournalTags]);
    expect(
      expectedJournalTags.map((tag) => entriesByTag.get(tag)?.idx ?? null),
    ).toEqual([13, 14, 15, 16, 22, 23, 24, 25, 26]);

    expect(snapshots[4]?.snapshot.enums).toHaveProperty('public.timesheet_status');
    expect(snapshots[4]?.snapshot.tables).toHaveProperty('public.timesheet_periods');
    expect(snapshots[4]?.snapshot.tables).toHaveProperty('public.time_entries');
    expect(snapshots[5]?.snapshot.enums).toHaveProperty('public.stock_document_type');
    expect(snapshots[5]?.snapshot.enums).toHaveProperty('public.stock_document_status');
    expect(snapshots[5]?.snapshot.tables).toHaveProperty('public.stock_lots');
    expect(snapshots[5]?.snapshot.tables).toHaveProperty('public.stock_documents');
    expect(snapshots[5]?.snapshot.tables).toHaveProperty('public.stock_document_lines');
    expect(snapshots[5]?.snapshot.tables).toHaveProperty('public.stock_quants');
  });

  it('lets drizzle-kit migrate apply cleanly on a fresh local postgres database', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await expect(
      execFileAsync('pnpm', ['exec', 'drizzle-kit', 'migrate', '--config', 'drizzle.config.ts'], {
        cwd: path.resolve(__dirname, '../../../..'),
        env: {
          ...process.env,
          DATABASE_URL: database.connectionString,
        },
      }),
    ).resolves.toMatchObject({ stderr: '' });
  }, 15000);
});
