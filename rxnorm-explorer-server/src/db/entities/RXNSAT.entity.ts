import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RXNCONSO } from './RXNCONSO.entity';

@Entity()
export class RXNSAT {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  RXCUI: string;

  @Column({ nullable: true })
  LUI: string;

  @Column({ nullable: true })
  SUI: string;

  @Column({ nullable: true })
  @Index()
  RXAUI: string;

  @Column({ nullable: true })
  STYPE: string;

  @Column({ nullable: true })
  CODE: string;

  @Column({ nullable: true })
  ATUI: string;

  @Column({ nullable: true })
  SATUI: string;

  @Column({ nullable: false })
  @Index()
  ATN: string;

  @Column({ nullable: false })
  SAB: string;

  @Column({ nullable: true })
  @Index()
  ATV: string;

  @Column({ nullable: true })
  SUPPRESS: string;

  @Column({ nullable: true })
  CVF: string;

  @ManyToOne(() => RXNCONSO, (rxnconso) => rxnconso.RXNSAT)
  @JoinColumn({ name: 'RXAUI', referencedColumnName: 'RXAUI' })
  RXNCONSO: RXNCONSO;
}
