/*
  Warnings:

  - A unique constraint covering the columns `[RXAUI]` on the table `RXNCONSO` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX `RXNCONSO_RXCUI_idx` ON `RXNCONSO`(`RXCUI`);

-- CreateIndex
CREATE INDEX `RXNCONSO_TTY_idx` ON `RXNCONSO`(`TTY`);

-- CreateIndex
CREATE UNIQUE INDEX `RXNCONSO_RXAUI_key` ON `RXNCONSO`(`RXAUI`);

-- CreateIndex
CREATE FULLTEXT INDEX `RXNCONSO_STR_idx` ON `RXNCONSO`(`STR`);

-- CreateIndex
CREATE INDEX `RXNREL_RXAUI1_idx` ON `RXNREL`(`RXAUI1`);

-- CreateIndex
CREATE INDEX `RXNREL_RXAUI2_idx` ON `RXNREL`(`RXAUI2`);

-- CreateIndex
CREATE INDEX `RXNSAT_RXAUI_idx` ON `RXNSAT`(`RXAUI`);
