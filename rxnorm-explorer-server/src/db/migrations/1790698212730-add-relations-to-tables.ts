import { MigrationInterface, QueryRunner } from 'typeorm';

const ORPHANS =
  'SELECT COUNT(*) AS orphans FROM `RXNSAT` s LEFT JOIN `RXNCONSO` c ON c.`RXAUI` = s.`RXAUI` WHERE s.`RXAUI` IS NOT NULL AND c.`id` IS NULL';

export class AddRelationsToTables1790698212730 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The key is added with FOREIGN_KEY_CHECKS on, so MySQL validates every
    // existing row. Count first anyway, so a release with orphaned attributes
    // fails with a clear message rather than a bare constraint error.
    const [{ orphans }] = (await queryRunner.query(ORPHANS)) as {
      orphans: number | string;
    }[];
    if (Number(orphans) > 0) {
      throw new Error(
        `${orphans} RXNSAT rows point at an RXAUI that isn't in RXNCONSO; ` +
          `find them with: ${ORPHANS.replace('COUNT(*) AS orphans', 's.*')}`,
      );
    }

    await queryRunner.query(
      'ALTER TABLE `RXNSAT` ADD CONSTRAINT `RXNSAT_RXAUI_fkey` FOREIGN KEY (`RXAUI`) REFERENCES `RXNCONSO`(`RXAUI`) ON DELETE SET NULL ON UPDATE CASCADE',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `RXNSAT` DROP FOREIGN KEY `RXNSAT_RXAUI_fkey`',
    );
  }
}
