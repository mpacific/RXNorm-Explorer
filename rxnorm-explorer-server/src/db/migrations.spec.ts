import type { MigrationInterface, QueryRunner } from 'typeorm';
import { CreateIdsForTables1788891213859 } from './migrations/1788891213859-create-ids-for-tables';
import { AddIndexesToTables1789068330590 } from './migrations/1789068330590-add-indexes-to-tables';
import { AddRelationsToTables1790698212730 } from './migrations/1790698212730-add-relations-to-tables';
import { DropUnusedStrIndexes1790709373981 } from './migrations/1790709373981-drop-unused-str-indexes';

// Records the SQL a migration sends instead of running it.
const run = async (
  migration: MigrationInterface,
  direction: 'up' | 'down',
): Promise<string[]> => {
  const query = jest.fn().mockResolvedValue(undefined);
  await migration[direction]({ query } as unknown as QueryRunner);
  return query.mock.calls.map(([sql]) => sql as string);
};

// `table.index` for every index a set of statements creates or drops
const indexes = (statements: string[], verb: 'CREATE' | 'DROP') =>
  statements.flatMap((sql) => {
    const created = sql.match(
      /^CREATE (?:UNIQUE |FULLTEXT )?INDEX `(\w+)` ON `(\w+)`/,
    );
    const dropped = sql.match(/^DROP INDEX `(\w+)` ON `(\w+)`$/);
    const match = verb === 'CREATE' ? created : dropped;
    return match ? [`${match[2]}.${match[1]}`] : [];
  });

describe('migrations', () => {
  describe('CreateIdsForTables', () => {
    const migration = new CreateIdsForTables1788891213859();

    it('gives each table an auto-increment primary key first', async () => {
      const up = await run(migration, 'up');

      expect(up).toEqual(
        ['RXNCONSO', 'RXNREL', 'RXNSAT'].map(
          (table) =>
            `ALTER TABLE \`${table}\` ADD \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST`,
        ),
      );
    });

    it('drops the ids again on the way down', async () => {
      const down = await run(migration, 'down');

      expect(down).toEqual([
        'ALTER TABLE `RXNCONSO` DROP `id`',
        'ALTER TABLE `RXNREL` DROP `id`',
        'ALTER TABLE `RXNSAT` DROP `id`',
      ]);
    });
  });

  describe('AddIndexesToTables', () => {
    const migration = new AddIndexesToTables1789068330590();

    it('indexes the columns that lookups and joins use', async () => {
      const up = await run(migration, 'up');

      expect(indexes(up, 'CREATE')).toEqual([
        'RXNCONSO.RXNCONSO_RXCUI_idx',
        'RXNCONSO.RXNCONSO_TTY_idx',
        'RXNCONSO.RXNCONSO_RXAUI_key',
        'RXNCONSO.RXNCONSO_STR_idx',
        'RXNCONSO.RXNCONSO_STR_idx2',
        'RXNREL.RXNREL_RXCUI1_idx',
        'RXNREL.RXNREL_RXCUI2_idx',
        'RXNSAT.RXNSAT_RXAUI_idx',
        'RXNSAT.RXNSAT_ATN_idx',
        'RXNSAT.RXNSAT_ATV_idx',
      ]);
      expect(up).toContain(
        'CREATE UNIQUE INDEX `RXNCONSO_RXAUI_key` ON `RXNCONSO`(`RXAUI`)',
      );
    });

    it('drops every index it created, in valid MySQL syntax', async () => {
      const up = await run(migration, 'up');
      const down = await run(migration, 'down');

      // Every statement has to parse as DROP INDEX `name` ON `table`
      expect(indexes(down, 'DROP')).toHaveLength(down.length);
      expect(indexes(down, 'DROP')).toEqual(indexes(up, 'CREATE'));
    });
  });

  describe('AddRelationsToTables', () => {
    const migration = new AddRelationsToTables1790698212730();

    // The orphan check is the first query; answer it with a count
    const runWithOrphans = async (orphans: number | string) => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([{ orphans }])
        .mockResolvedValue(undefined);
      await migration.up({ query } as unknown as QueryRunner);
      return query.mock.calls.map(([sql]) => sql as string);
    };

    it('links RXNSAT to RXNCONSO by atom, with foreign key checks left on', async () => {
      const up = await runWithOrphans('0');

      expect(up).toHaveLength(2);
      expect(up[0]).toMatch(/^SELECT COUNT\(\*\) AS orphans FROM `RXNSAT`/);
      expect(up[1]).toBe(
        'ALTER TABLE `RXNSAT` ADD CONSTRAINT `RXNSAT_RXAUI_fkey` FOREIGN KEY (`RXAUI`) REFERENCES `RXNCONSO`(`RXAUI`) ON DELETE SET NULL ON UPDATE CASCADE',
      );
      expect(up.join('\n')).not.toContain('FOREIGN_KEY_CHECKS');
    });

    it('refuses to add the key when attributes point at missing atoms', async () => {
      await expect(runWithOrphans(3)).rejects.toThrow(
        /^3 RXNSAT rows point at an RXAUI that isn't in RXNCONSO; find them with: SELECT s\.\* FROM/,
      );
    });

    it('removes the link on the way down', async () => {
      const down = await run(migration, 'down');

      expect(down).toEqual([
        'ALTER TABLE `RXNSAT` DROP FOREIGN KEY `RXNSAT_RXAUI_fkey`',
      ]);
    });
  });

  describe('DropUnusedStrIndexes', () => {
    const migration = new DropUnusedStrIndexes1790709373981();

    it('drops both STR indexes', async () => {
      const up = await run(migration, 'up');

      expect(indexes(up, 'DROP')).toEqual([
        'RXNCONSO.RXNCONSO_STR_idx',
        'RXNCONSO.RXNCONSO_STR_idx2',
      ]);
    });

    it('recreates exactly what AddIndexesToTables made on the way down', async () => {
      const down = await run(migration, 'down');
      const original = (
        await run(new AddIndexesToTables1789068330590(), 'up')
      ).filter((sql) => sql.includes('RXNCONSO_STR_idx'));

      expect(down).toEqual(original);
    });
  });
});
