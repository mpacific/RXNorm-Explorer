import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RXNSAT } from './RXNSAT.entity';

// A read-only mapping of the RXNCONSO table as the NLM load scripts create it,
// plus the id, indexes and keys from the migrations in ../migrations. Lengths
// and index names match the real schema, but the schema itself is owned by
// those scripts and hand-written migrations: never run
// \`typeorm migration:generate\` or \`synchronize\` against these entities.
@Entity('RXNCONSO')
@Index('RXNCONSO_RXAUI_key', ['RXAUI'], { unique: true })
export class RXNCONSO {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;
  @Index('RXNCONSO_RXCUI_idx')
  @Column({ length: 8, nullable: false })
  RXCUI: string;

  @Column({ length: 3, nullable: false, default: 'ENG' })
  LAT: string;

  @Column({ length: 1, nullable: true })
  TS: string;

  @Column({ length: 8, nullable: true })
  LUI: string;

  @Column({ length: 3, nullable: true })
  STT: string;

  @Column({ length: 8, nullable: true })
  SUI: string;

  @Column({ length: 1, nullable: true })
  ISPREF: string;

  @Column({ length: 8, nullable: false })
  RXAUI: string;

  @Column({ length: 50, nullable: true })
  SAUI: string;

  @Column({ length: 50, nullable: true })
  SCUI: string;

  @Column({ length: 50, nullable: true })
  SDUI: string;

  @Column({ length: 20, nullable: false })
  SAB: string;

  @Index('RXNCONSO_TTY_idx')
  @Column({ length: 20, nullable: false })
  TTY: string;

  @Column({ length: 50, nullable: false })
  CODE: string;

  @Column({ length: 3000, nullable: false })
  STR: string;

  @Column({ length: 10, nullable: true })
  SRL: string;

  @Column({ length: 1, nullable: true })
  SUPPRESS: string;

  @Column({ length: 50, nullable: true })
  CVF: string;

  @OneToMany(() => RXNSAT, (rxnsat) => rxnsat.RXNCONSO)
  RXNSAT: RXNSAT[];
}
