import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationsToTables1790698212730 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');
    await queryRunner.query(
      'ALTER TABLE `RXNSAT` ADD CONSTRAINT `RXNSAT_RXAUI_fkey` FOREIGN KEY (`RXAUI`) REFERENCES `RXNCONSO`(`RXAUI`) ON DELETE SET NULL ON UPDATE CASCADE',
    );
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0');
    await queryRunner.query(
      'ALTER TABLE `RXNSAT` DROP FOREIGN KEY `RXNREL_RXAUI_fkey`',
    );
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1');
  }
}
