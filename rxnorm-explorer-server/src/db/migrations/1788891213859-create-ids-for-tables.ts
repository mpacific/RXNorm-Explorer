import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdsForTables1788891213859 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `RXNCONSO` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
    );
    await queryRunner.query(
      'ALTER TABLE `RXNREL` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
    );
    await queryRunner.query(
      'ALTER TABLE `RXNSAT` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `RXNCONSO` DROP `id`');
    await queryRunner.query('ALTER TABLE `RXNREL` DROP `id`');
    await queryRunner.query('ALTER TABLE `RXNSAT` DROP `id`');
  }
}
