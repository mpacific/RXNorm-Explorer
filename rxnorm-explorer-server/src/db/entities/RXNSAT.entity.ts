import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RXNCONSO } from './RXNCONSO.entity';

// A read-only mapping of the RXNSAT table as the NLM load scripts create it,
// plus the id, indexes and keys from the migrations in ../migrations. Lengths
// and index names match the real schema, but the schema itself is owned by
// those scripts and hand-written migrations: never run
// \`typeorm migration:generate\` or \`synchronize\` against these entities.
@Entity('RXNSAT')
export class RXNSAT {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;
  @Column({ length: 8, nullable: true })
  RXCUI: string;

  @Column({ length: 8, nullable: true })
  LUI: string;

  @Column({ length: 8, nullable: true })
  SUI: string;

  @Index('RXNSAT_RXAUI_idx')
  @Column({ length: 8, nullable: true })
  RXAUI: string;

  @Column({ length: 50, nullable: true })
  STYPE: string;

  @Column({ length: 50, nullable: true })
  CODE: string;

  @Column({ length: 11, nullable: true })
  ATUI: string;

  @Column({ length: 50, nullable: true })
  SATUI: string;

  // ATN and ATV have prefix indexes, on their first 100 characters, which
  // decorators can't express. synchronize: false tells TypeORM they exist
  // and to leave them alone.
  @Index('RXNSAT_ATN_idx', { synchronize: false })
  @Column({ length: 1000, nullable: false })
  ATN: string;

  @Column({ length: 20, nullable: false })
  SAB: string;

  @Index('RXNSAT_ATV_idx', { synchronize: false })
  @Column({ length: 4000, nullable: true })
  ATV: string;

  @Column({ length: 1, nullable: true })
  SUPPRESS: string;

  @Column({ length: 50, nullable: true })
  CVF: string;

  @ManyToOne(() => RXNCONSO, (rxnconso) => rxnconso.RXNSAT, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'RXAUI',
    referencedColumnName: 'RXAUI',
    foreignKeyConstraintName: 'RXNSAT_RXAUI_fkey',
  })
  RXNCONSO: RXNCONSO;
}
