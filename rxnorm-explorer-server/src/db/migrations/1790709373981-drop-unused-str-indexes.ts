import { MigrationInterface, QueryRunner } from 'typeorm';

// Search matches STR with LIKE '%...%', which can't use either of these, and
// nothing else filters or sorts on STR through an index.
export class DropUnusedStrIndexes1790709373981 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `RXNCONSO_STR_idx` ON `RXNCONSO`');
    await queryRunner.query('DROP INDEX `RXNCONSO_STR_idx2` ON `RXNCONSO`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE FULLTEXT INDEX `RXNCONSO_STR_idx` ON `RXNCONSO`(`STR`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNCONSO_STR_idx2` ON `RXNCONSO`(`STR`(100))',
    );
  }
}
