import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RXNCONSO {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  @Index()
  RXCUI: string;

  @Column({ nullable: false })
  LAT: string;

  @Column({ nullable: true })
  TS: string;

  @Column({ nullable: true })
  LUI: string;

  @Column({ nullable: true })
  STT: string;

  @Column({ nullable: true })
  SUI: string;

  @Column({ nullable: true })
  ISPREF: string;

  @Column({ nullable: false, unique: true })
  RXAUI: string;

  @Column({ nullable: true })
  SAUI: string;

  @Column({ nullable: true })
  SCUI: string;

  @Column({ nullable: true })
  SDUI: string;

  @Column({ nullable: false })
  SAB: string;

  @Column({ nullable: false })
  @Index()
  TTY: string;

  @Column({ nullable: false })
  CODE: string;

  @Column({ nullable: false })
  @Index()
  STR: string;

  @Column({ nullable: true })
  SRL: string;

  @Column({ nullable: true })
  SUPPRESS: string;

  @Column({ nullable: true })
  CVF: string;
}
