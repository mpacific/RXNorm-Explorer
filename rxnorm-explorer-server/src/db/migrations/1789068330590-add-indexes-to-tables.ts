import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesToTables1789068330590 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `RXNCONSO_RXCUI_idx` ON `RXNCONSO`(`RXCUI`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNCONSO_TTY_idx` ON `RXNCONSO`(`TTY`)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `RXNCONSO_RXAUI_key` ON `RXNCONSO`(`RXAUI`)',
    );
    await queryRunner.query(
      'CREATE FULLTEXT INDEX `RXNCONSO_STR_idx` ON `RXNCONSO`(`STR`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNCONSO_STR_idx2` ON `RXNCONSO`(`STR`(100))',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNREL_RXCUI1_idx` ON `RXNREL`(`RXCUI1`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNREL_RXCUI2_idx` ON `RXNREL`(`RXCUI2`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNSAT_RXAUI_idx` ON `RXNSAT`(`RXAUI`)',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNSAT_ATN_idx` ON `RXNSAT`(`ATN`(100))',
    );
    await queryRunner.query(
      'CREATE INDEX `RXNSAT_ATV_idx` ON `RXNSAT`(`ATV`(100))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX RXNCONSO_RXCUI_idx`);
    await queryRunner.query(`DROP INDEX RXNCONSO_TTY_idx`);
    await queryRunner.query(`DROP INDEX RXNCONSO_RXAUI_key`);
    await queryRunner.query(`DROP INDEX RXNCONSO_STR_idx`);
    await queryRunner.query(`DROP INDEX RXNCONSO_STR_idx2`);
    await queryRunner.query(`DROP INDEX RXNREL_RXCUI1_idx`);
    await queryRunner.query(`DROP INDEX RXNREL_RXCUI2_idx`);
    await queryRunner.query(`DROP INDEX RXNSAT_RXAUI_idx`);
    await queryRunner.query(`DROP INDEX RXNSAT_ATN_idx`);
    await queryRunner.query(`DROP INDEX RXNSAT_ATV_idx`);
  }
}
