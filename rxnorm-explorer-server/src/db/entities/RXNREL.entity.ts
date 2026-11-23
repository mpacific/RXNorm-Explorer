import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// A read-only mapping of the RXNREL table as the NLM load scripts create it,
// plus the id, indexes and keys from the migrations in ../migrations. Lengths
// and index names match the real schema, but the schema itself is owned by
// those scripts and hand-written migrations: never run
// \`typeorm migration:generate\` or \`synchronize\` against these entities.
@Entity('RXNREL')
export class RXNREL {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;
  @Index('RXNREL_RXCUI1_idx')
  @Column({ length: 8, nullable: true })
  RXCUI1: string;

  @Column({ length: 8, nullable: true })
  RXAUI1: string;

  @Column({ length: 50, nullable: true })
  STYPE1: string;

  @Column({ length: 4, nullable: true })
  REL: string;

  @Index('RXNREL_RXCUI2_idx')
  @Column({ length: 8, nullable: true })
  RXCUI2: string;

  @Column({ length: 8, nullable: true })
  RXAUI2: string;

  @Column({ length: 50, nullable: true })
  STYPE2: string;

  @Column({ length: 100, nullable: true })
  RELA: string;

  @Column({ length: 10, nullable: true })
  RUI: string;

  @Column({ length: 50, nullable: true })
  SRUI: string;

  @Column({ length: 20, nullable: false })
  SAB: string;

  @Column({ length: 1000, nullable: true })
  SL: string;

  @Column({ length: 1, nullable: true })
  DIR: string;

  @Column({ length: 10, nullable: true })
  RG: string;

  @Column({ length: 1, nullable: true })
  SUPPRESS: string;

  @Column({ length: 50, nullable: true })
  CVF: string;
}
