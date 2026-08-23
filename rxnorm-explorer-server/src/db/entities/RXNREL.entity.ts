import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RXNREL {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Index()
  RXCUI1: string;

  @Column({ nullable: true })
  RXAUI1: string;

  @Column({ nullable: true })
  STYPE1: string;

  @Column({ nullable: true })
  REL: string;

  @Column({ nullable: true })
  @Index()
  RXCUI2: string;

  @Column({ nullable: true })
  RXAUI2: string;

  @Column({ nullable: true })
  STYPE2: string;

  @Column({ nullable: true })
  RELA: string;

  @Column({ nullable: true })
  RUI: string;

  @Column({ nullable: true })
  SRUI: string;

  @Column({ nullable: false })
  SAB: string;

  @Column({ nullable: true })
  SL: string;

  @Column({ nullable: true })
  DIR: string;

  @Column({ nullable: true })
  RG: string;

  @Column({ nullable: true })
  SUPPRESS: string;

  @Column({ nullable: true })
  CVF: string;
}
